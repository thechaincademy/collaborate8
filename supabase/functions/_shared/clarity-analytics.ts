// Server-only Microsoft Clarity live insights. One API call per refresh, cached 3 hours (API allows 10 calls a day).
import { safeSourceError } from "./buffer-analytics.ts";

const TTL = 3 * 60 * 60 * 1000;
export type Clarity = {
  ok: boolean; error?: string; stale?: boolean; days: 3; fetched_at: string;
  sessions: number | null; pages_per_session: number | null; scroll_depth_pct: number | null;
  dead_click_pct: number | null; rage_click_pct: number | null; quickback_pct: number | null;
  excessive_scroll_pct: number | null; top_pages: { url: string; sessions: number }[];
};
let cache: { at: number; value: Clarity } | null = null;
const num = (v: unknown) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export function parseClarity(body: unknown): Omit<Clarity, "ok" | "days" | "fetched_at"> {
  const list = Array.isArray(body) ? body as { metricName?: string; information?: Record<string, unknown>[] }[] : [];
  const info = (name: string) => list.find((m) => m.metricName?.toLowerCase() === name.toLowerCase())?.information ?? [];
  const first = (name: string, field: string) => num(info(name)[0]?.[field]);
  const pct = (name: string) => first(name, "sessionsWithMetricPercentage");
  const pages = info("PopularPages").map((p) => ({ url: String(p.url ?? p.Url ?? ""), sessions: num(p.visitsCount ?? p.sessionsCount) ?? 0 }))
    .filter((p) => p.url).sort((a, b) => b.sessions - a.sessions).slice(0, 5);
  return {
    sessions: first("Traffic", "totalSessionCount"),
    pages_per_session: first("Traffic", "pagesPerSessionPercentage") ?? first("Traffic", "PagesPerSessionPercentage"),
    scroll_depth_pct: first("ScrollDepth", "averageScrollDepth"),
    dead_click_pct: pct("DeadClickCount"), rage_click_pct: pct("RageClickCount"),
    quickback_pct: pct("QuickbackClick"), excessive_scroll_pct: pct("ExcessiveScroll"),
    top_pages: pages,
  };
}

export async function getClarityAnalytics(): Promise<Clarity> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  const empty: Clarity = { ok: false, days: 3, fetched_at: new Date().toISOString(), sessions: null, pages_per_session: null, scroll_depth_pct: null, dead_click_pct: null, rage_click_pct: null, quickback_pct: null, excessive_scroll_pct: null, top_pages: [] };
  const token = Deno.env.get("CLARITY_API_TOKEN");
  if (!token) return { ...empty, error: "Clarity not configured" };
  const fallback = (error: string) => cache ? { ...cache.value, stale: true, error } : { ...empty, error };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch("https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3", { signal: controller.signal, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    if (r.status === 429) return fallback("Clarity daily limit reached, try again later");
    const body = await r.json().catch(() => null);
    if (!r.ok) return fallback(safeSourceError(`Clarity HTTP ${r.status}`, [token]));
    const value: Clarity = { ...empty, ok: true, ...parseClarity(body) };
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    return fallback(controller.signal.aborted ? "Clarity request timed out after 10 seconds" : safeSourceError(e instanceof Error ? e.message : "Clarity request failed", [token]));
  } finally {
    clearTimeout(timer);
  }
}
