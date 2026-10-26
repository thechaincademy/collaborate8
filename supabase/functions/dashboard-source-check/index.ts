import { corsHeaders } from "../_shared/cors.ts";
import { getBufferAnalytics, safeSourceError } from "../_shared/buffer-analytics.ts";

type Check = { source: string; status: "pass" | "fail" | "not_configured"; http_status: number | null; error: string | null; sample: unknown };
const missing = (source: string, error = "Credentials not configured"): Check => ({ source, status: "not_configured", http_status: null, error, sample: null });
const credentialNames = ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_SERVICE_ACCOUNT", "GA_SERVICE_ACCOUNT_JSON", "GA4_SERVICE_ACCOUNT_JSON", "GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON", "CLARITY_API_TOKEN", "YOUTUBE_API_KEY", "BUFFER_API_KEY"];
const redact = (text: unknown) => safeSourceError(text, credentialNames.map((n) => Deno.env.get(n) ?? ""));
async function request(url: string, options: RequestInit = {}) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  const raw = await r.text();
  let body: any; try { body = JSON.parse(raw); } catch { body = null; }
  if (!r.ok) throw { status: r.status, message: redact(body?.error?.message ?? body?.error_description ?? (typeof body?.error === "string" ? body.error : raw)) };
  return { status: r.status, body };
}
const base64 = (data: Uint8Array) => btoa(String.fromCharCode(...data)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
async function googleToken(scope: string): Promise<string | null> {
  const client = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"), secret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET"), refresh = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  let params: URLSearchParams;
  if (client && secret && refresh) params = new URLSearchParams({ client_id: client, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" });
  else {
    const raw = ["GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_SERVICE_ACCOUNT", "GA_SERVICE_ACCOUNT_JSON", "GA4_SERVICE_ACCOUNT_JSON", "GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON"].map((n) => Deno.env.get(n)).find(Boolean);
    if (!raw) return null;
    let sa: any; try { sa = JSON.parse(raw); } catch { throw { message: "Google service account JSON is invalid" }; }
    if (!sa.client_email || !sa.private_key) throw { message: "Google service account configuration is incomplete" };
    const encode = (v: unknown) => base64(new TextEncoder().encode(JSON.stringify(v)));
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
    const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
    const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
    params = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64(signature)}` });
  }
  const { body } = await request("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  if (!body?.access_token) throw { message: "Google access token was not returned" };
  return body.access_token;
}
async function check(source: string, run: () => Promise<Check>): Promise<Check> {
  try { return await run(); } catch (e) {
    const err = e as { status?: number; message?: string };
    return { source, status: "fail", http_status: err.status ?? null, error: redact(err.message ?? "Source request failed"), sample: null };
  }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const results = await Promise.all([
    check("Buffer", async () => {
      const r = await getBufferAnalytics();
      const channels = Object.fromEntries(Object.entries(r.social.channels).map(([service, c]) => [service, { name: c.name, connected: c.connected, disconnected: c.disconnected, ...(c.error ? { error: c.error } : {}), last7: c.last7, last30: c.last30 }]));
      return { source: "Buffer", status: r.social.buffer_ok ? "pass" : Deno.env.get("BUFFER_API_KEY") ? "fail" : "not_configured", http_status: r.http_status, error: r.social.error ?? null, sample: { organization_name: r.social.organization_name, services: r.services, channels } };
    }),
    check("GA4", async () => {
      const token = await googleToken("https://www.googleapis.com/auth/analytics.readonly");
      if (!token) return missing("GA4");
      const r = await request("https://analyticsdata.googleapis.com/v1beta/properties/560493842:runReport", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ dateRanges: [{ startDate: "7daysAgo", endDate: "today" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }] }) });
      return { source: "GA4", status: "pass", http_status: r.status, error: null, sample: { activeUsers: Number(r.body.rows?.[0]?.metricValues?.[0]?.value ?? 0), sessions: Number(r.body.rows?.[0]?.metricValues?.[1]?.value ?? 0) } };
    }),
    check("Search Console", async () => {
      const token = await googleToken("https://www.googleapis.com/auth/webmasters.readonly");
      if (!token) return missing("Search Console");
      const today = new Date(), start = new Date(today.getTime() - 28 * 86400000);
      const r = await request("https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Acollaborate8.com/searchAnalytics/query", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ startDate: start.toISOString().slice(0, 10), endDate: today.toISOString().slice(0, 10), rowLimit: 1 }) });
      return { source: "Search Console", status: "pass", http_status: r.status, error: null, sample: { clicks: r.body.rows?.[0]?.clicks ?? 0, impressions: r.body.rows?.[0]?.impressions ?? 0 } };
    }),
    check("Clarity", async () => {
      const token = Deno.env.get("CLARITY_API_TOKEN");
      if (!token) return missing("Clarity");
      const r = await request("https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1", { headers: { Authorization: `Bearer ${token}` } });
      const metrics = Array.isArray(r.body) ? r.body : r.body?.data ?? [];
      // Only metric names and numeric aggregates, never URLs or session details.
      const sample = metrics.slice(0, 2).map((m: any) => ({ metric: m.metricName ?? m.name, values: (m.information ?? []).map((v: any) => Object.fromEntries(Object.entries(v).filter(([k, value]) => !/url|user|sessionid|email|name|id$/i.test(k) && (typeof value === "number" || (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)))))) }));
      return { source: "Clarity", status: "pass", http_status: r.status, error: null, sample };
    }),
    check("YouTube", async () => {
      const key = Deno.env.get("YOUTUBE_API_KEY");
      if (!key) return missing("YouTube");
      const r = await request(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=@collabor8group191&key=${encodeURIComponent(key)}`);
      const c = r.body.items?.[0];
      return { source: "YouTube", status: c ? "pass" : "fail", http_status: r.status, error: c ? null : "Channel not found", sample: c ? { title: c.snippet?.title, subscriberCount: c.statistics?.subscriberCount, viewCount: c.statistics?.viewCount, videoCount: c.statistics?.videoCount } : null };
    }),
    Promise.resolve(missing("Google Business Profile", "No API access")),
  ]);
  return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
});
