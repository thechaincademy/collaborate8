import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const to = "ericbarreto521@gmail.com";
  const inviteCode = "TEST01";
  const inviteUrl = `https://collaborate8.com/signup/invited?code=${inviteCode}`;

  // Get or create an unsubscribe token for this recipient
  let unsubToken: string | null = null;
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", to)
    .maybeSingle();
  if (existing?.token) {
    unsubToken = existing.token;
  } else {
    const newToken = crypto.randomUUID().replace(/-/g, "");
    const { data: inserted, error: insErr } = await supabase
      .from("email_unsubscribe_tokens")
      .insert({ email: to, token: newToken })
      .select("token")
      .single();
    if (insErr) {
      return new Response(JSON.stringify({ ok: false, error: `token insert: ${insErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    unsubToken = inserted.token;
  }

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#FAF8F3;padding:24px;color:#111">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
      <h1 style="margin:0 0 12px;font-size:22px">Collabor8 - Test email</h1>
      <p>This is a test email confirming that the Collabor8 email pipeline is working.</p>
      <div style="text-align:center;padding:20px;background:#FAF8F3;border-radius:12px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px">Sample invite code</p>
        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:6px;color:#D4A017">${inviteCode}</p>
      </div>
      <div style="text-align:center">
        <a href="${inviteUrl}" style="display:inline-block;background:#D4A017;color:#111;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">Open Collabor8</a>
      </div>
    </div>
  </body></html>`;

  const payload = {
    message_id: crypto.randomUUID(),
    idempotency_key: `test_email:${Date.now()}`,
    to,
    from: "Collabor8 <invites@notify.collaborate8.com>",
    sender_domain: "notify.collaborate8.com",
    subject: "Collabor8 test email",
    html,
    text: `Collabor8 test email. Sample invite code: ${inviteCode}. Open ${inviteUrl}`,
    purpose: "transactional",
    label: "test_email",
    unsubscribe_token: unsubToken,
    queued_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload,
  });

  return new Response(
    JSON.stringify({ ok: !error, msg_id: data, error: error?.message, message_id: payload.message_id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
