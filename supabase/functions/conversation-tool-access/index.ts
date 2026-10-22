import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import {
  CONVERSATION_TOOL_SUBSCRIPTION_PRICE_ID,
  isActive,
  promoExpiry,
  subscriptionFields,
} from "../_shared/conversation-tool-access-rule.ts";

// Promotional codes that grant free access (12 months, no renewal)
const PROMO_CODES = new Set(["4321"]);

const log = (step: string, details?: unknown) =>
  console.log(`[CONVERSATION-TOOL-ACCESS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getStripe = () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
};

const SELECT =
  "source, promo_code, granted_at, expires_at, stripe_subscription_id, stripe_customer_id, subscription_status, current_period_end, cancel_at_period_end";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    const supabase = createSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");

    const readAccess = async () => {
      const { data } = await supabase
        .from("conversation_tool_access")
        .select(SELECT)
        .eq("user_id", user.id)
        .maybeSingle();
      return data ?? null;
    };

    const grant = async (payload: Record<string, unknown>) => {
      const { error } = await supabase
        .from("conversation_tool_access")
        .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    };

    // ── Current access state ──
    if (action === "status") {
      const access = await readAccess();
      if (isActive(access)) return json({ hasAccess: true, access });
      return json({ hasAccess: false, expiredAt: access?.expires_at ?? null });
    }

    // ── Redeem a promotional code ──
    if (action === "redeem-promo") {
      const code = String(body.code ?? "").trim();
      if (!code) return json({ error: "Please enter a promotional code" }, 400);
      if (!PROMO_CODES.has(code.toUpperCase()) && !PROMO_CODES.has(code)) {
        log("Invalid promo", { code });
        return json({ error: "That promotional code is not valid" }, 400);
      }

      await grant({
        source: "promo",
        promo_code: code,
        amount: 0,
        granted_at: new Date().toISOString(),
        expires_at: promoExpiry(),
        subscription_status: null,
        current_period_end: null,
        cancel_at_period_end: null,
      });
      log("Promo redeemed", { userId: user.id });
      return json({ hasAccess: true, source: "promo" });
    }

    // ── Start Stripe Checkout for the yearly subscription ──
    if (action === "create-checkout") {
      const existing = await readAccess();
      if (isActive(existing)) return json({ hasAccess: true, access: existing });

      const origin = req.headers.get("origin") || "https://collaborate8.com";
      const stripe = getStripe();

      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      const customerId = customers.data[0]?.id;
      const metadata = { collabor8_type: "conversation_tool", collabor8_user_id: user.id };

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: [{ price: CONVERSATION_TOOL_SUBSCRIPTION_PRICE_ID, quantity: 1 }],
        metadata,
        subscription_data: { metadata },
        success_url: `${origin}/dashboard?tab=chat&conversation-tool=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard?tab=chat&conversation-tool=cancelled`,
      });

      log("Checkout session created", { sessionId: session.id });
      return json({ url: session.url, sessionId: session.id });
    }

    // ── Confirm a completed Checkout session ──
    if (action === "verify-session") {
      const sessionId = String(body.sessionId ?? "");
      if (!sessionId) return json({ error: "Missing session id" }, 400);

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.metadata?.collabor8_user_id !== user.id) {
        return json({ error: "Session does not belong to this account" }, 403);
      }
      if (session.status !== "complete" || !session.subscription) {
        return json({ hasAccess: false, paymentStatus: session.payment_status });
      }

      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId);
      const fields = subscriptionFields(sub);

      await grant({
        ...fields,
        provider_session_id: session.id,
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? "gbp",
        granted_at: new Date().toISOString(),
      });

      log("Subscription verified", { userId: user.id, sessionId, status: sub.status });
      return json({ hasAccess: isActive(fields), source: "subscription" });
    }

    // ── Stripe customer portal (cancel, change card, invoices) ──
    if (action === "portal") {
      const access = await readAccess();
      if (!access?.stripe_customer_id) return json({ error: "No subscription found" }, 400);
      const origin = req.headers.get("origin") || "https://collaborate8.com";
      const portal = await getStripe().billingPortal.sessions.create({
        customer: access.stripe_customer_id,
        return_url: `${origin}/dashboard?tab=chat`,
      });
      return json({ url: portal.url });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Error", { message });
    const status = message === "Unauthorized" || message.startsWith("Missing authorization") ? 401 : 500;
    return json({ error: message }, status);
  }
});
