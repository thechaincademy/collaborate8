import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    const { recipientEmail } = await req.json();

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Missing recipientEmail" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseAdmin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, invite_code")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.invite_code) {
      return new Response(JSON.stringify({ error: "No invite code found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
      "Your co-parent";

    try {
      const result = await sendTemplateEmail("conversation_tool_invite", recipientEmail, {
        templateData: { inviteCode: profile.invite_code, senderName: displayName },
        idempotencyKey: `conversation_tool_invite:${user.id}:${profile.invite_code}:${recipientEmail}`,
      });

      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "conversation_tool_invite",
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
          : "Invite created but this address cannot receive emails.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Send failed";
      console.error("conversation tool invite email send failed", message);
      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "conversation_tool_invite",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: message,
      });
      if (logError) console.error("email_send_log insert failed", logError);

      return new Response(JSON.stringify({
        success: true,
        emailSent: false,
        message: "Invite created but the email could not be sent.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("send-conversation-invite error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
