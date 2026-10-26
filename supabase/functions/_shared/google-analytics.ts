// Google (GA4, Search Console, Business Profile) aggregates for admin-analytics.
// Never returns or logs tokens.
import { googleClient } from "./google-oauth.ts";

const GA4_PROPERTY = "560493842";
const SC_SITE = "sc-domain%3Acollaborate8.com";
const PLACE_ID = "ChIJVQ9vVFS0mqcRZsBsOjnVtEs";
const TTL = 15 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

let cache: { at: number; key: string; value: unknown } | null = null;

class GErr extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

async function gfetch(url: string, token: string, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!res.ok) {
      const m = body?.error?.message ?? (typeof body === "string" ? body.slice(0, 300) : res.statusText);
      const st = body?.error?.status ? ` ${body.error.status}` : "";
      throw new GErr(res.status, `${m} (HTTP ${res.status}${st})`);
    }
    return body;
  } catch (e) {
    if (e instanceof GErr) throw e;
    if ((e as Error).name === "AbortError") throw new GErr(0, "Request timed out after 10s");
    throw new GErr(0, (e as Error).message);
  } finally {
    clearTimeout(t);
  }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const fmtGaDate = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

async function ga4(token: string) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`;
  const run = (body: unknown) => gfetch(url, token, { method: "POST", body: JSON.stringify(body) });
  const base = ["totalUsers", "newUsers", "sessions", "engagementRate"];
  const totals = async (days: number) => {
    const range = [{ startDate: `${days}daysAgo`, endDate: "today" }];
    for (const conv of ["keyEvents", "conversions", null]) {
      try {
        const r = await run({ dateRanges: range, metrics: [...base, ...(conv ? [conv] : [])].map((name) => ({ name })) });
        const v = r.rows?.[0]?.metricValues ?? [];
        return {
          total_users: num(v[0]?.value) ?? 0, new_users: num(v[1]?.value) ?? 0, sessions: num(v[2]?.value) ?? 0,
          engagement_rate: num(v[3]?.value), conversions: conv ? num(v[4]?.value) : null,
        };
      } catch (e) {
        if (conv && e instanceof GErr && e.status === 400) continue;
        throw e;
      }
    }
  };
  const range30 = [{ startDate: "30daysAgo", endDate: "today" }];
  const top = async (dim: string, metric: string) => {
    const r = await run({ dateRanges: range30, dimensions: [{ name: dim }], metrics: [{ name: metric }], orderBys: [{ metric: { metricName: metric }, desc: true }], limit: 5 });
    return (r.rows ?? []).map((x: any) => ({ value: x.dimensionValues[0].value, count: Number(x.metricValues[0].value) }));
  };
  const [t7, t30, daily, channels, sources, pages] = await Promise.all([
    totals(7), totals(30),
    run({ dateRanges: range30, dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }] }),
    top("sessionDefaultChannelGroup", "sessions"), top("sessionSource", "sessions"), top("pagePath", "screenPageViews"),
  ]);
  return {
    ok: true,
    last_7d: t7, last_30d: t30,
    daily: (daily.rows ?? []).map((x: any) => ({ date: fmtGaDate(x.dimensionValues[0].value), active_users: Number(x.metricValues[0].value), sessions: Number(x.metricValues[1].value) })),
    top_channels: channels, top_sources: sources, top_pages: pages,
  };
}

async function searchConsole(token: string) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${SC_SITE}/searchAnalytics/query`;
  const end = new Date(Date.now() - 2 * DAY), start = new Date(end.getTime() - 27 * DAY);
  const q = (extra: Record<string, unknown>) => gfetch(url, token, { method: "POST", body: JSON.stringify({ startDate: ymd(start), endDate: ymd(end), ...extra }) });
  const [tot, daily, queries, pages] = await Promise.all([
    q({}), q({ dimensions: ["date"] }), q({ dimensions: ["query"], rowLimit: 10 }), q({ dimensions: ["page"], rowLimit: 10 }),
  ]);
  const t = tot.rows?.[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: null };
  const row = (r: any) => ({ value: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
  return {
    ok: true, start_date: ymd(start), end_date: ymd(end),
    totals: { clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position },
    daily: (daily.rows ?? []).map((r: any) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
    top_queries: (queries.rows ?? []).map(row), top_pages: (pages.rows ?? []).map(row),
  };
}

const isApproval = (e: GErr) =>
  e.status === 403 || (e.status === 429 && /quota/i.test(e.message) && /\b0\b/.test(e.message)) ||
  /has not been used|not enabled|PERMISSION_DENIED/i.test(e.message);

const BP_METRICS = ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH", "WEBSITE_CLICKS", "CALL_CLICKS", "BUSINESS_DIRECTION_REQUESTS"];

async function businessProfile(token: string) {
  try {
    const accts = await gfetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", token);
    let location: string | null = null, title: string | null = null;
    for (const a of accts.accounts ?? []) {
      let pageToken = "";
      do {
        const r = await gfetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title,metadata&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`, token);
        const hit = (r.locations ?? []).find((l: any) => l.metadata?.placeId === PLACE_ID);
        if (hit) { location = hit.name; title = hit.title ?? null; break; }
        pageToken = r.nextPageToken ?? "";
      } while (pageToken);
      if (location) break;
    }
    if (!location) return { ok: false, error: "Location with that Place ID not found in this Google account" };
    const end = new Date(), start = new Date(Date.now() - 29 * DAY);
    const p = new URLSearchParams();
    for (const m of BP_METRICS) p.append("dailyMetrics", m);
    p.set("dailyRange.startDate.year", String(start.getUTCFullYear())); p.set("dailyRange.startDate.month", String(start.getUTCMonth() + 1)); p.set("dailyRange.startDate.day", String(start.getUTCDate()));
    p.set("dailyRange.endDate.year", String(end.getUTCFullYear())); p.set("dailyRange.endDate.month", String(end.getUTCMonth() + 1)); p.set("dailyRange.endDate.day", String(end.getUTCDate()));
    const r = await gfetch(`https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries?${p}`, token);
    const totals: Record<string, number> = {};
    const daily = new Map<string, number>();
    for (const outer of r.multiDailyMetricTimeSeries ?? []) {
      for (const s of outer.dailyMetricTimeSeries ?? []) {
        const metric = s.dailyMetric as string;
        for (const dv of s.timeSeries?.datedValues ?? []) {
          const v = Number(dv.value ?? 0);
          totals[metric] = (totals[metric] ?? 0) + v;
          if (metric.startsWith("BUSINESS_IMPRESSIONS")) {
            const d = `${dv.date.year}-${String(dv.date.month).padStart(2, "0")}-${String(dv.date.day).padStart(2, "0")}`;
            daily.set(d, (daily.get(d) ?? 0) + v);
          }
        }
      }
    }
    const impressions = BP_METRICS.filter((m) => m.startsWith("BUSINESS_IMPRESSIONS")).reduce((s, m) => s + (totals[m] ?? 0), 0);
    return {
      ok: true, title,
      totals_30d: { impressions, website_clicks: totals.WEBSITE_CLICKS ?? 0, calls: totals.CALL_CLICKS ?? 0, direction_requests: totals.BUSINESS_DIRECTION_REQUESTS ?? 0 },
      daily_impressions: [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, impressions]) => ({ date, impressions })),
    };
  } catch (e) {
    if (e instanceof GErr && isApproval(e)) return { ok: false, waiting_approval: true, error: e.message };
    throw e;
  }
}

const safe = async (fn: () => Promise<unknown>) => {
  try { return await fn(); } catch (e) { return { ok: false, error: (e as Error).message }; }
};

// deno-lint-ignore no-explicit-any
export async function getGoogleAnalytics(admin: any) {
  const { data: row } = await admin.from("google_oauth_tokens").select("refresh_token, scopes, account_email, updated_at").eq("provider", "google").maybeSingle();
  if (!row) return { connected: false, account_email: null, scopes: null, ga4: null, search_console: null, business_profile: null };
  const key = String(row.updated_at);
  if (cache && cache.key === key && Date.now() - cache.at < TTL) return cache.value;

  const base = { connected: true, account_email: row.account_email, scopes: row.scopes };
  const client = googleClient();
  if (!client) return { ...base, error: "Google OAuth client not configured", ga4: null, search_console: null, business_profile: null };

  let token: string;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: client.id, client_secret: client.secret, refresh_token: row.refresh_token, grant_type: "refresh_token" }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = body.error === "invalid_grant" ? "Google connection expired, please reconnect" : `Token refresh failed: ${body.error_description ?? body.error ?? res.statusText} (HTTP ${res.status})`;
      return { ...base, error, ga4: null, search_console: null, business_profile: null };
    }
    token = body.access_token;
  } catch (e) {
    return { ...base, error: `Token refresh failed: ${(e as Error).message}`, ga4: null, search_console: null, business_profile: null };
  }

  const [g, sc, bp] = await Promise.all([safe(() => ga4(token)), safe(() => searchConsole(token)), safe(() => businessProfile(token))]);
  const value = { ...base, ga4: g, search_console: sc, business_profile: bp };
  cache = { at: Date.now(), key, value };
  return value;
}
