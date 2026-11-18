import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Manual-transfer reminders have stopped (Stripe only). This function must not
// read coparent_bank_accounts or bank_connections, and it must not send email.
// Payment due reminders are created by payment-due-reminders / create_due_tomorrow_notifications.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  return new Response(JSON.stringify({ ok: true, sent: 0, stopped: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
