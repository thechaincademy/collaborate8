import { handlePodcastEpisodes } from "./podcast-feed.js";

const ROBOTS = "User-agent: *\nDisallow: /\n";

function withNoIndex(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return new Response(ROBOTS, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex",
        },
      });
    }

    if (url.pathname === "/api/podcast-episodes" && request.method === "GET") {
      return handlePodcastEpisodes(request, ctx);
    }

    if (url.pathname === "/sitemap.xml") {
      return new Response("Not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex",
        },
      });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      const rewritten = new HTMLRewriter()
        .on("head", {
          element(element) {
            element.prepend('<meta name="robots" content="noindex, nofollow">', {
              html: true,
            });
          },
        })
        .transform(assetResponse);
      return withNoIndex(rewritten);
    }

    return withNoIndex(assetResponse);
  },
};
