import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";

const SENDER_DOMAIN = "notify.collaborate8.com";
const FROM_ADDRESS = `Collabor8 <invites@${SENDER_DOMAIN}>`;
const APP_URL = "https://collaborate8.com";

function renderHtml(inviteCode: string, senderName: string) {
  const inviteUrl = `${APP_URL}/signup/invited?code=${encodeURIComponent(inviteCode)}`;
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#FAF8F3;padding:24px;color:#111">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 12px;font-size:22px;color:#111">${senderName} invited you to Collabor8</h1>
    <p style="margin:0 0 20px;color:#444;line-height:1.5">
      Collabor8 helps separated parents manage child maintenance payments together.
      Use the code below to link your account when you sign up.
    </p>
    <div style="text-align:center;padding:20px;background:#FAF8F3;border-radius:12px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px">Your invite code</p>
      <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:6px;color:#D4A017">${inviteCode}</p>
    </div>
    <div style="text-align:center;margin:0 0 20px">
      <a href="${inviteUrl}" style="display:inline-block;background:#D4A017;color:#111;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">Create your account</a>
    </div>
    <p style="margin:0;color:#777;font-size:13px;line-height:1.5">
      Or open ${APP_URL}/signup/invited and enter the code manually.
    </p>
  </div>
  <p style="text-align:center;color:#999;font-size:12px;margin-top:16px">— Collabor8</p>
  </body></html>`;
}

function renderText(inviteCode: string, senderName: string) {
  return `${senderName} invited you to Collabor8.\n\nYour invite code: ${inviteCode}\n\nCreate your account: ${APP_URL}/signup/invited?code=${inviteCode}\n\n— Collabor8`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await getUserFromRequest(req);
    const { recipientEmail, inviteCode, senderName } = await req.json();

    if (!recipientEmail || !inviteCode) {
      return new Response(JSON.stringify({ error: "Missing recipientEmail or inviteCode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseAdmin();

    // Store recipient on the invitation for reference
    await supabase
      .from("invitations")
      .update({ invitee_email: recipientEmail })
      .eq("invite_code", inviteCode);

    const displayName = senderName || "Your co-parent";
    const messageId = crypto.randomUUID();

    // Ensure an unsubscribe token exists for this recipient (required for transactional emails)
    let unsubscribeToken: string | null = null;
    const { data: existingTok } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", recipientEmail)
      .maybeSingle();
    if (existingTok?.token) {
      unsubscribeToken = existingTok.token;
    } else {
      const newToken = crypto.randomUUID().replace(/-/g, "");
      const { data: insertedTok, error: tokErr } = await supabase
        .from("email_unsubscribe_tokens")
        .insert({ email: recipientEmail, token: newToken })
        .select("token")
        .single();
      if (!tokErr && insertedTok) unsubscribeToken = insertedTok.token;
    }

    const payload = {
      message_id: messageId,
      idempotency_key: `coparent_invite:${inviteCode}:${recipientEmail}`,
      to: recipientEmail,
      from: FROM_ADDRESS,
      sender_domain: SENDER_DOMAIN,
      subject: `${displayName} invited you to Collabor8`,
      html: renderHtml(inviteCode, displayName),
      text: renderText(inviteCode, displayName),
      purpose: "transactional",
      label: "coparent_invite",
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    };

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload,
    });

    if (enqueueError) {
      console.error("enqueue_email failed", enqueueError);
      return new Response(JSON.stringify({
        success: true,
        emailSent: false,
        message: "Invite created but email could not be queued. Share the code manually.",
        inviteCode,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      emailSent: true,
      message: "Invitation email queued for delivery",
      inviteCode,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("send-invite-email error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
