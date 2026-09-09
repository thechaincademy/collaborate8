import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const ADMIN_EMAILS = ["jade@collaborate8.com", "rafa@collaborate8.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    const email = user.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "User has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseAdmin();

    // Only ever send the signup emails once per user.
    const { data: already } = await supabase
      .from("email_send_log")
      .select("id")
      .eq("recipient_email", email)
      .eq("template_name", "user_welcome")
      .limit(1)
      .maybeSingle();

    if (already) {
      return new Response(JSON.stringify({ sent: false, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = (meta.full_name as string) || "";
    const firstName = (meta.first_name as string) || fullName.split(" ")[0] || "";
    const signedUpAt = user.created_at ?? new Date().toISOString();

    const logSend = async (
      templateName: string,
      recipient: string,
      status: "sent" | "suppressed" | "failed",
      errorMessage: string | null = null
    ) => {
      const { error } = await supabase.from("email_send_log").insert({
        template_name: templateName,
        recipient_email: recipient,
        status,
        error_message: errorMessage,
      });
      if (error) console.error("email_send_log insert failed", error);
    };

    const send = async (
      templateName: string,
      recipient: string,
      templateData: Record<string, unknown>,
      idempotencyKey: string
    ) => {
      try {
        const result = await sendTemplateEmail(templateName, recipient, {
          templateData,
          idempotencyKey,
        });
        await logSend(
          templateName,
          recipient,
          result.sent ? "sent" : "suppressed",
          result.sent ? null : "Recipient is suppressed"
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Send failed";
        console.error(`${templateName} send failed`, message);
        await logSend(templateName, recipient, "failed", message);
      }
    };

    // Welcome email to the new user
    await send("user_welcome", email, { name: firstName }, `welcome:${user.id}`);

    // Founder alerts
    for (const adminEmail of ADMIN_EMAILS) {
      await send(
        "new_signup_admin_alert",
        adminEmail,
        {
          email,
          name: fullName || firstName || "-",
          signedUpAt: new Date(signedUpAt).toISOString().slice(0, 16).replace("T", " ") + " UTC",
        },
        `new_signup:${user.id}:${adminEmail}`
      );
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-signup-emails error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
