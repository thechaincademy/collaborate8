import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";

// Webhook endpoint - no JWT verification required
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = createSupabaseAdmin();

    console.log("Yapily webhook received:", JSON.stringify(body));

    const eventType = body.eventType || body.event;
    const paymentId = body.paymentId || body.data?.paymentId;
    const status = body.paymentStatus || body.data?.status;

    if (!paymentId) {
      return new Response(JSON.stringify({ received: true, skipped: "no paymentId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Yapily status to internal status
    const statusMap: Record<string, string> = {
      COMPLETED: "completed",
      FAILED: "failed",
      PENDING: "pending",
      CANCELLED: "cancelled",
      DECLINED: "failed",
    };

    const internalStatus = statusMap[status] || "pending";

    // Update payment record
    const { data: payment } = await supabase
      .from("payments")
      .update({ status: internalStatus })
      .eq("provider_payment_id", paymentId)
      .select("id, payer_id, status")
      .single();

    if (payment) {
      // Audit event
      await supabase.from("audit_events").insert({
        user_id: payment.payer_id,
        event_type: `payment_webhook_${internalStatus}`,
        entity_type: "payment",
        entity_id: payment.id,
        metadata: { providerPaymentId: paymentId, webhookEvent: eventType, status },
      });
    }

    return new Response(JSON.stringify({ received: true, processed: !!payment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 to prevent retries for malformed payloads
    return new Response(JSON.stringify({ received: true, error: "processing failed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
