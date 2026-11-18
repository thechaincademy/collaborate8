// Uptime check for Collabor8 safeguarding.
// Point Better Stack or UptimeRobot at:
//   GET https://eycpkzbjylzzynkfggis.supabase.co/functions/v1/safeguarding-health
// Header: apikey: <project anon key>
// Healthy response: HTTP 200 and JSON { "ok": true, "db": "ok", "safeguarding_api": "ok" }.
// The anon key is not a user session. Do not send the service role key.
// Alert email configuration is reported as a boolean only.

import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
  const body = (payload: unknown, status: number) =>
    new Response(JSON.stringify(payload), { status, headers });

  try {
    const supabase = createSupabaseAdmin();
    const db = await supabase.from("app_settings").select("key").limit(1);
    if (db.error) return body({ ok: false, db: "error", safeguarding_api: "unknown" }, 503);

    const api = await supabase.rpc("safeguarding_enabled");
    const functionsOk = !api.error;
    const alertEmailConfigured = Boolean(Deno.env.get("DSL_ALERT_EMAIL"));
    const ok = functionsOk;
    return body({
      ok,
      db: "ok",
      edge: "ok",
      safeguarding_api: functionsOk ? "ok" : "missing",
      alert_email_configured: alertEmailConfigured,
      checked_at: new Date().toISOString(),
    }, ok ? 200 : 503);
  } catch {
    return body({ ok: false, db: "unreachable", edge: "error" }, 503);
  }
});
