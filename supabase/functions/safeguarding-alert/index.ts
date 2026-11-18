import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!service || auth !== `Bearer ${service}`) return json({ error: "Unauthorized" }, 401);

  try {
    const { flag_id } = await req.json().catch(() => ({}));
    if (typeof flag_id !== "string" || !UUID.test(flag_id)) return json({ error: "Invalid id" }, 400);

    const to = Deno.env.get("DSL_ALERT_EMAIL");
    if (!to) {
      console.warn("[safeguarding-alert] DSL_ALERT_EMAIL is not set");
      return json({ sent: false, reason: "missing_recipient" });
    }

    const supabase = createSupabaseAdmin();
    const { data: flag } = await supabase
      .from("safety_flags")
      .select("id, source, status, created_at")
      .eq("id", flag_id)
      .maybeSingle();
    if (!flag) return json({ sent: false, reason: "not_found" });

    const result = await sendTemplateEmail("safeguarding_dsl_alert", to, {
      templateData: { dashboardUrl: "https://collaborate8.com/dsl" },
      idempotencyKey: `safeguarding-flag-${flag.id}`,
    });
    return json({ sent: result.sent });
  } catch (e) {
    console.error("[safeguarding-alert]", (e as Error).message);
    return json({ error: "Failed" }, 500);
  }
});
