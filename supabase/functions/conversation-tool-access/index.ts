import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";

// Live one-off price for 12 months access to the Self-Guided Financial Conversation Tool (£59.88)
const CONVERSATION_TOOL_PRICE_ID = "price_1UTKhnCN8qgG26mr19HPkqlG";
const ACCESS_MONTHS = 12;

const expiryFromNow = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + ACCESS_MONTHS);
  return d.toISOString();
};

const isActive = (a: { expires_at: string | null } | null) =>
  !!a && (!a.expires_at || new Date(a.expires_at).getTime() > Date.now());

// Promotional codes that grant free access
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
        .select("source, promo_code, granted_at, expires_at")
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

      await grant({ source: "promo", promo_code: code, amount: 0, granted_at: new Date().toISOString(), expires_at: expiryFromNow() });
      log("Promo redeemed", { userId: user.id });
      return json({ hasAccess: true, source: "promo" });
    }

    // ── Start Stripe Checkout for the one-off payment ──
    if (action === "create-checkout") {
      const existing = await readAccess();
      if (isActive(existing)) return json({ hasAccess: true, access: existing });

      const origin = req.headers.get("origin") || "https://collaborate8.com";
      const stripe = getStripe();

      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      const customerId = customers.data[0]?.id;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        payment_method_types: ["card"],
        line_items: [{ price: CONVERSATION_TOOL_PRICE_ID, quantity: 1 }],
        metadata: {
          collabor8_type: "conversation_tool",
          collabor8_user_id: user.id,
        },
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
      if (session.payment_status !== "paid") {
        return json({ hasAccess: false, paymentStatus: session.payment_status });
      }

      await grant({
        source: "payment",
        provider_session_id: session.id,
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? "gbp",
        granted_at: new Date().toISOString(),
        expires_at: expiryFromNow(),
      });

      log("Payment verified", { userId: user.id, sessionId });
      return json({ hasAccess: true, source: "payment" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Error", { message });
    const status = message === "Unauthorized" || message.startsWith("Missing authorization") ? 401 : 500;
    return json({ error: message }, status);
  }
});
