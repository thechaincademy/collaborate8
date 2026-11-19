import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// The auth email rules name Lovable hosts only to block them; the Deno tests assert their absence.
const ALLOWED = new Set(["supabase/functions/_shared/auth-email-rules.ts"]);
const isGuardTest = (p: string) => /\.denotest\.ts$/.test(p);

describe("no Lovable left in the product code", () => {
  it("no Lovable strings, hosts, packages or env vars in supabase/functions or src", () => {
    const hits: string[] = [];
    for (const base of ["supabase/functions", "src"]) {
      for (const abs of walk(join(root, base))) {
        const p = relative(root, abs);
        if (!/\.(ts|tsx|js|jsx|json|css|html)$/.test(p) || p.endsWith("deno.lock") || ALLOWED.has(p) || isGuardTest(p)) continue;
        if (/lovable/i.test(readFileSync(abs, "utf8"))) hits.push(p);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the edge function lockfile has no Lovable packages", () => {
    expect(read("supabase/functions/deno.lock")).not.toMatch(/@lovable\.dev\//);
  });

  it("package.json, vite config and npm lockfiles have no Lovable packages or registry", () => {
    const pkg = JSON.parse(read("package.json"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /lovable/i.test(d))).toEqual([]);
    expect(read("vite.config.ts")).not.toMatch(/lovable|mcpPlugin|componentTagger/i);
    expect(read("package-lock.json")).not.toMatch(/lovable/i);
    expect(read("bun.lock")).not.toMatch(/lovable/i);
  });

  it("the Lovable MCP function and its tool sources are gone", () => {
    expect(existsSync(join(root, "supabase/functions/mcp"))).toBe(false);
    expect(existsSync(join(root, "src/lib/mcp"))).toBe(false);
  });

  it("chat-rewrite-strike calls Vertex in London, like chat-rewrite", () => {
    const idx = read("supabase/functions/chat-rewrite-strike/index.ts");
    const call = read("supabase/functions/chat-rewrite-strike/vertex-call.ts");
    expect(idx).toContain('from "./vertex-call.ts"');
    expect(idx).toContain("vertexConfigured()");
    expect(idx).not.toMatch(/openai\/|gateway\.|LOVABLE_API_KEY|fetch\(\s*["']https/);
    expect(call).toContain('import { callVertex } from "../_shared/vertex.ts"');
    const vertex = read("supabase/functions/_shared/vertex.ts");
    expect(vertex).toContain('"europe-west2"');
    expect(vertex).toMatch(/\^europe-\[a-z\]\+\[0-9\]\+\$/);
    expect(vertex).not.toMatch(/locations\/global|https:\/\/aiplatform\.googleapis\.com/);
    expect(vertex).toContain("https://${LOCATION()}-aiplatform.googleapis.com/v1/projects/${PROJECT()}/locations/${LOCATION()}/");
  });

  it("stripe-connect logs without the old label", () => {
    expect(read("supabase/functions/stripe-connect/index.ts")).toContain("[STRIPE-CONNECT]");
  });
});
