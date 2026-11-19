import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTH_FROM_DEFAULT,
  hookError,
  hookSecretBytes,
  planAuthEmails,
  redirectTarget,
  siteOrigin,
  SUBJECTS,
  confirmUrl,
  LINK_ORIGINS,
  linkOrigin,
  nextPath,
  verifyHookSignature,
} from "../supabase/functions/_shared/auth-email-rules";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");
const SECRET_B64 = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
const SECRET = `v1,whsec_${SECRET_B64}`;

// Independent Standard Webhooks signer (node:crypto), so the check is not tested against itself.
const sign = (id: string, ts: string, body: string, b64 = SECRET_B64) =>
  "v1," + createHmac("sha256", Buffer.from(b64, "base64")).update(`${id}.${ts}.${body}`).digest("base64");
const hdrs = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

const payload = (email_data: Record<string, unknown>, user: Record<string, unknown> = {}) => ({
  user: { id: "u1", email: "parent@example.com", ...user },
  email_data: { token: "123456", token_hash: "hash-abc", redirect_to: "", site_url: "https://collaborate8.com", token_new: "", token_hash_new: "", ...email_data },
});

const copyProblems = (text: string) => {
  const out: string[] = [];
  if (text.includes("\u2014")) out.push("em dash");
  if (/\bpolice\b|\bvictims?\b/i.test(text)) out.push("police/victim");
  if (/lovable/i.test(text)) out.push("lovable");
  if (/Collaborate8\b/.test(text)) out.push("Collaborate8 spelling");
  return out;
};

describe("hook signature (Standard Webhooks)", () => {
  const body = JSON.stringify(payload({ email_action_type: "recovery" }));
  const now = 1_763_550_000;
  const ts = String(now);

  it("accepts a valid signature, including among several", async () => {
    expect(await verifyHookSignature(SECRET, hdrs({ "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": sign("msg_1", ts, body) }), body, now)).toEqual({ ok: true });
    const multi = `v1,AAAA ${sign("msg_1", ts, body)}`;
    expect(await verifyHookSignature(SECRET, hdrs({ "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": multi }), body, now)).toEqual({ ok: true });
  });

  it("accepts the secret with or without the v1,whsec_ prefix", async () => {
    const h = hdrs({ "webhook-id": "m", "webhook-timestamp": ts, "webhook-signature": sign("m", ts, body) });
    expect((await verifyHookSignature(`whsec_${SECRET_B64}`, h, body, now)).ok).toBe(true);
    expect((await verifyHookSignature(SECRET_B64, h, body, now)).ok).toBe(true);
  });

  it("refuses a tampered body, wrong secret, stale or future timestamp, missing headers or secret", async () => {
    const good = { "webhook-id": "m", "webhook-timestamp": ts, "webhook-signature": sign("m", ts, body) };
    expect(await verifyHookSignature(SECRET, hdrs(good), body + " ", now)).toEqual({ ok: false, reason: "bad_signature" });
    const other = Buffer.from("ffffffffffffffffffffffffffffffff").toString("base64");
    expect(await verifyHookSignature(`v1,whsec_${other}`, hdrs(good), body, now)).toEqual({ ok: false, reason: "bad_signature" });
    expect(await verifyHookSignature(SECRET, hdrs(good), body, now + 301)).toEqual({ ok: false, reason: "stale_timestamp" });
    expect(await verifyHookSignature(SECRET, hdrs(good), body, now - 301)).toEqual({ ok: false, reason: "stale_timestamp" });
    expect(await verifyHookSignature(SECRET, hdrs({ "webhook-id": "m", "webhook-timestamp": ts }), body, now)).toEqual({ ok: false, reason: "missing_headers" });
    expect(await verifyHookSignature("", hdrs(good), body, now)).toEqual({ ok: false, reason: "missing_secret" });
    expect(await verifyHookSignature(undefined, hdrs(good), body, now)).toEqual({ ok: false, reason: "missing_secret" });
    expect(hookSecretBytes("v1,whsec_short")).toBeNull();
  });
});

describe("links", () => {
  it("links to our own /auth/confirm page, never to Supabase's verify endpoint", () => {
    const u = new URL(confirmUrl("hash-abc", "recovery", "https://collaborate8.com/reset-password", "https://collaborate8.com"));
    expect(u.origin).toBe("https://collaborate8.com");
    expect(u.pathname).toBe("/auth/confirm");
    expect([...u.searchParams.keys()]).toEqual(["token_hash", "type", "next"]);
    expect(u.searchParams.get("token_hash")).toBe("hash-abc");
    expect(u.searchParams.get("type")).toBe("recovery");
    expect(u.searchParams.get("next")).toBe("/reset-password");
    expect(u.toString()).not.toContain("supabase.co");
    expect(u.toString()).not.toContain("/auth/v1/verify");
    expect(new URL(confirmUrl("h1234567", "email", "https://collaborate8.com/dashboard", "https://collaborate8.com")).searchParams.get("type")).toBe("magiclink");
  });

  it("opens the site the person came from only when it is an allowed site", () => {
    for (const o of LINK_ORIGINS) expect(linkOrigin(`${o}/reset-password`, "https://collaborate8.com")).toBe(o);
    expect(linkOrigin("https://collabor8-web.rafa-f1b.workers.dev/dashboard", "")).toBe("https://collabor8-web.rafa-f1b.workers.dev");
    // Not allowed: falls back to site_url when that is allowed, else the live site.
    expect(linkOrigin("https://evil.example.com/reset-password", "https://collabor8-uk-test.rafa-f1b.workers.dev")).toBe("https://collabor8-uk-test.rafa-f1b.workers.dev");
    expect(linkOrigin("https://uk-test.collaborate8.com/reset-password", "https://collaborate8.com")).toBe("https://collaborate8.com");
    expect(linkOrigin("https://evil.example.com/", "https://evil.example.com")).toBe("https://collaborate8.com");
    expect(linkOrigin("collabor8://reset-password", "https://collaborate8.com")).toBe("https://collaborate8.com");
    expect(linkOrigin("https://x.lovable.app/", "https://x.lovable.app")).toBe("https://collaborate8.com");
    expect(linkOrigin("http://collaborate8.com/", "")).toBe("https://collaborate8.com");
  });

  it("next is a same-site path from the redirect, else the default page", () => {
    expect(nextPath("magiclink", "https://collaborate8.com/admin/analytics?x=1", "https://collaborate8.com")).toBe("/admin/analytics?x=1");
    expect(nextPath("signup", "https://collaborate8.com/", "https://collaborate8.com")).toBe("/dashboard");
    expect(nextPath("recovery", "https://evil.example.com/steal", "https://collaborate8.com")).toBe("/reset-password");
    expect(nextPath("recovery", "collabor8://reset-password", "https://collaborate8.com")).toBe("/reset-password");
    const u = new URL(confirmUrl("hash-abc", "signup", "https://evil.example.com/x", "https://collaborate8.com"));
    expect(u.origin + (u.searchParams.get("next") ?? "")).toBe("https://collaborate8.com/dashboard");
  });

  it("sends a password reset to /reset-password when Supabase gives only the site root", () => {
    expect(redirectTarget("recovery", "", "https://collaborate8.com")).toBe("https://collaborate8.com/reset-password");
    expect(redirectTarget("recovery", "https://collaborate8.com", "https://collaborate8.com")).toBe("https://collaborate8.com/reset-password");
    expect(redirectTarget("recovery", "https://collaborate8.com/reset-password", "https://collaborate8.com")).toBe("https://collaborate8.com/reset-password");
    expect(redirectTarget("signup", "", "https://collaborate8.com")).toBe("https://collaborate8.com/dashboard");
  });

  it("keeps an allowed redirect (London test site, admin page, app deep link)", () => {
    expect(redirectTarget("recovery", "https://uk-test.collaborate8.com/reset-password", "https://collaborate8.com")).toBe("https://uk-test.collaborate8.com/reset-password");
    expect(redirectTarget("magiclink", "https://collaborate8.com/admin?next=1", "https://collaborate8.com")).toBe("https://collaborate8.com/admin?next=1");
    expect(redirectTarget("recovery", "collabor8://reset-password", "https://collaborate8.com")).toBe("collabor8://reset-password");
  });

  it("never sends anyone to a Lovable host or plain http", () => {
    expect(redirectTarget("recovery", "https://collaborate8.lovable.app/reset-password", "https://collaborate8.com")).toBe("https://collaborate8.com/reset-password");
    expect(redirectTarget("recovery", "https://id-preview--x.lovable.app/", "https://x.lovable.app")).toBe("https://collaborate8.com/reset-password");
    expect(redirectTarget("signup", "http://collaborate8.com/", "https://collaborate8.com")).toBe("https://collaborate8.com/dashboard");
    expect(siteOrigin("https://x.lovableproject.com")).toBe("https://collaborate8.com");
    expect(siteOrigin("")).toBe("https://collaborate8.com");
  });
});

describe("planAuthEmails", () => {
  it.each(["signup", "invite", "magiclink", "recovery"])("%s: one email to the user with an /auth/confirm link", (type) => {
    const out = planAuthEmails(payload({ email_action_type: type }) as any);
    expect(out).toHaveLength(1);
    expect(out[0].to).toBe("parent@example.com");
    expect(out[0].template).toBe(type);
    expect(out[0].subject).toBe(SUBJECTS[type as keyof typeof SUBJECTS]);
    const link = new URL(out[0].props.confirmationUrl);
    expect(link.origin).toBe("https://collaborate8.com");
    expect(link.pathname).toBe("/auth/confirm");
    expect(link.searchParams.get("token_hash")).toBe("hash-abc");
    expect(link.searchParams.get("type")).toBe(type);
    expect(link.searchParams.get("next")).toBe(type === "recovery" ? "/reset-password" : "/dashboard");
    expect(out[0].props.confirmationUrl).not.toContain("123456");
  });

  it("a reset from the London test site links back to the test site", () => {
    const [m] = planAuthEmails(payload({
      email_action_type: "recovery",
      redirect_to: "https://collabor8-uk-test.rafa-f1b.workers.dev/reset-password",
      site_url: "https://collaborate8.com",
    }) as any);
    expect(m.props.confirmationUrl).toBe(
      "https://collabor8-uk-test.rafa-f1b.workers.dev/auth/confirm?token_hash=hash-abc&type=recovery&next=%2Freset-password",
    );
  });

  it("'email' (OTP sign-in) uses the magic link template", () => {
    const [m] = planAuthEmails(payload({ email_action_type: "email" }) as any);
    expect(m.template).toBe("magiclink");
  });

  it("secure email change: two emails, with Supabase's reversed hash names", () => {
    const out = planAuthEmails(payload(
      { email_action_type: "email_change", token_hash: "hash-for-new", token_hash_new: "hash-for-current", token_new: "654321" },
      { email: "old@example.com", new_email: "new@example.com" },
    ) as any);
    expect(out.map((e) => [e.to, e.label])).toEqual([["old@example.com", "email_change:current"], ["new@example.com", "email_change:new"]]);
    expect(new URL(out[0].props.confirmationUrl).searchParams.get("token_hash")).toBe("hash-for-current");
    expect(new URL(out[1].props.confirmationUrl).searchParams.get("token_hash")).toBe("hash-for-new");
    for (const m of out) {
      const u = new URL(m.props.confirmationUrl);
      expect(u.origin + u.pathname).toBe("https://collaborate8.com/auth/confirm");
      expect(u.searchParams.get("type")).toBe("email_change");
      expect(u.searchParams.get("next")).toBe("/dashboard");
    }
    expect(out[0].props.oldEmail).toBe("old@example.com");
    expect(out[0].props.newEmail).toBe("new@example.com");
  });

  it("email change without secure change: one email to the new address", () => {
    const out = planAuthEmails(payload({ email_action_type: "email_change", token_hash: "h1", token_hash_new: "" }, { email: "old@example.com", new_email: "new@example.com" }) as any);
    expect(out.map((e) => e.to)).toEqual(["new@example.com"]);
  });

  it("reauthentication sends the code, security notices send a notice", () => {
    const [r] = planAuthEmails(payload({ email_action_type: "reauthentication" }) as any);
    expect(r.template).toBe("reauthentication");
    expect(r.props.token).toBe("123456");
    const [n] = planAuthEmails(payload({ email_action_type: "password_changed_notification", token: "", token_hash: "" }) as any);
    expect(n.template).toBe("security_notice");
    expect(n.props.message).toContain("password");
  });

  it("test and QA addresses get the real email with no [TEST] prefix", () => {
    for (const email of ["collaborate8-qa+uk1@agentmail.to", "rafa+uk1@collaborate8.com"]) {
      const [m] = planAuthEmails(payload({ email_action_type: "recovery" }, { email }) as any);
      expect(m.to).toBe(email);
      expect(m.subject).not.toContain("[TEST]");
    }
  });

  it("refuses malformed payloads without echoing them", () => {
    expect(() => planAuthEmails({} as any)).toThrow("missing email_data");
    expect(() => planAuthEmails(payload({ email_action_type: "recovery" }, { email: "" }) as any)).toThrow("missing user email");
    expect(() => planAuthEmails(payload({ email_action_type: "recovery", token_hash: "" }) as any)).toThrow("missing token_hash");
    expect(() => planAuthEmails(payload({ email_action_type: "something_new" }) as any)).toThrow("unsupported");
  });

  it("hook errors use Supabase's error shape", () => {
    expect(JSON.parse(hookError(401, "Invalid hook signature").body)).toEqual({ error: { http_code: 401, message: "Invalid hook signature" } });
  });
});

describe("copy and Lovable removal", () => {
  it("subjects and default sender follow the copy rules", () => {
    for (const s of [...Object.values(SUBJECTS), AUTH_FROM_DEFAULT]) expect(copyProblems(s)).toEqual([]);
    expect(AUTH_FROM_DEFAULT).toContain("@notify.collaborate8.com");
  });

  it("auth templates and hook files follow the copy rules", () => {
    const dir = "supabase/functions/_shared/email-templates";
    const files = [
      ...readdirSync(join(root, dir)).map((f) => `${dir}/${f}`),
      "supabase/functions/auth-email-hook/index.ts",
      "supabase/functions/auth-email-hook/handler.ts",
    ];
    for (const f of files) expect({ f, problems: copyProblems(read(f)) }).toEqual({ f, problems: [] });
    // The rules file names Lovable hosts only to block them.
    const rules = read("supabase/functions/_shared/auth-email-rules.ts");
    expect(copyProblems(rules).filter((p) => p !== "lovable")).toEqual([]);
  });

  it("no edge function uses the Lovable email SDK or the Lovable API key for email", () => {
    const fnRoot = join(root, "supabase/functions");
    const hits: string[] = [];
    for (const d of readdirSync(fnRoot, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      for (const f of readdirSync(join(fnRoot, d.name), { recursive: true }) as string[]) {
        if (!/\.(ts|tsx)$/.test(f)) continue;
        const text = readFileSync(join(fnRoot, d.name, f), "utf8");
        if (/@lovable\.dev\/email-js|LOVABLE_SEND_URL|x-lovable-signature/.test(text)) hits.push(`${d.name}/${f}`);
        if (/LOVABLE_API_KEY/.test(text)) hits.push(`${d.name}/${f}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the hook never logs addresses, tokens or links", () => {
    const handler = read("supabase/functions/auth-email-hook/handler.ts");
    const logCalls = handler.match(/log\([^)]*\)/g) ?? [];
    expect(logCalls.length).toBeGreaterThan(0);
    for (const call of logCalls) expect(call).not.toMatch(/\.to\b|token|confirmationUrl|email\.props|payload\b|body\b/);
    // The only console call is the default logger, which prints the message and the short extras.
    expect(handler.match(/console\.\w+\([^\n]*/g)).toEqual(["console.log(`[auth-email-hook] ${msg}`, extra ?? {}))"]);
  });

  it("the hook secret is read from env, never from admin overrides", () => {
    const index = read("supabase/functions/auth-email-hook/index.ts");
    expect(index).toContain("Deno.env.get(name)");
    expect(index).not.toMatch(/cfg\(['"]SEND_EMAIL_HOOK_SECRET/);
    expect(read("supabase/functions/_shared/config-registry.ts")).not.toContain("SEND_EMAIL_HOOK_SECRET");
  });
});
