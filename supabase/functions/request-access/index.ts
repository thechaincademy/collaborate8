// Web "Request access" wall.
//
// Public actions (no sign-in):
//   submit       { name, email, note? }  stores a request (rate limited in the database) and
//                emails the reviewers (ACCESS_REQUEST_EMAILS, else Rafa and Jade). A test or QA
//                address only ever emails QA_ALERT_EMAIL, with a [TEST] subject.
//   check_token  { token }  says whether a sign-up link is still valid, and for which email.
// Admin actions (Rafa and Jade, the same is_admin + allow-list check as admin-config for Setup):
//   list                          the latest requests
//   decide  { id, decision: "approve" | "reject", notify?: boolean }
//           approve: a single-use sign-up link (14 days) is emailed to the person.
//           reject: optionally sends a polite no.
//   resend  { id }   a fresh sign-up link for an approved request that hasn't been used.
//
// Never logs names, emails, notes or tokens; only ids, actions and error codes.
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import { ALLOWED_ADMIN_EMAILS } from "../_shared/google-oauth.ts";
import { cfg } from "../_shared/config.ts";
import { sendResendEmail } from "../_shared/resend.ts";
import {
  approvalEmail,
  isTestEmail,
  linkBase,
  looksLikeToken,
  newToken,
  rejectionEmail,
  reviewerEmail,
  reviewerRecipients,
  sha256Hex,
  TOKEN_DAYS,
  validateRequest,
} from "../_shared/access-request-rules.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const NOT_READY = "Requests can't be taken yet because a database update is waiting for approval.";
const isMissing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42P01" || e.code === "PGRST202" || e.code === "PGRST205" || /does not exist|could not find/i.test(e.message ?? ""));

type Admin = ReturnType<typeof createSupabaseAdmin>;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").trim();
}

async function sendAll(to: string[], email: { subject: string; html: string; text: string }, key: string) {
  let sent = 0;
  for (const addr of to) {
    try {
      const r = await sendResendEmail({ to: addr, subject: email.subject, html: email.html, text: email.text, idempotencyKey: `${key}:${addr}` });
      if (r.sent) sent++;
    } catch (e) {
      console.error("request-access email failed", { key, error: (e as Error).name });
    }
  }
  return sent;
}

async function requireAdmin(req: Request, admin: Admin) {
  let caller;
  try {
    caller = await getUserFromRequest(req);
  } catch {
    return { error: json({ error: "Not signed in" }, 401) };
  }
  const email = (caller.email ?? "").toLowerCase();
  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.id });
  if (!isAdmin || !ALLOWED_ADMIN_EMAILS.includes(email)) return { error: json({ error: "Forbidden" }, 403) };
  return { caller };
}

async function issueLink(base: string) {
  const token = newToken();
  const hash = await sha256Hex(token);
  const expires = new Date(Date.now() + TOKEN_DAYS * 86_400_000).toISOString();
  return { token, hash, expires, link: `${base}/signup?access=${token}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "submit");
  const admin = createSupabaseAdmin();
  const base = linkBase(req.headers.get("origin"));

  try {
    if (action === "submit") {
      const v = validateRequest(body);
      if (v.ok === false) return json({ error: v.error, field: v.field }, 400);
      const { email, name, note } = v.value;
      const ip = clientIp(req);
      const ipHash = ip ? await sha256Hex(`c8-access-request:${ip}`) : null;
      const { data, error } = await admin.rpc("access_request_submit", { _email: email, _name: name, _note: note, _ip_hash: ipHash });
      if (error) {
        if (isMissing(error)) return json({ error: NOT_READY, code: "not_ready" }, 503);
        console.error("request-access submit failed", { code: error.code });
        return json({ error: "Something went wrong. Please try again later." }, 500);
      }
      const row = (data ?? {}) as { result?: string; id?: string };
      if (row.result === "rate_limited") return json({ error: "You've sent a few requests already. Please try again later.", code: "rate_limited" }, 429);
      // Same answer whether the address is new, already waiting or already approved, so the
      // form never reveals who has asked before.
      if (row.result === "created" && row.id) {
        const r = reviewerRecipients(email, { reviewers: cfg("ACCESS_REQUEST_EMAILS"), qa: cfg("QA_ALERT_EMAIL") });
        const mail = reviewerEmail({ id: row.id, name, email, note, base, test: r.test });
        const sent = await sendAll(r.to, mail, `access_request:${row.id}`);
        console.log("request-access created", { id: row.id, test: r.test, reviewers_emailed: sent });
      } else {
        console.log("request-access repeat", { result: row.result ?? "unknown" });
      }
      return json({ ok: true });
    }

    if (action === "check_token") {
      if (!looksLikeToken(body?.token)) return json({ ok: false });
      const hash = await sha256Hex(body.token);
      const { data, error } = await admin
        .from("access_requests")
        .select("email, name, token_expires_at, token_used_at, status")
        .eq("approval_token_hash", hash)
        .maybeSingle();
      if (error) {
        if (isMissing(error)) return json({ ok: false, code: "not_ready" });
        return json({ ok: false });
      }
      const valid = !!data && data.status === "approved" && !data.token_used_at && !!data.token_expires_at && new Date(data.token_expires_at).getTime() > Date.now();
      return json(valid ? { ok: true, email: data!.email, name: data!.name } : { ok: false });
    }

    const gate = await requireAdmin(req, admin);
    if (gate.error) return gate.error;
    const caller = gate.caller!;

    if (action === "list") {
      const { data, error } = await admin
        .from("access_requests")
        .select("id, email, name, note, status, decided_by, decided_at, created_at, token_expires_at, token_used_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) {
        if (isMissing(error)) return json({ ready: false, requests: [] });
        console.error("request-access list failed", { code: error.code });
        return json({ error: "Could not load requests." }, 500);
      }
      const ids = [...new Set((data ?? []).map((r) => r.decided_by).filter(Boolean))] as string[];
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await admin.from("profiles").select("id, first_name").in("id", ids);
        for (const p of profs ?? []) names[p.id] = p.first_name ?? "";
      }
      return json({
        ready: true,
        requests: (data ?? []).map((r) => ({ ...r, decided_by_name: r.decided_by ? names[r.decided_by] || "An admin" : null })),
      });
    }

    const id = String(body?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Unknown request." }, 400);

    if (action === "decide") {
      const decision = body?.decision === "approve" ? "approved" : body?.decision === "reject" ? "rejected" : null;
      if (!decision) return json({ error: "Choose approve or reject." }, 400);
      const { data: row, error: readErr } = await admin.from("access_requests").select("id, email, name, status").eq("id", id).maybeSingle();
      if (readErr || !row) return json({ error: "Unknown request." }, 404);
      if (row.status !== "pending") return json({ error: `This request was already ${row.status}.`, code: "already_decided" }, 409);
      const now = new Date().toISOString();
      const test = isTestEmail(row.email);

      if (decision === "approved") {
        const l = await issueLink(base);
        const { data: upd, error } = await admin
          .from("access_requests")
          .update({ status: "approved", decided_by: caller.id, decided_at: now, approval_token_hash: l.hash, token_expires_at: l.expires, token_used_at: null })
          .eq("id", id)
          .eq("status", "pending")
          .select("id");
        if (error || !upd?.length) return json({ error: "Could not approve. It may have just been decided by someone else." }, 409);
        const sent = await sendAll([row.email], approvalEmail({ name: row.name, link: l.link, test }), `access_approved:${id}:${l.hash.slice(0, 12)}`);
        console.log("request-access approved", { id, by: caller.id, emailed: sent > 0 });
        return json({ ok: true, status: "approved", emailed: sent > 0 });
      }

      const { data: upd, error } = await admin
        .from("access_requests")
        .update({ status: "rejected", decided_by: caller.id, decided_at: now, approval_token_hash: null, token_expires_at: null })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");
      if (error || !upd?.length) return json({ error: "Could not reject. It may have just been decided by someone else." }, 409);
      let emailed = false;
      if (body?.notify === true) emailed = (await sendAll([row.email], rejectionEmail({ name: row.name, test }), `access_rejected:${id}`)) > 0;
      console.log("request-access rejected", { id, by: caller.id, emailed });
      return json({ ok: true, status: "rejected", emailed });
    }

    if (action === "resend") {
      const { data: row } = await admin.from("access_requests").select("id, email, name, status, token_used_at").eq("id", id).maybeSingle();
      if (!row || row.status !== "approved") return json({ error: "Only approved requests can get a new link." }, 409);
      if (row.token_used_at) return json({ error: "This person has already created their account." }, 409);
      const l = await issueLink(base);
      const { error } = await admin
        .from("access_requests")
        .update({ approval_token_hash: l.hash, token_expires_at: l.expires })
        .eq("id", id)
        .eq("status", "approved")
        .is("token_used_at", null);
      if (error) return json({ error: "Could not create a new link." }, 500);
      const sent = await sendAll([row.email], approvalEmail({ name: row.name, link: l.link, test: isTestEmail(row.email) }), `access_approved:${id}:${l.hash.slice(0, 12)}`);
      console.log("request-access link resent", { id, by: caller.id, emailed: sent > 0 });
      return json({ ok: true, emailed: sent > 0 });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("request-access error", (e as Error).name);
    return json({ error: "Request failed. Please try again later." }, 500);
  }
});
