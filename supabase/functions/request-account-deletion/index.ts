import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { deleteAccount, sha256Hex } from "../_shared/account-deletion.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

async function findUserId(admin: ReturnType<typeof createSupabaseAdmin>, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const admin = createSupabaseAdmin();
  let body: { email?: unknown; token?: unknown };
  try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }

  // Confirm step
  if (typeof body.token === "string") {
    const token = body.token.trim();
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ status: "error", error: "invalid_token" }, 400);
    const hash = await sha256Hex(token);
    const { data: reqRow } = await admin.from("deletion_requests").select("id, user_id, email, status, expires_at")
      .eq("token_hash", hash).maybeSingle();
    if (!reqRow || reqRow.status !== "pending" || new Date(reqRow.expires_at) < new Date() || !reqRow.user_id) {
      return json({ status: "error", error: "invalid_or_expired" }, 400);
    }
    await admin.from("deletion_requests").update({ status: "processing" }).eq("id", reqRow.id);
    const result = await deleteAccount(admin, reqRow.user_id, reqRow.email);
    await admin.from("deletion_requests").update({ status: result.status === "deleted" ? "completed" : "failed", user_id: null }).eq("id", reqRow.id);
    return json(result, result.status === "deleted" ? 200 : 500);
  }

  // Request step: always the same answer
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 320) return json({ status: "ok" });
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("deletion_requests").select("id", { count: "exact", head: true })
      .eq("email", email).gte("created_at", since);
    if ((count ?? 0) >= 3) return json({ status: "ok" });

    const userId = await findUserId(admin, email);
    if (!userId) return json({ status: "ok" });

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { data: row, error } = await admin.from("deletion_requests")
      .insert({ email, user_id: userId, token_hash: await sha256Hex(token) }).select("id").single();
    if (error) throw error;
    await sendTemplateEmail("account_deletion_confirm", email, {
      templateData: { confirmUrl: `https://collaborate8.com/delete-account?token=${token}` },
      idempotencyKey: `account-deletion-${row.id}`,
    });
  } catch (e) {
    console.error("[request-account-deletion]", (e as Error).message);
  }
  return json({ status: "ok" });
});
