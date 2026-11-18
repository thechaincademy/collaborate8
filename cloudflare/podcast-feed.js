// Collabor8 podcast episodes, read from the public YouTube RSS feed.
// No API key and no paid service. Used by the Cloudflare Worker in front of
// the site at GET /api/podcast-episodes. Cached at the edge for about an hour.

export const PODCAST_CHANNEL_ID = "UCKL89p53BCmKi_G9cSxj-xg"; // youtube.com/@collabor8official
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${PODCAST_CHANNEL_ID}`;
const CACHE_SECONDS = 3600;

// Only podcast episodes count: titles that carry an episode number,
// e.g. "... | Ep 1" or "Episode 2". Other channel uploads (Shorts, clips) are skipped.
const EPISODE_RE = /\b(?:ep|episode)\.?\s*#?(\d{1,3})\b/i;

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]).trim() : "";
}

function cleanTitle(title) {
  // "Topic | Guest, Firm | Ep 1" -> "Topic | Guest, Firm"
  return title
    .replace(/\s*[|:\-]\s*(?:ep|episode)\.?\s*#?\d{1,3}\s*$/i, "")
    .replace(/^\s*(?:ep|episode)\.?\s*#?\d{1,3}\s*[|:\-]\s*/i, "")
    .trim();
}

function summary(description) {
  const first = description.split(/\n\s*\n/)[0] || "";
  const text = first.replace(/\s+/g, " ").trim();
  return text.length > 320 ? `${text.slice(0, 317).replace(/\s+\S*$/, "")}...` : text;
}

export function parseEpisodes(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const episodes = [];
  for (const entry of entries) {
    const rawTitle = tag(entry, "title");
    const m = rawTitle.match(EPISODE_RE);
    const videoId = tag(entry, "yt:videoId");
    if (!m || !/^[\w-]{11}$/.test(videoId)) continue;
    episodes.push({
      number: Number(m[1]),
      title: cleanTitle(rawTitle) || rawTitle,
      description: summary(tag(entry, "media:description")),
      publishedAt: tag(entry, "published"),
      youtubeId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }
  episodes.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "") || b.number - a.number);
  return episodes;
}

function json(body, status, maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${maxAge}`,
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function handlePodcastEpisodes(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/podcast-episodes", request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(FEED_URL, {
      headers: { "user-agent": "Collabor8 podcast page" },
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const episodes = parseEpisodes(await res.text());
    const response = json({ channelId: PODCAST_CHANNEL_ID, fetchedAt: new Date().toISOString(), episodes }, 200, CACHE_SECONDS);
    const put = cache.put(cacheKey, response.clone());
    if (ctx && ctx.waitUntil) ctx.waitUntil(put);
    else await put;
    return response;
  } catch {
    // The page falls back to its built-in episode list.
    return json({ error: "feed_unavailable", episodes: [] }, 502, 60);
  }
}
