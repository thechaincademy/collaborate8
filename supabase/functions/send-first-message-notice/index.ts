import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    const { recipientEmail } = await req.json();

    if (!recipientEmail || typeof recipientEmail !== "string") {
      return new Response(JSON.stringify({ error: "Missing recipientEmail" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseAdmin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("invite_code")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.invite_code) {
      return new Response(JSON.stringify({ error: "No invite code found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const result = await sendTemplateEmail("first_message_notice", recipientEmail, {
        templateData: { inviteCode: profile.invite_code },
        idempotencyKey: `first_message_notice:${user.id}:${recipientEmail}`,
      });

      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "first_message_notice",
        recipient_email: recipientEmail,
        status: result.sent ? "sent" : "suppressed",
        error_message: result.sent ? null : "Recipient is suppressed",
      });
      if (logError) console.error("email_send_log insert failed", logError);

      return new Response(JSON.stringify({ success: true, emailSent: result.sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Send failed";
      console.error("first message notice send failed", message);
      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "first_message_notice",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: message,
      });
      if (logError) console.error("email_send_log insert failed", logError);

      return new Response(JSON.stringify({ success: true, emailSent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("send-first-message-notice error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
