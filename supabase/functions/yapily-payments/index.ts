import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { YapilyPaymentProvider } from "../_shared/yapily-adapter.ts";

const provider = new YapilyPaymentProvider();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { action } = body;
    const supabase = createSupabaseAdmin();

    if (action === "create-payment-auth") {
      const {
        institutionId,
        callbackUrl,
        amount,
        currency = "GBP",
        reference,
        payeeName,
        payeeAccountNumber,
        payeeSortCode,
        idempotencyKey,
        payeeId,
        type = "single",
        relatedExpenseId,
        relatedArrangementId,
      } = body;

      if (!institutionId || !callbackUrl || !amount || !payeeName || !payeeAccountNumber || !payeeSortCode || !idempotencyKey) {
        return new Response(JSON.stringify({ error: "Missing required payment fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentParams = {
        idempotencyKey,
        amount,
        currency,
        reference: reference || "Collabor8 Payment",
        payeeName,
        payeeAccountNumber,
        payeeSortCode,
        payerInstitutionId: institutionId,
      };

      const result = await provider.createPaymentAuthorisation(
        user.id,
        institutionId,
        callbackUrl,
        paymentParams
      );

      // Create internal payment record
      await supabase.from("payments").insert({
        idempotency_key: idempotencyKey,
        payer_id: user.id,
        payee_id: payeeId || user.id,
        amount,
        currency,
        type,
        status: "awaiting_authorisation",
        provider_payment_id: result.paymentId,
        provider_consent_token: result.consentToken,
        related_expense_id: relatedExpenseId || null,
        related_arrangement_id: relatedArrangementId || null,
      });

      // Audit
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "payment_auth_created",
        entity_type: "payment",
        metadata: { amount, currency, idempotencyKey, type },
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "execute-payment") {
      const { consentToken, idempotencyKey } = body;

      if (!consentToken || !idempotencyKey) {
        return new Response(JSON.stringify({ error: "Missing consentToken or idempotencyKey" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the payment record
      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .eq("payer_id", user.id)
        .single();

      if (!payment) {
        return new Response(JSON.stringify({ error: "Payment record not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get payee bank details
      const { data: payeeConnection } = await supabase
        .from("bank_connections")
        .select("*")
        .eq("user_id", payment.payee_id)
        .eq("consent_status", "active")
        .limit(1)
        .single();

      // Execute the payment
      const result = await provider.executePayment(consentToken, {
        idempotencyKey,
        amount: payment.amount,
        currency: payment.currency,
        reference: "Collabor8 Payment",
        payeeName: "Collabor8 Payee",
        payeeAccountNumber: payeeConnection?.account_id || "",
        payeeSortCode: payeeConnection?.sort_code || "",
        payerInstitutionId: "",
      });

      // Update payment status
      await supabase
        .from("payments")
        .update({
          status: result.status === "COMPLETED" ? "completed" : "pending",
          provider_payment_id: result.paymentId,
          provider_consent_token: consentToken,
        })
        .eq("idempotency_key", idempotencyKey);

      // Audit
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "payment_executed",
        entity_type: "payment",
        metadata: { paymentId: result.paymentId, status: result.status },
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-status") {
      const { paymentId, consentToken } = body;

      if (!paymentId) {
        return new Response(JSON.stringify({ error: "Missing paymentId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get stored consent token if not provided
      let token = consentToken;
      if (!token) {
        const { data: payment } = await supabase
          .from("payments")
          .select("provider_consent_token")
          .eq("provider_payment_id", paymentId)
          .single();
        token = payment?.provider_consent_token;
      }

      if (!token) {
        return new Response(JSON.stringify({ error: "No consent token available" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const status = await provider.getPaymentStatus(paymentId, token);

      // Update our payment record
      const statusMap: Record<string, string> = {
        COMPLETED: "completed",
        FAILED: "failed",
        PENDING: "pending",
        CANCELLED: "cancelled",
      };

      await supabase
        .from("payments")
        .update({ status: statusMap[status.status] || "pending" })
        .eq("provider_payment_id", paymentId);

      // Audit for final states
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(status.status)) {
        await supabase.from("audit_events").insert({
          user_id: user.id,
          event_type: `payment_${status.status.toLowerCase()}`,
          entity_type: "payment",
          metadata: { paymentId, status: status.status },
        });
      }

      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("yapily-payments error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
