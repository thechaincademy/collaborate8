import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

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

    try {
      const result = await sendTemplateEmail("coparent_invite", recipientEmail, {
        templateData: { inviteCode, senderName: displayName },
        idempotencyKey: `coparent_invite:${inviteCode}:${recipientEmail}`,
      });

      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "coparent_invite",
        recipient_email: recipientEmail,
        status: result.sent ? "sent" : "suppressed",
        error_message: result.sent ? null : "Recipient is suppressed",
      });
      if (logError) console.error("email_send_log insert failed", logError);

      return new Response(JSON.stringify({
        success: true,
        emailSent: result.sent,
        message: result.sent
          ? "Invitation email sent"
          : "Invite created but this address cannot receive emails. Share the code manually.",
        inviteCode,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Send failed";
      console.error("invite email send failed", message);
      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "coparent_invite",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: message,
      });
      if (logError) console.error("email_send_log insert failed", logError);

      return new Response(JSON.stringify({
        success: true,
        emailSent: false,
        message: "Invite created but the email could not be sent. Share the code manually.",
        inviteCode,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("send-invite-email error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
