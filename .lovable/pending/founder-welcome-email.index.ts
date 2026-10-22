// Deploy target: supabase/functions/founder-welcome-email/index.ts
// Hourly job: sends the founder welcome email once, about 24 hours after signup.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const TEMPLATE = "founder_welcome";
const REPLY_TO = "rafa@collaborate8.com";
const BATCH = 50;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createSupabaseAdmin();

  try {
    // Go-live cutoff: no row = feature off, nothing is sent. Never retroactive.
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "founder_welcome_cutoff")
      .maybeSingle();
    const cutoff = setting?.value ? new Date(setting.value) : null;
    if (!cutoff || isNaN(cutoff.getTime())) return json({ sent: 0, reason: "not_enabled" });

    const dueBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: due, error } = await supabase
      .from("profiles")
      .select("id, first_name")
      .is("welcome_email_sent_at", null)
      .eq("is_test_account", false)
      .gte("created_at", cutoff.toISOString())
      .lte("created_at", dueBefore)
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (error) throw new Error(error.message);

    let sent = 0;
    for (const p of due ?? []) {
      // Claim the row first so overlapping runs can never send twice.
      const claimedAt = new Date().toISOString();
      const { data: claimed } = await supabase
        .from("profiles")
        .update({ welcome_email_sent_at: claimedAt })
        .eq("id", p.id)
        .is("welcome_email_sent_at", null)
        .select("id");
      if (!claimed?.length) continue;

      const { data: u } = await supabase.auth.admin.getUserById(p.id);
      const email = u?.user?.email;
      if (!email) continue; // stays marked: no address to send to

      const firstName = (p.first_name ?? "").trim();
      try {
        const result = await sendTemplateEmail(TEMPLATE, email, {
          templateData: firstName ? { firstName } : {},
          idempotencyKey: `founder-welcome:${p.id}`,
          replyTo: REPLY_TO,
        });
        await supabase.from("email_send_log").insert({
          template_name: TEMPLATE,
          recipient_email: email,
          status: result.sent ? "sent" : "suppressed",
        });
        if (result.sent) sent++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        // Release the claim so the next hourly run retries.
        await supabase.from("profiles").update({ welcome_email_sent_at: null }).eq("id", p.id).eq("welcome_email_sent_at", claimedAt);
        await supabase.from("email_send_log").insert({
          template_name: TEMPLATE, recipient_email: email, status: "failed", error_message: message,
        });
      }
    }
    return json({ sent, checked: due?.length ?? 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[FOUNDER-WELCOME]", message);
    return json({ error: message }, 500);
  }
});
