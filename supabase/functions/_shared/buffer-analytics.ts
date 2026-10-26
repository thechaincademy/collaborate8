// Server-only Buffer reporting. No credentials or raw API bodies leave this module.
export const SERVICES = ["instagram", "linkedin", "tiktok"] as const;
type Service = typeof SERVICES[number];
type Metric = { type: string; value: number | string; unit?: string };
type Metrics = { posts: number | null; reach: number | null; impressions: number | null; reactions: number | null; comments: number | null; shares: number | null; engagement_rate: number | null };
type Post = { text: string; sent_at: string; link: string | null; impressions: number | null; reach: number | null; engagements: number | null };
export type SocialChannel = { connected: boolean; disconnected: boolean; name: string | null; error?: string; last7: Metrics; last30: Metrics; daily: { date: string; impressions: number | null; reach: number | null; engagements: number | null }[]; top_posts: Post[]; followers: null; followers_available: false };
export type Social = { buffer_ok: boolean; error?: string; organization_name: string | null; fetched_at: string; channels: Record<Service, SocialChannel> };
type Result = { social: Social; services: string[]; http_status: number | null };
const DAY = 86400000;
const emptyMetrics = (): Metrics => ({ posts: null, reach: null, impressions: null, reactions: null, comments: null, shares: null, engagement_rate: null });
const emptyChannel = (): SocialChannel => ({ connected: false, disconnected: false, name: null, last7: emptyMetrics(), last30: emptyMetrics(), daily: [], top_posts: [], followers: null, followers_available: false });
const emptySocial = (): Social => ({ buffer_ok: false, organization_name: null, fetched_at: new Date().toISOString(), channels: { instagram: emptyChannel(), linkedin: emptyChannel(), tiktok: emptyChannel() } });
let cache: { at: number; result: Result } | null = null;
// API errors may echo request credentials. Always redact them before returning a message.
export function safeSourceError(value: unknown, credentials: string[] = []): string {
  let text = typeof value === "string" ? value : "Source request failed";
  for (const secret of credentials.filter(Boolean)) {
    text = text.split(secret).join("[redacted]").split(encodeURIComponent(secret)).join("[redacted]");
  }
  return text.replace(/https?:\/\/[^\s"<>]+[?][^\s"<>]*/gi, "[request URL removed]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}
class BufferError extends Error {
  constructor(message: string, public status: number | null = null) { super(message); }
}
export function metricValue(metrics: Metric[] | undefined, type: string): number | null {
  const m = metrics?.find((m) => m.type === type);
  if (!m || m.value === null || m.value === "") return null;
  const n = Number(m.value);
  return Number.isFinite(n) ? n : null;
}
const sum = (values: (number | null)[]) => values.every((n) => n === null) ? null : values.reduce<number>((total, n) => total + (n ?? 0), 0);
export const engagements = (m: Metric[] | undefined) => sum(["reactions", "comments", "shares", "reposts", "saves"].map((t) => metricValue(m, t)));
export function aggregateMetrics(groups: Metric[][]): Metrics {
  const v = (type: string) => sum(groups.map((g) => metricValue(g, type)));
  const impressions = v("impressions"), engaged = sum(groups.map(engagements));
  const reportedRate = groups.length === 1 ? metricValue(groups[0], "engagementRate") : null;
  return { posts: v("postCount"), reach: v("reach"), impressions, reactions: v("reactions"), comments: v("comments"), shares: v("shares"), engagement_rate: reportedRate ?? (impressions !== null && impressions > 0 && engaged !== null ? engaged / impressions * 100 : null) };
}
export async function getBufferAnalytics(): Promise<Result> {
  if (cache && Date.now() - cache.at < 15 * 60 * 1000) return cache.result;
  const key = Deno.env.get("BUFFER_API_KEY");
  const social = emptySocial();
  if (!key) return { social: { ...social, error: "Buffer not connected" }, services: [], http_status: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let services: string[] = [];
  const gql = async (query: string) => {
    const response = await fetch("https://api.buffer.com", { method: "POST", signal: controller.signal, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
    if (response.status === 429) throw new BufferError(`Buffer rate limit reached. Retry-After: ${safeSourceError(response.headers.get("Retry-After") ?? "not provided", [key])}`, 429);
    const body = await response.json();
    if (body.errors?.length) throw new BufferError(safeSourceError(body.errors[0].message, [key]), response.status);
    if (!response.ok) throw new BufferError(safeSourceError(body.message ?? body.error ?? `Buffer HTTP ${response.status}`, [key]), response.status);
    return body.data;
  };
  try {
    const account = await gql("query { account { organizations { id name } } }");
    const org = account?.account?.organizations?.[0];
    if (!org) throw new BufferError("No Buffer organization found", 200);
    social.organization_name = org.name;
    const channelsData = await gql(`query { channels(input: { organizationId: ${JSON.stringify(org.id)} }) { id name displayName service isDisconnected isLocked } }`);
    const allChannels: { id: string; name: string; displayName: string; service: string; isDisconnected: boolean; isLocked: boolean }[] = channelsData?.channels ?? [];
    services = [...new Set(allChannels.map((c) => c.service))];
    // Three aliases per channel, at most 30 aliases in a single metrics request.
    const selected = allChannels.filter((c) => SERVICES.includes(c.service as Service)).slice(0, 10);
    const now = new Date(), end = now.toISOString();
    const start7 = new Date(now.getTime() - 7 * DAY).toISOString();
    const start30 = new Date(now.getTime() - 30 * DAY).toISOString();
    const queryParts: string[] = [];
    selected.forEach((c, i) => {
      for (const [range, start] of [["last7", start7], ["last30", start30]]) {
        queryParts.push(`c${i}_${range}: aggregatedPostMetrics(input: { organizationId: ${JSON.stringify(org.id)}, channelIds: [${JSON.stringify(c.id)}], startDateTime: ${JSON.stringify(start)}, endDateTime: ${JSON.stringify(end)} }) { metrics { type value unit } metricsUpdatedAt }`);
      }
      queryParts.push(`c${i}_posts: posts(first: 50, input: { organizationId: ${JSON.stringify(org.id)}, filter: { status: [sent], channelIds: [${JSON.stringify(c.id)}], dueAt: { start: ${JSON.stringify(start30)} } }, sort: [{ field: dueAt, direction: desc }] }) { edges { node { id text sentAt dueAt externalLink metrics { type value unit } } } }`);
    });
    // Partial GraphQL data is usable; attach the first error only to affected channel cards.
    let payload: any = { data: {} };
    if (queryParts.length) {
      const response = await fetch("https://api.buffer.com", { method: "POST", signal: controller.signal, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: `query { ${queryParts.join("\n")} }` }) });
      if (response.status === 429) throw new BufferError(`Buffer rate limit reached. Retry-After: ${safeSourceError(response.headers.get("Retry-After") ?? "not provided", [key])}`, 429);
      payload = await response.json();
      if (!response.ok) throw new BufferError(safeSourceError(payload.errors?.[0]?.message ?? payload.message ?? `Buffer HTTP ${response.status}`, [key]), response.status);
      if (payload.errors?.length) social.error = safeSourceError(payload.errors[0].message, [key]);
    }
    for (const service of SERVICES) {
      const indices = selected.flatMap((c, i) => c.service === service ? [i] : []);
      if (!indices.length) continue;
      const channel = social.channels[service];
      channel.connected = true;
      channel.disconnected = indices.some((i) => selected[i].isDisconnected);
      channel.name = indices.map((i) => selected[i].displayName || selected[i].name).join(", ");
      const errors = (payload.errors ?? []).filter((e: any) => !e.path?.length || indices.some((i) => String(e.path[0]).startsWith(`c${i}_`)));
      if (errors.length) channel.error = safeSourceError(errors[0].message, [key]);
      if (indices.some((i) => selected[i].isLocked)) channel.error = channel.error ?? "This channel is locked in Buffer";
      channel.last7 = aggregateMetrics(indices.map((i) => payload.data?.[`c${i}_last7`]?.metrics ?? []));
      channel.last30 = aggregateMetrics(indices.map((i) => payload.data?.[`c${i}_last30`]?.metrics ?? []));
      const posts = new Map<string, any>();
      for (const i of indices) for (const edge of payload.data?.[`c${i}_posts`]?.edges ?? []) posts.set(edge.node.id, edge.node);
      const daily = new Map<string, { date: string; impressions: number | null; reach: number | null; engagements: number | null }>();
      for (let i = 29; i >= 0; i--) { const date = new Date(now.getTime() - i * DAY).toISOString().slice(0, 10); daily.set(date, { date, impressions: null, reach: null, engagements: null }); }
      const top: Post[] = [];
      for (const p of posts.values()) {
        const sent = p.sentAt || p.dueAt;
        if (!sent || new Date(sent).getTime() < new Date(start30).getTime() || new Date(sent).getTime() > now.getTime()) continue;
        const impressions = metricValue(p.metrics, "impressions"), reach = metricValue(p.metrics, "reach"), engaged = engagements(p.metrics);
        const day = daily.get(sent.slice(0, 10));
        if (day) { day.impressions = sum([day.impressions, impressions]); day.reach = sum([day.reach, reach]); day.engagements = sum([day.engagements, engaged]); }
        let link: string | null = null;
        try { const url = new URL(p.externalLink); if (["https:", "http:"].includes(url.protocol)) link = url.href; } catch { /* no public link */ }
        top.push({ text: String(p.text ?? "").slice(0, 80), sent_at: sent, link, impressions, reach, engagements: engaged });
      }
      channel.daily = [...daily.values()];
      channel.top_posts = top.sort((a, b) => (b.engagements ?? -1) - (a.engagements ?? -1)).slice(0, 3);
    }
    if (allChannels.filter((c) => SERVICES.includes(c.service as Service)).length > 10) social.error = "Showing the first 10 social channels due to Buffer's query limit";
    social.buffer_ok = !payload.errors?.length;
    social.fetched_at = new Date().toISOString();
    const result = { social, services, http_status: 200 };
    cache = { at: Date.now(), result };
    return result;
  } catch (e) {
    if (e instanceof BufferError && e.status === 429 && cache) return cache.result;
    social.error = controller.signal.aborted ? "Buffer request timed out after 10 seconds" : safeSourceError(e instanceof Error ? e.message : "Buffer request failed", [key]);
    for (const channel of Object.values(social.channels)) channel.error = social.error;
    return { social, services, http_status: e instanceof BufferError ? e.status : null };
  } finally { clearTimeout(timeout); }
}
