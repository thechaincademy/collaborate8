import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendCoparentReminder } from "../_shared/send-reminder.ts";

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOKS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

/** Extract subscription ID from invoice - handles both old and new Stripe API formats */
function extractSubscriptionId(invoice: any): string | null {
  // New API (2025+): parent.subscription_details.subscription
  if (invoice.parent?.subscription_details?.subscription) {
    return invoice.parent.subscription_details.subscription;
  }
  // Legacy: top-level subscription field
  if (invoice.subscription) {
    return invoice.subscription as string;
  }
  return null;
}

/** Extract charge ID from invoice - handles both old and new API formats */
function extractChargeId(invoice: any): string | null {
  return (invoice.charge as string) || null;
}

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

    // Try both webhook secrets: platform (invoices, subscriptions) and connected accounts
    const platformSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_PLATFORM");
    const connectSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (sig && (platformSecret || connectSecret)) {
      let verified = false;
      for (const secret of [platformSecret, connectSecret].filter(Boolean)) {
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, secret!);
          verified = true;
          break;
        } catch {
          // Try next secret
        }
      }
      if (!verified) {
        logStep("ERROR: Signature verification failed with all secrets");
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } else {
      event = JSON.parse(body) as Stripe.Event;
      logStep("WARNING: No webhook signature verification");
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      // ── Invoice paid → record payment ──
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = extractSubscriptionId(invoice);
        const chargeId = extractChargeId(invoice);

        logStep("Invoice details", {
          invoiceId: invoice.id,
          subscriptionId,
          chargeId,
          amountPaid: invoice.amount_paid,
        });

        if (!subscriptionId) {
          logStep("No subscription ID found in invoice, skipping");
          break;
        }

        // Find our arrangement
        const { data: arrangement, error: arrError } = await supabase
          .from("recurring_payments")
          .select("*")
          .eq("provider_subscription_id", subscriptionId)
          .maybeSingle();

        if (arrError) {
          logStep("Error fetching arrangement", { error: arrError.message });
          break;
        }

        if (!arrangement) {
          logStep("No arrangement found for subscription", { subscriptionId });
          break;
        }

        const amountPaid = (invoice.amount_paid || 0) / 100;

        // Record payment in ledger (idempotent)
        const idempotencyKey = `inv_${invoice.id}`;
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (!existingPayment) {
          const { error: insertError } = await supabase.from("payments").insert({
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

          if (insertError) {
            logStep("Error inserting payment", { error: insertError.message });
          } else {
            logStep("Payment recorded", { amount: amountPaid, arrangementId: arrangement.id });
          }
        } else {
          logStep("Payment already exists, skipping", { idempotencyKey });
        }

        // Update next due date
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await supabase
            .from("recurring_payments")
            .update({
              next_due_date: new Date(sub.current_period_end * 1000).toISOString(),
            })
            .eq("id", arrangement.id);
        } catch (e) {
          logStep("Error updating next due date", { error: String(e) });
        }

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
        const invoice = event.data.object as any;
        const subscriptionId = extractSubscriptionId(invoice);

        if (!subscriptionId) break;

        const { data: arrangement } = await supabase
          .from("recurring_payments")
          .select("*")
          .eq("provider_subscription_id", subscriptionId)
          .maybeSingle();

        if (arrangement) {
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
              next_due_date: isActive ? new Date(subscription.current_period_end * 1000).toISOString() : null,
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
        const capabilitiesActive = account.charges_enabled || false || account.payouts_enabled || false;
        const newStatus =
          account.details_submitted && capabilitiesActive
            ? "complete"
            : account.details_submitted
              ? "pending_capabilities"
              : "pending";

        // Load prior state to detect transition to fully-ready
        const { data: prior } = await supabase
          .from("connected_accounts")
          .select("id, user_id, charges_enabled, payouts_enabled")
          .eq("provider_account_id", account.id)
          .maybeSingle();

        await supabase
          .from("connected_accounts")
          .update({
            onboarding_status: newStatus,
            payouts_enabled: account.payouts_enabled || false,
            charges_enabled: account.charges_enabled || false,
          })
          .eq("provider_account_id", account.id);

        const wasReady = !!(prior?.charges_enabled && prior?.payouts_enabled);
        const isReady = !!(account.charges_enabled && account.payouts_enabled);
        if (prior && !wasReady && isReady) {
          // Receiver just became fully ready → remind linked payer to send payments
          const { data: payerProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("coparent_id", prior.user_id)
            .maybeSingle();
          if (payerProfile) {
            await sendCoparentReminder(payerProfile.id, prior.user_id, "send_payment");
            logStep("Sent 'send_payment' reminder to payer", { payerId: payerProfile.id });
          }
        }

        logStep("Connected account updated via webhook", {
          accountId: account.id,
          newStatus,
        });

        break;
      }

      // ── Payer added a payment method → remind receiver to connect bank ──
      case "setup_intent.succeeded":
      case "payment_method.attached": {
        const obj = event.data.object as any;
        const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
        if (!customerId) break;

        // Find the payer profile via profiles.stripe_customer_id, fallback via recurring_payments
        let payerId: string | null = null;
        const { data: byRecurring } = await supabase
          .from("recurring_payments")
          .select("user_id")
          .eq("provider_customer_id", customerId)
          .limit(1)
          .maybeSingle();
        if (byRecurring?.user_id) payerId = byRecurring.user_id;

        if (!payerId) {
          logStep("No payer resolved for customer", { customerId });
          break;
        }

        const { data: payerProfile } = await supabase
          .from("profiles")
          .select("id, coparent_id")
          .eq("id", payerId)
          .maybeSingle();

        if (payerProfile?.coparent_id) {
          // Check receiver readiness — only remind if bank not yet ready
          const { data: receiverAcc } = await supabase
            .from("connected_accounts")
            .select("charges_enabled, payouts_enabled")
            .eq("user_id", payerProfile.coparent_id)
            .maybeSingle();
          const ready = !!(receiverAcc?.charges_enabled && receiverAcc?.payouts_enabled);
          if (!ready) {
            await sendCoparentReminder(payerProfile.coparent_id, payerProfile.id, "setup_bank_account");
            logStep("Sent 'setup_bank_account' reminder to receiver", { receiverId: payerProfile.coparent_id });
          }
        }

        break;
      }

      // ── Checkout Session completed (new hosted-checkout subscription flow) ──
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription" || !session.subscription) {
          logStep("Ignoring non-subscription checkout session", { id: session.id, mode: session.mode });
          break;
        }

        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;

        // Retrieve full subscription with metadata + item price
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"],
        });

        const meta = subscription.metadata || {};
        const payerId = meta.collabor8_payer_id;
        const receiverId = meta.collabor8_receiver_id;
        const dbFrequency = meta.collabor8_db_frequency as "daily" | "weekly" | "monthly" | undefined;
        const amount = meta.collabor8_amount ? parseFloat(meta.collabor8_amount) : null;

        if (!payerId || !receiverId || !dbFrequency || amount === null) {
          logStep("Checkout session missing collabor8 metadata; skipping arrangement insert", {
            sessionId: session.id,
            subscriptionId,
          });
          break;
        }

        // Idempotency: don't re-insert if arrangement already exists for this subscription
        const { data: existing } = await supabase
          .from("recurring_payments")
          .select("id")
          .eq("provider_subscription_id", subscriptionId)
          .maybeSingle();

        if (existing) {
          logStep("Arrangement already exists for subscription", { subscriptionId, arrangementId: existing.id });
          break;
        }

        // Deactivate prior active Stripe arrangements for this payer
        await supabase
          .from("recurring_payments")
          .update({ is_active: false })
          .eq("user_id", payerId)
          .eq("provider", "stripe")
          .eq("is_active", true);

        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const nextDue = new Date(
          (subscription.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000,
        ).toISOString();

        const { data: arrangement, error: arrErr } = await supabase
          .from("recurring_payments")
          .insert({
            user_id: payerId,
            receiver_id: receiverId,
            amount,
            frequency: dbFrequency,
            provider: "stripe",
            provider_subscription_id: subscriptionId,
            provider_price_id: priceId,
            provider_customer_id: customerId,
            next_due_date: nextDue,
            is_active: true,
          })
          .select()
          .single();

        if (arrErr) {
          logStep("Failed to insert arrangement from checkout.session.completed", { error: arrErr.message });
          break;
        }

        await supabase.from("audit_events").insert({
          user_id: payerId,
          event_type: "subscription_created",
          entity_type: "recurring_payment",
          metadata: {
            subscriptionId,
            checkoutSessionId: session.id,
            amount,
            source: "hosted_checkout",
          },
        });

        logStep("Arrangement created from hosted checkout", {
          arrangementId: arrangement.id,
          subscriptionId,
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
