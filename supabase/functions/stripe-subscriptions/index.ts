import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import {
  StripePaymentMethodProvider,
  StripeRecurringProvider,
  StripeDynamicPricing,
} from "../_shared/stripe-adapter.ts";

const paymentMethodProvider = new StripePaymentMethodProvider();
const recurringProvider = new StripeRecurringProvider();
const pricingProvider = new StripeDynamicPricing();

// Collabor8 maintenance product ID
const MAINTENANCE_PRODUCT_ID = "prod_U9HZcihClGUNVA";

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-SUBSCRIPTIONS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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
        `${origin}/dashboard?card-setup=cancelled`
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

    // ── Create subscription ──
    if (action === "create-subscription") {
      const { amount, currency = "gbp", interval = "month", receiverId } = body;
      const normalizedInterval = normalizeInterval(interval);

      if (!amount || !receiverId) {
        return new Response(JSON.stringify({ error: "Missing amount or receiverId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Creating subscription", { amount, currency, interval, normalizedInterval, receiverId });

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

      // Get receiver's connected account
      const { data: connectedAccount } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", receiverId)
        .eq("provider", "stripe")
        .eq("onboarding_status", "complete")
        .maybeSingle();

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

      // Create subscription with optional transfer to connected account
      const subParams: any = {
        customerId,
        priceId,
        metadata: {
          collabor8_payer_id: user.id,
          collabor8_receiver_id: receiverId,
          collabor8_type: "maintenance",
        },
      };

      if (connectedAccount) {
        subParams.transferData = {
          destinationAccountId: connectedAccount.provider_account_id,
        };
        logStep("Transfer data set", { destinationAccountId: connectedAccount.provider_account_id });
      }

      const subscription = await recurringProvider.createSubscription(subParams);
      logStep("Subscription created", { subscriptionId: subscription.subscriptionId });

      // Save arrangement in our DB
      const { data: arrangement, error: arrErr } = await supabase
        .from("recurring_payments")
        .upsert({
          user_id: user.id,
          receiver_id: receiverId,
          amount,
          frequency: interval,
          provider: "stripe",
          provider_subscription_id: subscription.subscriptionId,
          provider_price_id: priceId,
          provider_customer_id: customerId,
          next_due_date: subscription.nextPaymentDate,
          is_active: true,
        }, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (arrErr) {
        logStep("DB upsert failed, inserting fresh", { error: arrErr.message });
        // Try plain insert
        await supabase.from("recurring_payments").insert({
          user_id: user.id,
          receiver_id: receiverId,
          amount,
          frequency: interval,
          provider: "stripe",
          provider_subscription_id: subscription.subscriptionId,
          provider_price_id: priceId,
          provider_customer_id: customerId,
          next_due_date: subscription.nextPaymentDate,
          is_active: true,
        });
      }

      // Audit
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "subscription_created",
        entity_type: "recurring_payment",
        metadata: { subscriptionId: subscription.subscriptionId, amount, currency },
      });

      return new Response(JSON.stringify({ subscription, priceId }), {
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

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
