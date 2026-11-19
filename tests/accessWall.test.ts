import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  accessEmailsEnabled,
  approvalEmail,
  DEFAULT_REVIEWER_EMAILS,
  escapeHtml,
  isTestEmail,
  linkBase,
  looksLikeToken,
  newToken,
  rejectionEmail,
  reviewerEmail,
  reviewerRecipients,
  sha256Hex,
  signupDecision,
  validateRequest,
} from "../supabase/functions/_shared/access-request-rules";
import { isAccessToken, signupClientMeta, signupGate, splitName } from "../src/lib/accessWall";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");

const copyProblems = (text: string) => {
  const out: string[] = [];
  if (text.includes("\u2014")) out.push("em dash");
  if (/\bpolice\b|\bvictims?\b/i.test(text)) out.push("police/victim");
  if (/lovable\.app/i.test(text)) out.push("lovable.app");
  if (/Collaborate8(?!\.com)/.test(text)) out.push("brand spelt Collaborate8");
  return out;
};

describe("request validation", () => {
  it("accepts a normal request and tidies it", () => {
    const r = validateRequest({ name: "  Sam   Parent ", email: " Sam@Example.COM ", note: "  hi  " });
    expect(r).toEqual({ ok: true, value: { name: "Sam Parent", email: "sam@example.com", note: "hi" } });
  });
  it("makes an empty note null", () => {
    const r = validateRequest({ name: "Sam", email: "sam@example.com", note: "   " });
    expect(r.ok && r.value.note).toBe(null);
  });
  it("refuses bad input with the field", () => {
    expect(validateRequest({ name: "", email: "a@b.co" })).toMatchObject({ ok: false, field: "name" });
    expect(validateRequest({ name: "A", email: "nope" })).toMatchObject({ ok: false, field: "email" });
    expect(validateRequest({ name: "A".repeat(101), email: "a@b.co" })).toMatchObject({ ok: false, field: "name" });
    expect(validateRequest({ name: "A", email: "a@b.co", note: "x".repeat(501) })).toMatchObject({ ok: false, field: "note" });
    expect(validateRequest(null)).toMatchObject({ ok: false });
  });
});

describe("who gets the reviewer email", () => {
  it("defaults to Rafa and Jade", () => {
    expect(reviewerRecipients("parent@example.com", {})).toEqual({ to: [...DEFAULT_REVIEWER_EMAILS], test: false });
  });
  it("uses ACCESS_REQUEST_EMAILS when set", () => {
    expect(reviewerRecipients("parent@example.com", { reviewers: "a@collaborate8.com, b@collaborate8.com" }).to).toEqual(["a@collaborate8.com", "b@collaborate8.com"]);
  });
  it("sends test and QA requests only to the QA inbox, never to reviewers", () => {
    for (const e of ["collaborate8-qa+uk1@agentmail.to", "rafa+uk1@collaborate8.com", "anyone@agentmail.to"]) {
      const r = reviewerRecipients(e, { reviewers: "rafa@collaborate8.com", qa: "collaborate8-qa@agentmail.to" });
      expect(r).toEqual({ to: ["collaborate8-qa@agentmail.to"], test: true });
    }
    expect(reviewerRecipients("x@agentmail.to", {}).to).toEqual(["collaborate8-qa@agentmail.to"]);
    // A non-QA address in QA_ALERT_EMAIL is ignored, so a test request can't reach a real inbox.
    expect(reviewerRecipients("x@agentmail.to", { qa: "rafa@collaborate8.com" }).to).toEqual(["collaborate8-qa@agentmail.to"]);
  });
  it("spots test addresses", () => {
    expect(isTestEmail("collaborate8-qa+ukadmin@agentmail.to")).toBe(true);
    expect(isTestEmail("jade+uk2@collaborate8.com")).toBe(true);
    expect(isTestEmail("parent@example.com")).toBe(false);
    expect(isTestEmail("uk@example.com")).toBe(false);
  });
});

describe("emails", () => {
  const rev = reviewerEmail({ id: "11111111-2222-3333-4444-555555555555", name: "Sam <b>", email: "sam@example.com", note: "Line 1\n<script>", base: "https://collaborate8.com", test: false });
  it("reviewer email opens the admin page, never a one-click change", () => {
    expect(rev.html).toContain("https://collaborate8.com/admin/access-requests?id=11111111-2222-3333-4444-555555555555&amp;action=approve");
    expect(rev.html).toContain("action=reject");
    expect(rev.text).toContain("/admin/access-requests?id=");
    expect(rev.html).not.toMatch(/functions\/v1/);
  });
  it("escapes what the person typed", () => {
    expect(rev.html).not.toContain("<script>");
    expect(rev.html).toContain("Sam &lt;b&gt;");
    expect(escapeHtml(`"'&`)).toBe("&quot;&#39;&amp;");
  });
  it("prefixes test emails", () => {
    expect(reviewerEmail({ id: "x", name: "A", email: "a@agentmail.to", note: null, base: "https://collaborate8.com", test: true }).subject.startsWith("[TEST] ")).toBe(true);
    expect(approvalEmail({ name: "A", link: "https://collaborate8.com/signup?access=x", test: true }).subject.startsWith("[TEST] ")).toBe(true);
    expect(rejectionEmail({ name: "A", test: false }).subject.startsWith("[TEST]")).toBe(false);
  });
  it("approval email carries the link", () => {
    const a = approvalEmail({ name: "Sam Parent", link: "https://collaborate8.com/signup?access=abc", test: false });
    expect(a.html).toContain("https://collaborate8.com/signup?access=abc");
    expect(a.text).toContain("Hi Sam,");
  });
  it("follows the copy rules", () => {
    const all = [rev, approvalEmail({ name: "S", link: "https://collaborate8.com/x", test: false }), rejectionEmail({ name: "S", test: false })];
    for (const e of all) expect(copyProblems(e.subject + e.html + e.text)).toEqual([]);
    for (const e of all) expect(e.text).toContain("Collabor8");
  });
});

describe("links and tokens", () => {
  it("only links to our own sites", () => {
    expect(linkBase("https://collabor8-uk-test.rafa-f1b.workers.dev")).toBe("https://collabor8-uk-test.rafa-f1b.workers.dev");
    expect(linkBase("https://www.collaborate8.com/")).toBe("https://www.collaborate8.com");
    expect(linkBase("https://collabor8.lovable.app")).toBe("https://collaborate8.com");
    expect(linkBase("https://evil.example")).toBe("https://collaborate8.com");
    expect(linkBase(null)).toBe("https://collaborate8.com");
  });
  it("makes long random URL-safe tokens", () => {
    const a = newToken();
    const b = newToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(looksLikeToken(a)).toBe(true);
    expect(isAccessToken(a)).toBe(true);
    expect(looksLikeToken("short")).toBe(false);
  });
  it("hashes the same way as Postgres sha256()", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("sign-up decision (mirror of the SQL hook)", () => {
  const base = { inviteIsValid: false, approvalTokenIsValid: false };
  it("refuses a plain website sign-up", () => {
    expect(signupDecision({ ...base, email: "p@example.com", meta: { c8_client: "web" } })).toBe("deny");
    expect(signupDecision({ ...base, email: "p@example.com", meta: {} })).toBe("deny");
  });
  it("lets the app through, new and current builds", () => {
    expect(signupDecision({ ...base, email: "p@example.com", meta: { c8_client: "app" } })).toBe("app");
    expect(signupDecision({ ...base, email: "p@example.com", meta: { acquisition_source: "android_play" } })).toBe("app");
    expect(signupDecision({ ...base, email: "p@example.com", meta: { c8_client: "web", acquisition_source: "android_play" } })).toBe("deny");
  });
  it("lets invites, approvals and team test accounts through", () => {
    expect(signupDecision({ ...base, inviteIsValid: true, email: "p@example.com", meta: { c8_client: "web" } })).toBe("invite");
    expect(signupDecision({ ...base, approvalTokenIsValid: true, email: "p@example.com", meta: { c8_client: "web" } })).toBe("approved");
    expect(signupDecision({ ...base, email: "collaborate8-qa+uk7@agentmail.to", meta: { c8_client: "web" } })).toBe("test");
    expect(signupDecision({ ...base, email: "rafa+uk1@collaborate8.com", meta: {} })).toBe("test");
    expect(signupDecision({ ...base, email: "stranger@agentmail.to", meta: { c8_client: "web" } })).toBe("deny");
  });
});

describe("web sign-up gate", () => {
  const tok = "A".repeat(43);
  it("never gates the app", () => {
    expect(signupGate({ inApp: true, search: "" })).toBe("open");
  });
  it("sends invites to the invited flow, links to a check, everyone else to request access", () => {
    expect(signupGate({ inApp: false, search: "?code=ABC234" })).toBe("invite");
    expect(signupGate({ inApp: false, search: `?access=${tok}` })).toBe("check_link");
    expect(signupGate({ inApp: false, search: "?access=nope" })).toBe("request");
    expect(signupGate({ inApp: false, search: "" })).toBe("request");
  });
  it("tags sign-ups with where they came from", () => {
    expect(signupClientMeta(true)).toEqual({ c8_client: "app" });
    expect(signupClientMeta(false)).toEqual({ c8_client: "web" });
  });
  it("splits a name", () => {
    expect(splitName(" Sam  Parent Jones ")).toEqual({ first: "Sam", last: "Parent Jones" });
    expect(splitName("")).toEqual({ first: "", last: "" });
  });
});

describe("email kill switch", () => {
  it("is off unless explicitly switched on", () => {
    for (const v of [undefined, null, "", "off", "false", "no", "0", "maybe", "enabled"]) expect(accessEmailsEnabled(v as string | undefined)).toBe(false);
    for (const v of ["on", "ON", "true", "yes", "1", " on "]) expect(accessEmailsEnabled(v)).toBe(true);
  });
  it("the edge function checks the switch before any email and hands admins the link instead", () => {
    const src = read("supabase/functions/request-access/index.ts");
    const body = src.slice(src.indexOf("async function sendAll"));
    const guard = body.indexOf("if (!accessEmailsEnabled(cfg(EMAILS_ENABLED_SETTING))) return 0;");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(body.indexOf("sendResendEmail("));
    expect(src).toContain("const emailsOn = accessEmailsEnabled(cfg(EMAILS_ENABLED_SETTING));");
    expect(src).toContain('row.result === "created" && row.id && !emailsOn');
    expect(src.match(/link: l\.link \}\);/g)?.length).toBe(2); // approve and new link return it while off
    expect(src).toContain("emailsOn && body?.notify === true");
  });
  it("the setting is on the admin Setup list and the admin page shows a copyable link", () => {
    expect(read("supabase/functions/_shared/config-registry.ts")).toContain('name: "ACCESS_REQUEST_EMAILS_ENABLED"');
    const page = read("src/pages/AdminAccessRequests.tsx");
    expect(page).toContain("Copy link");
    expect(page).toContain("Approve and get link");
  });
});

describe("files", () => {
  it("new pages, function and SQL follow the copy rules", () => {
    for (const p of [
      "src/pages/RequestAccess.tsx",
      "src/pages/AdminAccessRequests.tsx",
      "supabase/functions/request-access/index.ts",
      "supabase/functions/_shared/access-request-rules.ts",
      "supabase/manual/NEEDS_RAFA_APPROVAL_access_requests.sql",
    ]) expect([p, copyProblems(read(p))]).toEqual([p, []]);
  });
  it("no lovable.app links remain in the web app or edge functions", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(join(root, dir))) {
        const rel = join(dir, name);
        if (statSync(join(root, rel)).isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(name) && /lovable\.app/.test(read(rel))) hits.push(rel);
      }
    };
    walk("src");
    walk("supabase/functions");
    expect(hits).toEqual([]);
  });
  it("the edge function never logs a note, name, email or token", () => {
    const src = read("supabase/functions/request-access/index.ts");
    const logs = src.match(/console\.(log|error|warn)\([^)]*\)/g) ?? [];
    expect(logs.length).toBeGreaterThan(0);
    for (const l of logs) expect(l).not.toMatch(/\bnote\b|\bname\b|\.email\b|[{,]\s*email\b|\baddr\b|token|\bip\b|ipHash|\.link\b/);
  });
  it("the hook and SQL test agree on the metadata keys", () => {
    const sql = read("supabase/manual/NEEDS_RAFA_APPROVAL_access_requests.sql");
    for (const k of ["c8_client", "c8_access_token", "c8_invite_code", "acquisition_source"]) expect(sql).toContain(k);
    expect(sql).not.toMatch(/eycpkzbjylzzynkfggis/);
  });
  it("the SQL runs on a throwaway Postgres (PGlite), when it is installed", () => {
    const dir = process.env.PGLITE_DIR;
    const local = existsSync(join(root, "node_modules/@electric-sql/pglite"));
    if (!dir && !local) return; // optional: npm i --no-save @electric-sql/pglite
    const r = spawnSync("node", [join(root, "scripts/check-access-requests-sql.mjs")], { env: process.env, encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.stdout).toContain("checks passed");
  }, 60_000);
});
