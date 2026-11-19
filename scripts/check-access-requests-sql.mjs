// Runs supabase/manual/NEEDS_RAFA_APPROVAL_access_requests.sql against a throwaway in-memory
// Postgres (PGlite) with stub Supabase roles and tables, then exercises the submit function
// and the before-user-created hook. Touches no real database.
//   npm i --no-save @electric-sql/pglite   (or set PGLITE_DIR to a folder that has it)
//   node scripts/check-access-requests-sql.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const req = createRequire(process.env.PGLITE_DIR ? `${process.env.PGLITE_DIR}/` : import.meta.url);
const { PGlite } = req("@electric-sql/pglite");
const db = new PGlite();
const sqlFile = new URL("../supabase/manual/NEEDS_RAFA_APPROVAL_access_requests.sql", import.meta.url);
const rollback = new URL("../supabase/manual/NEEDS_RAFA_APPROVAL_access_requests_ROLLBACK.sql", import.meta.url);

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE supabase_auth_admin;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
  CREATE TABLE public.profiles (id uuid PRIMARY KEY);
  CREATE TABLE public.invitations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inviter_id uuid, invite_code text, invitee_email text, status text DEFAULT 'pending');
`);
await db.exec(readFileSync(sqlFile, "utf8"));

const one = async (q, p = []) => (await db.query(q, p)).rows[0];
const submit = (email, name = "Sam Parent", note = null, ip = null) =>
  one("SELECT public.access_request_submit($1,$2,$3,$4) AS r", [email, name, note, ip]).then((x) => x.r);
const hook = (email, meta = {}) =>
  one("SELECT public.c8_before_user_created($1::jsonb) AS r", [JSON.stringify({ metadata: { name: "before-user-created" }, user: { email, user_metadata: meta, app_metadata: { provider: "email" } } })]).then((x) => x.r);
const allowed = (r) => r && !r.error;
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

// Submit
const a = await submit("New.Parent@Example.com", "  Sam Parent ", "Hello");
ok(a.result === "created" && a.id, "first request is created");
ok((await one("SELECT email FROM public.access_requests WHERE id=$1", [a.id])).email === "new.parent@example.com", "email stored lower-case");
ok((await submit("new.parent@example.com")).result === "already_pending", "second open request is not created");
ok((await submit("bad")).result === "invalid", "bad email refused");
ok((await submit("x@example.com", "")).result === "invalid", "empty name refused");
ok((await submit("x@example.com", "A", "z".repeat(501))).result === "invalid", "long note refused");
await db.query("INSERT INTO auth.users (email) VALUES ('Existing@Example.com')");
ok((await submit("existing@example.com")).result === "has_account", "existing account does not create a request");
const ip = "a".repeat(64);
for (let i = 0; i < 10; i++) ok((await submit(`p${i}@example.com`, "P", null, ip)).result === "created", `ip request ${i}`);
ok((await submit("p10@example.com", "P", null, ip)).result === "rate_limited", "11th request from one network in an hour is limited");
await db.query("UPDATE public.access_requests SET status='rejected', decided_at=now() WHERE email='p0@example.com'");
ok((await submit("p0@example.com")).result === "created", "a rejected person may ask again");
await db.query("UPDATE public.access_requests SET status='rejected', decided_at=now() WHERE email='p0@example.com'");
ok((await submit("p0@example.com")).result === "created", "third request in a day");
await db.query("UPDATE public.access_requests SET status='rejected', decided_at=now() WHERE email='p0@example.com'");
ok((await submit("p0@example.com")).result === "rate_limited", "fourth request for one email in a day is limited");
await db.query("UPDATE public.access_requests SET created_at = now() - interval '8 days' WHERE email='p1@example.com'");
await submit("cleanup@example.com");
ok((await one("SELECT request_ip_hash FROM public.access_requests WHERE email='p1@example.com'")).request_ip_hash === null, "network hash forgotten after 7 days");

// Hook: deny by default
const deny = await hook("someone@example.com", { c8_client: "web", first_name: "S" });
ok(deny.error && deny.error.http_code === 403 && /request-access/.test(deny.error.message), "plain web sign-up refused");
ok(!/—/.test(deny.error.message) && !/police|victim/i.test(deny.error.message), "refusal copy rules");
ok(!allowed(await hook("someone@example.com", {})), "no metadata refused");
// Test accounts
ok(allowed(await hook("collaborate8-qa+uk9@agentmail.to", { c8_client: "web" })), "QA alias allowed");
ok(allowed(await hook("rafa+uk1@collaborate8.com", { c8_client: "web" })), "+uk team alias allowed");
ok(!allowed(await hook("random@agentmail.to", { c8_client: "web" })), "other agentmail inbox refused");
ok(!allowed(await hook("someone+uk@gmail.com", { c8_client: "web" })), "+uk on another domain refused");
// App
ok(allowed(await hook("app@example.com", { c8_client: "app" })), "c8_client=app allowed");
ok(allowed(await hook("app@example.com", { acquisition_source: "android_play" })), "current app build allowed");
ok(allowed(await hook("app@example.com", { acquisition_source: "app_store", utm_source: null })), "current iPhone build allowed");
ok(!allowed(await hook("web@example.com", { c8_client: "web", acquisition_source: "android_play" })), "web marker wins over acquisition_source");
// Invite
const inviter = (await one("INSERT INTO public.profiles (id) VALUES (gen_random_uuid()) RETURNING id")).id;
await db.query("INSERT INTO public.invitations (inviter_id, invite_code) VALUES ($1,'ABC234')", [inviter]);
await db.query("INSERT INTO public.invitations (inviter_id, invite_code, status) VALUES ($1,'USED22','accepted')", [inviter]);
await db.query("INSERT INTO public.invitations (inviter_id, invite_code) VALUES (gen_random_uuid(),'GHOST2')");
ok(allowed(await hook("cop@example.com", { c8_client: "web", c8_invite_code: "abc234" })), "valid invite allowed (any case)");
ok(!allowed(await hook("cop@example.com", { c8_client: "web", c8_invite_code: "USED22" })), "accepted invite refused");
ok(!allowed(await hook("cop@example.com", { c8_client: "web", c8_invite_code: "ZZZ999" })), "unknown invite refused");
ok(!allowed(await hook("cop@example.com", { c8_client: "web", c8_invite_code: "GHOST2" })), "invite from a deleted parent refused");
// Approved
const token = "T".repeat(43);
const hash = createHash("sha256").update(token).digest("hex");
const r = await submit("approved@example.com", "Ann");
await db.query("UPDATE public.access_requests SET status='approved', decided_at=now(), approval_token_hash=$2, token_expires_at=now()+interval '14 days' WHERE id=$1", [r.id, hash]);
ok(!allowed(await hook("other@example.com", { c8_client: "web", c8_access_token: token })), "token for another email refused");
ok(!allowed(await hook("approved@example.com", { c8_client: "web", c8_access_token: "U".repeat(43) })), "wrong token refused");
ok(!allowed(await hook("approved@example.com", { c8_client: "web" })), "approved email without its link refused");
ok(allowed(await hook("Approved@Example.com", { c8_client: "web", c8_access_token: token })), "approved person with their link allowed");
ok((await one("SELECT token_used_at FROM public.access_requests WHERE id=$1", [r.id])).token_used_at !== null, "link marked used");
ok(!allowed(await hook("approved@example.com", { c8_client: "web", c8_access_token: token })), "link works only once");
const r2 = await submit("expired@example.com", "Exp");
const t2 = "E".repeat(43);
await db.query("UPDATE public.access_requests SET status='approved', decided_at=now(), approval_token_hash=$2, token_expires_at=now()-interval '1 minute' WHERE id=$1", [r2.id, createHash("sha256").update(t2).digest("hex")]);
ok(!allowed(await hook("expired@example.com", { c8_client: "web", c8_access_token: t2 })), "expired link refused");
ok((await submit("expired@example.com")).result === "created", "expired approval lets them ask again");

// Grants: browsers have nothing
const g = await one(`SELECT has_table_privilege('anon','public.access_requests','SELECT') a, has_table_privilege('authenticated','public.access_requests','INSERT') b,
  has_function_privilege('anon','public.access_request_submit(text,text,text,text)','EXECUTE') c,
  has_function_privilege('authenticated','public.c8_before_user_created(jsonb)','EXECUTE') d,
  has_function_privilege('supabase_auth_admin','public.c8_before_user_created(jsonb)','EXECUTE') e,
  has_function_privilege('service_role','public.access_request_submit(text,text,text,text)','EXECUTE') f`);
ok(!g.a && !g.b && !g.c && !g.d && g.e && g.f, "grants: no anon/authenticated access; auth admin may run the hook; service role may submit");
ok((await one("SELECT relrowsecurity FROM pg_class WHERE oid='public.access_requests'::regclass")).relrowsecurity, "RLS on");

// Rollback runs cleanly and the file can be applied twice
await db.exec(readFileSync(rollback, "utf8"));
await db.exec(readFileSync(sqlFile, "utf8"));
await db.exec(readFileSync(sqlFile, "utf8"));
ok(true, "rollback then apply twice");
console.log(`access_requests SQL: ${n} checks passed`);
