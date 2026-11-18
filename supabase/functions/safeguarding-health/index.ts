// Uptime check for Collabor8.
// GET https://eycpkzbjylzzynkfggis.supabase.co/functions/v1/safeguarding-health
// Header: apikey: <project anon key>
// Healthy: HTTP 200 and { "ok": true, "db": "ok" }.
// A failed check sends one monitoring alert at most every 6 hours.

import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { notifySafeguarding } from "../_shared/safeguarding-notify.ts";
import { cfg } from "../_shared/config.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
  const body = (payload: unknown, status: number) =>
    new Response(JSON.stringify(payload), { status, headers });

  try {
    const supabase = createSupabaseAdmin();
    const db = await supabase.from("app_settings").select("key").limit(1);
    if (db.error) {
      await maybeAlert(supabase);
      return body({ ok: false, db: "error" }, 503);
    }
    return body({
      ok: true,
      db: "ok",
      edge: "ok",
      alert_email_configured: Boolean(cfg("DSL_ALERT_EMAIL")),
      checked_at: new Date().toISOString(),
    }, 200);
  } catch {
    return body({ ok: false, db: "unreachable", edge: "error" }, 503);
  }
});

async function maybeAlert(supabase: ReturnType<typeof createSupabaseAdmin>) {
  const claim = await supabase.rpc("sg_claim_monitor_alert");
  if (claim.error || claim.data !== true) return;
  await notifySafeguarding({
    kind: "monitoring",
    testAccount: false,
    idempotencyKey: `sg-monitoring-${Date.now()}`,
  });
}
