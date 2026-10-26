// Server-only YouTube channel stats. The API key never leaves this module.
import { safeSourceError } from "./buffer-analytics.ts";

const HANDLE = "@collabor8official";
const TTL = 15 * 60 * 1000;
export type YouTube = {
  ok: boolean; error?: string; channel_id: string | null; title: string | null; handle: string;
  subscribers: number | null; total_views: number | null; video_count: number | null;
  recent_videos: { title: string; published_at: string; url: string; views: number | null; likes: number | null; comments: number | null }[];
  fetched_at: string;
};
let cache: { at: number; value: YouTube } | null = null;
const num = (v: unknown) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export async function getYouTubeAnalytics(): Promise<YouTube> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  const base: YouTube = { ok: false, channel_id: null, title: null, handle: HANDLE, subscribers: null, total_views: null, video_count: null, recent_videos: [], fetched_at: new Date().toISOString() };
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) return { ...base, error: "YouTube not configured" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const get = async (path: string, params: Record<string, string>) => {
    const qs = new URLSearchParams({ ...params, key });
    const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`, { signal: controller.signal });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.error?.message ?? `YouTube HTTP ${r.status}`);
    return body;
  };
  try {
    const ch = await get("channels", { part: "statistics,snippet,contentDetails", forHandle: HANDLE });
    const c = ch.items?.[0];
    if (!c) return { ...base, error: `Handle ${HANDLE} not found on YouTube` };
    const s = c.statistics ?? {};
    const value: YouTube = {
      ...base, ok: true, channel_id: c.id, title: c.snippet?.title ?? null,
      subscribers: s.hiddenSubscriberCount ? null : num(s.subscriberCount),
      total_views: num(s.viewCount), video_count: num(s.videoCount),
    };
    const uploads = c.contentDetails?.relatedPlaylists?.uploads;
    if (uploads) {
      const pl = await get("playlistItems", { part: "contentDetails,snippet", playlistId: uploads, maxResults: "5" });
      const items = (pl.items ?? []) as any[];
      const ids = items.map((i) => i.contentDetails?.videoId).filter(Boolean);
      const stats: Record<string, any> = {};
      if (ids.length) {
        const v = await get("videos", { part: "statistics", id: ids.join(",") });
        for (const it of v.items ?? []) stats[it.id] = it.statistics ?? {};
      }
      value.recent_videos = items.filter((i) => i.contentDetails?.videoId).map((i) => {
        const id = i.contentDetails.videoId; const st = stats[id] ?? {};
        return { title: i.snippet?.title ?? "", published_at: i.contentDetails?.videoPublishedAt ?? i.snippet?.publishedAt ?? "", url: `https://www.youtube.com/watch?v=${id}`, views: num(st.viewCount), likes: num(st.likeCount), comments: num(st.commentCount) };
      });
    }
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    const msg = controller.signal.aborted ? "YouTube request timed out after 10 seconds" : safeSourceError(e instanceof Error ? e.message : "YouTube request failed", [key]);
    return { ...base, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
