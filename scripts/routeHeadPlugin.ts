import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

export interface RouteMeta {
  route: string;
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  ogImage?: string;
  twitterImage?: string;
}

const escapeAttribute = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export function replaceRouteHead(html: string, meta: RouteMeta): string {
  const required: (keyof RouteMeta)[] = [
    "route", "title", "description", "canonical", "ogTitle", "ogDescription",
    "ogUrl", "ogType", "twitterCard", "twitterTitle", "twitterDescription",
  ];
  for (const key of required) {
    if (typeof meta[key] !== "string" || !meta[key]?.trim()) {
      throw new Error(`Missing ${key} metadata for ${meta.route || "unknown route"}`);
    }
  }
  if (!/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*$/.test(meta.route)) {
    throw new Error(`Invalid public metadata route: ${meta.route}`);
  }
  if (!/<head\b[^>]*>[\s\S]*?<\/head>/i.test(html)) {
    throw new Error("Built index.html has no head element");
  }

  const tags = [
    `<title data-rh="true">${escapeAttribute(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttribute(meta.description)}" data-rh="true" />`,
    `<link rel="canonical" href="${escapeAttribute(meta.canonical)}" data-rh="true" />`,
    ...Object.entries({
      "og:title": meta.ogTitle,
      "og:description": meta.ogDescription,
      "og:url": meta.ogUrl,
      "og:type": meta.ogType,
      ...(meta.ogImage ? { "og:image": meta.ogImage } : {}),
    }).map(([property, value]) => `<meta property="${property}" content="${escapeAttribute(value)}" data-rh="true" />`),
    ...Object.entries({
      "twitter:card": meta.twitterCard,
      "twitter:title": meta.twitterTitle,
      "twitter:description": meta.twitterDescription,
      ...(meta.twitterImage ? { "twitter:image": meta.twitterImage } : {}),
    }).map(([name, value]) => `<meta name="${name}" content="${escapeAttribute(value)}" data-rh="true" />`),
  ].join("\n    ");

  return html.replace(/(<head\b[^>]*>)([\s\S]*?)(<\/head>)/i, (_match, open: string, head: string, close: string) => {
    // Keep script contents and comments byte-for-byte, even if they mention tags.
    const cleaned = head.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<!--[\s\S]*?-->|<title\b[^>]*>[\s\S]*?<\/title>|<(?:meta|link)\b[^>]*>/gi, (tag: string) => {
      if (/^<title\b/i.test(tag)) return "";
      if (!/^<(?:meta|link)\b/i.test(tag)) return tag;
      const attributes = new Map<string, string>();
      for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
        attributes.set(match[1].toLowerCase(), (match[2] ?? match[3] ?? match[4]).toLowerCase());
      }
      if (/^<link\b/i.test(tag)) {
        return attributes.get("rel")?.split(/\s+/).includes("canonical") ? "" : tag;
      }
      const identifiers = [attributes.get("name"), attributes.get("property")];
      return identifiers.some((value) => value === "description" || value?.startsWith("og:") || value?.startsWith("twitter:")) ? "" : tag;
    });
    return `${open}${cleaned}\n    ${tags}\n  ${close}`;
  });
}

export function routeHeadPlugin(routes: readonly RouteMeta[]): Plugin {
  let outDir = "";
  return {
    name: "collabor8-static-route-heads",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const template = await readFile(path.join(outDir, "index.html"), "utf8");
      const seen = new Set<string>();
      // Validate every entry before overwriting the root template.
      const pages = routes.map((meta) => {
        if (seen.has(meta.route)) throw new Error(`Duplicate public metadata route: ${meta.route}`);
        seen.add(meta.route);
        return { route: meta.route, html: replaceRouteHead(template, meta) };
      });
      if (!seen.has("/")) throw new Error("Missing homepage metadata");
      await Promise.all(pages.map(async ({ route, html }) => {
        const directory = path.join(outDir, route.slice(1));
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, "index.html"), html, "utf8");
      }));
      this.info(`Wrote ${pages.length} public route HTML files (head tags only).`);
    },
  };
}