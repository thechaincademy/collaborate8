import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { notifySafeguarding, safeguardingSwitchOn } from "../_shared/safeguarding-notify.ts";
import type { AlertKind } from "../_shared/safeguarding-rules.ts";

const UUID = /^[0-9a-f-]{36}$/i;
const KINDS = new Set(["safety_flag", "concern", "monitoring"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!service || auth !== `Bearer ${service}`) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const kind = body.kind as string;
    const parentLow = body.parent_low as string | undefined;
    const parentHigh = body.parent_high as string | undefined;
    const eventId = typeof body.event_id === "string" && UUID.test(body.event_id) ? body.event_id : crypto.randomUUID();
    if (!KINDS.has(kind)) return json({ error: "Invalid kind" }, 400);
    if (kind !== "monitoring" && (!parentLow || !UUID.test(parentLow))) return json({ error: "Invalid pair" }, 400);

    // Server-side switch. While it is off, nothing is sent (notifySafeguarding checks it too).
    if (!(await safeguardingSwitchOn())) return json({ ok: true, skipped: "switch_off" });

    const supabase = createSupabaseAdmin();
    let testAccount = false;
    if (parentLow) {
      const ids = [parentLow, parentHigh].filter((id): id is string => !!id && UUID.test(id));
      const { data } = await supabase.from("profiles").select("is_test_account").in("id", ids);
      testAccount = (data ?? []).some((row) => row.is_test_account === true);
    }

    const result = await notifySafeguarding({
      kind: kind as AlertKind,
      testAccount,
      // One key per alert event, so a second concern from the same family is not deduped away.
      idempotencyKey: `sg-${kind}-${eventId}`,
    });
    return json({ ok: true, email: result.email.sent, sms: result.sms.decision });
  } catch {
    console.error("[safeguarding-alert] failed");
    return json({ error: "Failed" }, 500);
  }
});
