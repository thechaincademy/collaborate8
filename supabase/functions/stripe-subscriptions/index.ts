import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import {
  StripePaymentMethodProvider,
  StripeRecurringProvider,
  StripeDynamicPricing,
  StripePayoutProvider,
} from "../_shared/stripe-adapter.ts";

const paymentMethodProvider = new StripePaymentMethodProvider();
const recurringProvider = new StripeRecurringProvider();
const pricingProvider = new StripeDynamicPricing();
const payoutProvider = new StripePayoutProvider();

// Collabor8 maintenance product ID
const MAINTENANCE_PRODUCT_ID = "prod_U9HZcihClGUNVA";

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-SUBSCRIPTIONS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const getStripe = () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
};

const normalizeInterval = (interval?: string): "day" | "week" | "month" | "year" => {
  switch ((interval || "month").toLowerCase()) {
    case "daily":
    case "day":
      return "day";
    case "weekly":
    case "week":
      return "week";
    case "monthly":
    case "month":
      return "month";
    case "yearly":
    case "annual":
    case "year":
      return "year";
    default:
      return "month";
  }
};

const toDbFrequency = (interval: "day" | "week" | "month" | "year"): "daily" | "weekly" | "monthly" | null => {
  switch (interval) {
    case "day":
      return "daily";
    case "week":
      return "weekly";
    case "month":
      return "monthly";
    default:
      return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { action } = body;
    const supabase = createSupabaseAdmin();

    logStep("Action received", { action, userId: user.id });

    // ── Setup: add card via Checkout ──
    if (action === "setup-card") {
      const customerId = await paymentMethodProvider.getOrCreateCustomer(user.id, user.email!);
      const origin = req.headers.get("origin") || "https://collabor8.lovable.app";
      const url = await paymentMethodProvider.createSetupSession(
        customerId,
        `${origin}/dashboard?card-setup=success`,
        `${origin}/dashboard?card-setup=cancelled`,
      );

      logStep("Setup session created", { customerId });

      return new Response(JSON.stringify({ url, customerId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── List payment methods ──
    if (action === "list-cards") {
      const customerId = await paymentMethodProvider.getOrCreateCustomer(user.id, user.email!);
      const cards = await paymentMethodProvider.listPaymentMethods(customerId);

      return new Response(JSON.stringify({ cards, customerId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create subscription via hosted Checkout (Apple Pay / Google Pay / card) ──
    if (action === "create-subscription-checkout") {
      const { amount, currency = "gbp", interval = "month", receiverId } = body;
      const normalizedInterval = normalizeInterval(interval);
      const dbFrequency = toDbFrequency(normalizedInterval);

      if (!amount || !receiverId) {
        return new Response(JSON.stringify({ error: "Missing amount or receiverId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!dbFrequency) {
        return new Response(JSON.stringify({ error: "Unsupported interval for recurring payments" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Creating subscription checkout", { amount, currency, normalizedInterval, receiverId });

      const customerId = await paymentMethodProvider.getOrCreateCustomer(user.id, user.email!);

      // Verify receiver Connect account is ready
      const { data: connectedAccount } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", receiverId)
        .eq("provider", "stripe")
        .maybeSingle();

      if (!connectedAccount) {
        return new Response(
          JSON.stringify({
            error: "The receiving co-parent has not completed their payment setup.",
            code: "RECEIVER_NOT_ONBOARDED",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!connectedAccount.charges_enabled) {
        const liveStatus = await payoutProvider.getAccountStatus(connectedAccount.provider_account_id);
        if (!liveStatus.chargesEnabled) {
          return new Response(
            JSON.stringify({
              error: "The receiving co-parent's payment account is still being verified by Stripe.",
              code: "RECEIVER_CAPABILITIES_PENDING",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        await supabase
          .from("connected_accounts")
          .update({
            onboarding_status: "complete",
            charges_enabled: liveStatus.chargesEnabled,
            payouts_enabled: liveStatus.payoutsEnabled,
          })
          .eq("id", connectedAccount.id);
      }

      // Create dynamic price
      const amountInPence = Math.round(amount * 100);
      const priceId = await pricingProvider.createPrice({
        amount: amountInPence,
        currency,
        interval: normalizedInterval,
        productId: MAINTENANCE_PRODUCT_ID,
        metadata: { payer_id: user.id, receiver_id: receiverId },
      });

      const origin = req.headers.get("origin") || "https://collabor8.lovable.app";
      const stripe = getStripe();

      // Hosted Checkout in subscription mode. `payment_method_types: ["card"]`
      // includes Apple Pay + Google Pay automatically (wallets ride on card).
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          transfer_data: {
            destination: connectedAccount.provider_account_id,
          },
          metadata: {
            collabor8_payer_id: user.id,
            collabor8_receiver_id: receiverId,
            collabor8_type: "maintenance",
            collabor8_db_frequency: dbFrequency,
            collabor8_amount: String(amount),
          },
        },
        success_url: `${origin}/dashboard?subscription-checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/edit-payment?subscription-checkout=cancelled`,
      });

      logStep("Checkout session created", { sessionId: session.id, priceId });

      return new Response(JSON.stringify({ url: session.url, sessionId: session.id, priceId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create subscription (legacy: uses saved card off-session) ──
    if (action === "create-subscription") {
      const { amount, currency = "gbp", interval = "month", receiverId } = body;
      const normalizedInterval = normalizeInterval(interval);
      const dbFrequency = toDbFrequency(normalizedInterval);

      if (!amount || !receiverId) {
        return new Response(JSON.stringify({ error: "Missing amount or receiverId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!dbFrequency) {
        return new Response(JSON.stringify({ error: "Unsupported interval for recurring payments" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Creating subscription", { amount, currency, interval, normalizedInterval, dbFrequency, receiverId });

      // Get payer's Stripe customer
      const customerId = await paymentMethodProvider.getOrCreateCustomer(user.id, user.email!);

      // Check payer has a payment method
      const cards = await paymentMethodProvider.listPaymentMethods(customerId);
      if (cards.length === 0) {
        return new Response(JSON.stringify({ error: "No payment method on file. Please add a card first." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get receiver's connected account - REQUIRED for transfers
      const { data: connectedAccount } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", receiverId)
        .eq("provider", "stripe")
        .maybeSingle();

      if (!connectedAccount) {
        return new Response(
          JSON.stringify({
            error:
              "The receiving co-parent has not completed their payment setup. They need to complete Stripe Connect onboarding before you can set up recurring payments.",
            code: "RECEIVER_NOT_ONBOARDED",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Verify the account actually has transfers capability enabled
      if (!connectedAccount.charges_enabled) {
        // Re-check status from Stripe in case it was recently activated
        const liveStatus = await payoutProvider.getAccountStatus(connectedAccount.provider_account_id);
        logStep("Re-checked receiver account status", liveStatus);

        if (!liveStatus.chargesEnabled) {
          return new Response(
            JSON.stringify({
              error:
                "The receiving co-parent's payment account is still being verified by Stripe. Their account capabilities (transfers) are not yet active. Please try again in a few minutes.",
              code: "RECEIVER_CAPABILITIES_PENDING",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Update DB since capabilities are now active
        await supabase
          .from("connected_accounts")
          .update({
            onboarding_status: "complete",
            charges_enabled: liveStatus.chargesEnabled,
            payouts_enabled: liveStatus.payoutsEnabled,
          })
          .eq("id", connectedAccount.id);
      }

      // Create a dynamic price for the custom amount
      const amountInPence = Math.round(amount * 100);
      const priceId = await pricingProvider.createPrice({
        amount: amountInPence,
        currency,
        interval: normalizedInterval,
        productId: MAINTENANCE_PRODUCT_ID,
        metadata: { payer_id: user.id, receiver_id: receiverId },
      });

      logStep("Dynamic price created", { priceId, amountInPence });

      // Create subscription with transfer to connected account (always set since we validated above)
      const subParams: any = {
        customerId,
        priceId,
        metadata: {
          collabor8_payer_id: user.id,
          collabor8_receiver_id: receiverId,
          collabor8_type: "maintenance",
        },
        transferData: {
          destinationAccountId: connectedAccount.provider_account_id,
        },
      };

      logStep("Transfer data set", { destinationAccountId: connectedAccount.provider_account_id });

      const subscription = await recurringProvider.createSubscription(subParams);
      logStep("Subscription created", { subscriptionId: subscription.subscriptionId });

      // Deactivate prior Stripe arrangements for this payer
      const { error: deactivateErr } = await supabase
        .from("recurring_payments")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("provider", "stripe")
        .eq("is_active", true);

      if (deactivateErr) {
        logStep("Failed to deactivate prior Stripe arrangements", { error: deactivateErr.message });
      }

      // Save arrangement in our DB
      const { data: arrangement, error: arrErr } = await supabase
        .from("recurring_payments")
        .insert({
          user_id: user.id,
          receiver_id: receiverId,
          amount,
          frequency: dbFrequency,
          provider: "stripe",
          provider_subscription_id: subscription.subscriptionId,
          provider_price_id: priceId,
          provider_customer_id: customerId,
          next_due_date: subscription.nextPaymentDate,
          is_active: true,
        })
        .select()
        .single();

      if (arrErr) {
        logStep("Recurring arrangement insert failed", { error: arrErr.message });
        throw new Error(`Failed to save recurring arrangement: ${arrErr.message}`);
      }

      // Audit
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "subscription_created",
        entity_type: "recurring_payment",
        metadata: { subscriptionId: subscription.subscriptionId, amount, currency },
      });

      return new Response(JSON.stringify({ subscription, priceId, arrangementId: arrangement.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Cancel subscription ──
    if (action === "cancel-subscription") {
      const { subscriptionId } = body;
      if (!subscriptionId) {
        return new Response(JSON.stringify({ error: "Missing subscriptionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await recurringProvider.cancelSubscription(subscriptionId);

      // Update DB
      await supabase
        .from("recurring_payments")
        .update({ is_active: false })
        .eq("provider_subscription_id", subscriptionId)
        .eq("user_id", user.id);

      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "subscription_cancelled",
        entity_type: "recurring_payment",
        metadata: { subscriptionId },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get subscription status ──
    if (action === "get-status") {
      const { subscriptionId } = body;
      if (!subscriptionId) {
        return new Response(JSON.stringify({ error: "Missing subscriptionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const status = await recurringProvider.getSubscriptionStatus(subscriptionId);
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Recreate subscription (fix missing transfer_data) ──
    if (action === "recreate-subscription") {
      const { arrangementId } = body;
      if (!arrangementId) {
        return new Response(JSON.stringify({ error: "Missing arrangementId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the existing arrangement
      const { data: arrangement } = await supabase
        .from("recurring_payments")
        .select("*")
        .eq("id", arrangementId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!arrangement) {
        return new Response(JSON.stringify({ error: "Active arrangement not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!arrangement.receiver_id) {
        return new Response(JSON.stringify({ error: "No receiver set on arrangement" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check receiver has connected account
      const { data: receiverAccount } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", arrangement.receiver_id)
        .eq("provider", "stripe")
        .eq("onboarding_status", "complete")
        .maybeSingle();

      if (!receiverAccount) {
        return new Response(
          JSON.stringify({
            error: "Receiver has not completed Stripe Connect onboarding",
            code: "RECEIVER_NOT_ONBOARDED",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Cancel old subscription in Stripe
      if (arrangement.provider_subscription_id) {
        try {
          await recurringProvider.cancelSubscription(arrangement.provider_subscription_id);
          logStep("Old subscription cancelled", { subscriptionId: arrangement.provider_subscription_id });
        } catch (e) {
          logStep("Warning: failed to cancel old subscription", { error: String(e) });
        }
      }

      // Create new price + subscription with transfer_data
      const amountInPence = Math.round(arrangement.amount * 100);
      const normalizedInterval = normalizeInterval(arrangement.frequency);

      const priceId = await pricingProvider.createPrice({
        amount: amountInPence,
        currency: "gbp",
        interval: normalizedInterval,
        productId: MAINTENANCE_PRODUCT_ID,
        metadata: { payer_id: user.id, receiver_id: arrangement.receiver_id },
      });

      const customerId =
        arrangement.provider_customer_id || (await paymentMethodProvider.getOrCreateCustomer(user.id, user.email!));

      const subscription = await recurringProvider.createSubscription({
        customerId,
        priceId,
        metadata: {
          collabor8_payer_id: user.id,
          collabor8_receiver_id: arrangement.receiver_id,
          collabor8_type: "maintenance",
        },
        transferData: {
          destinationAccountId: receiverAccount.provider_account_id,
        },
      });

      logStep("Recreated subscription with transfer_data", {
        subscriptionId: subscription.subscriptionId,
        destination: receiverAccount.provider_account_id,
      });

      // Update arrangement record
      await supabase
        .from("recurring_payments")
        .update({
          provider_subscription_id: subscription.subscriptionId,
          provider_price_id: priceId,
          provider_customer_id: customerId,
          next_due_date: subscription.nextPaymentDate,
        })
        .eq("id", arrangement.id);

      // Audit
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "subscription_recreated",
        entity_type: "recurring_payment",
        metadata: {
          oldSubscriptionId: arrangement.provider_subscription_id,
          newSubscriptionId: subscription.subscriptionId,
          destination: receiverAccount.provider_account_id,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          subscription,
          priceId,
          arrangementId: arrangement.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Sync checkout session (fallback when webhook does not fire) ──
    if (action === "sync-checkout-session") {
      const { sessionId } = body;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing sessionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "subscription.items.data.price", "subscription.latest_invoice"],
      });

      if (session.mode !== "subscription" || !session.subscription) {
        return new Response(JSON.stringify({ error: "Not a subscription checkout session" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription, {
              expand: ["items.data.price", "latest_invoice"],
            })
          : (session.subscription as Stripe.Subscription);

      const meta = subscription.metadata || {};
      const payerId = meta.collabor8_payer_id;
      const receiverId = meta.collabor8_receiver_id;
      const dbFrequency = meta.collabor8_db_frequency as "daily" | "weekly" | "monthly" | undefined;
      const amount = meta.collabor8_amount ? parseFloat(meta.collabor8_amount) : null;

      if (!payerId || payerId !== user.id) {
        return new Response(JSON.stringify({ error: "Session does not belong to this user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!receiverId || !dbFrequency || amount === null) {
        return new Response(JSON.stringify({ error: "Session metadata incomplete" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("recurring_payments")
        .select("id")
        .eq("provider_subscription_id", subscription.id)
        .maybeSingle();

      let arrangementId = existing?.id as string | undefined;

      if (!arrangementId) {
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

        const { data: inserted, error: insErr } = await supabase
          .from("recurring_payments")
          .insert({
            user_id: payerId,
            receiver_id: receiverId,
            amount,
            frequency: dbFrequency,
            provider: "stripe",
            provider_subscription_id: subscription.id,
            provider_price_id: priceId,
            provider_customer_id: customerId,
            next_due_date: nextDue,
            is_active: true,
          })
          .select()
          .single();

        if (insErr) {
          return new Response(JSON.stringify({ error: `Insert failed: ${insErr.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        arrangementId = inserted.id;
      }

      // Backfill the first paid invoice if not already recorded
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
      if (latestInvoice && (latestInvoice.status === "paid" || latestInvoice.amount_paid > 0)) {
        const idempotencyKey = `inv_${latestInvoice.id}`;
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (!existingPayment) {
          await supabase.from("payments").insert({
            idempotency_key: idempotencyKey,
            payer_id: payerId,
            payee_id: receiverId,
            amount: (latestInvoice.amount_paid || 0) / 100,
            currency: (latestInvoice.currency || "gbp").toUpperCase(),
            type: "maintenance",
            status: "completed",
            provider: "stripe",
            related_arrangement_id: arrangementId,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, arrangementId, subscriptionId: subscription.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const { logStripeError } = await import("../_shared/stripe-errors.ts");
    const details = logStripeError("STRIPE-SUBSCRIPTIONS", "handler", error);
    return new Response(
      JSON.stringify({
        error: details.message || "Internal error",
        stripe: {
          type: details.type,
          code: details.code,
          decline_code: details.decline_code,
          param: details.param,
          requestId: details.requestId,
          doc_url: details.doc_url,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
