import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createSupabaseAdmin } from "../_shared/supabase.ts";

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOKS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response("STRIPE_SECRET_KEY not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createSupabaseAdmin();

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // In dev/test, parse directly
      event = JSON.parse(body) as Stripe.Event;
      logStep("WARNING: No webhook signature verification");
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      // ── Invoice paid → record payment + transfer ──
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        const chargeId = invoice.charge as string;
        const customerId = invoice.customer as string;

        if (!subscriptionId) break;

        // Find our arrangement
        const { data: arrangement } = await supabase
          .from("recurring_payments")
          .select("*")
          .eq("provider_subscription_id", subscriptionId)
          .maybeSingle();

        if (!arrangement) {
          logStep("No arrangement found for subscription", { subscriptionId });
          break;
        }

        const amountPaid = (invoice.amount_paid || 0) / 100;

        // Record payment in ledger
        const idempotencyKey = `inv_${invoice.id}`;
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (!existingPayment) {
          await supabase.from("payments").insert({
            idempotency_key: idempotencyKey,
            payer_id: arrangement.user_id,
            payee_id: arrangement.receiver_id || arrangement.user_id,
            amount: amountPaid,
            currency: invoice.currency?.toUpperCase() || "GBP",
            type: "maintenance",
            status: "completed",
            provider: "stripe",
            provider_charge_id: chargeId,
            related_arrangement_id: arrangement.id,
          });

          logStep("Payment recorded", { amount: amountPaid, arrangementId: arrangement.id });
        }

        // Update next due date
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        await supabase
          .from("recurring_payments")
          .update({
            next_due_date: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("id", arrangement.id);

        // Audit
        await supabase.from("audit_events").insert({
          user_id: arrangement.user_id,
          event_type: "payment_completed",
          entity_type: "payment",
          metadata: { invoiceId: invoice.id, amount: amountPaid, subscriptionId },
        });

        break;
      }

      // ── Invoice payment failed ──
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const { data: arrangement } = await supabase
          .from("recurring_payments")
          .select("*")
          .eq("provider_subscription_id", subscriptionId)
          .maybeSingle();

        if (arrangement) {
          // Record failed payment
          await supabase.from("payments").insert({
            idempotency_key: `inv_fail_${invoice.id}`,
            payer_id: arrangement.user_id,
            payee_id: arrangement.receiver_id || arrangement.user_id,
            amount: (invoice.amount_due || 0) / 100,
            currency: invoice.currency?.toUpperCase() || "GBP",
            type: "maintenance",
            status: "failed",
            provider: "stripe",
            error_message: "Payment failed",
            related_arrangement_id: arrangement.id,
          });

          await supabase.from("audit_events").insert({
            user_id: arrangement.user_id,
            event_type: "payment_failed",
            entity_type: "payment",
            metadata: { invoiceId: invoice.id, subscriptionId },
          });
        }

        break;
      }

      // ── Subscription status changes ──
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: arrangement } = await supabase
          .from("recurring_payments")
          .select("*")
          .eq("provider_subscription_id", subscription.id)
          .maybeSingle();

        if (arrangement) {
          const isActive = ["active", "trialing"].includes(subscription.status);
          await supabase
            .from("recurring_payments")
            .update({
              is_active: isActive,
              next_due_date: isActive
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            })
            .eq("id", arrangement.id);

          logStep("Subscription status updated", {
            subscriptionId: subscription.id,
            status: subscription.status,
          });
        }

        break;
      }

      // ── Dispute created ──
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

        if (chargeId) {
          await supabase
            .from("payments")
            .update({ dispute_status: "open", status: "disputed" })
            .eq("provider_charge_id", chargeId);

          logStep("Dispute recorded", { chargeId, disputeId: dispute.id });
        }

        break;
      }

      // ── Account updated (Connect) ──
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        await supabase
          .from("connected_accounts")
          .update({
            onboarding_status: account.details_submitted ? "complete" : "pending",
            payouts_enabled: account.payouts_enabled || false,
            charges_enabled: account.charges_enabled || false,
          })
          .eq("provider_account_id", account.id);

        logStep("Connected account updated", {
          accountId: account.id,
          detailsSubmitted: account.details_submitted,
        });

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
