// Access rule for the Chat financial conversation tool (premium).
// Deploy target: supabase/functions/_shared/conversation-tool-access-rule.ts

// Live Stripe ids. A sandbox project sets STRIPE_PREMIUM_PRICE_ID and STRIPE_PREMIUM_PRODUCT_ID
// to its own ids; when they are unset (live), these defaults apply.
export const LIVE_PREMIUM_PRICE_ID = "price_1UTKxlCN8qgG26mrUCWqWllx";
export const LIVE_PREMIUM_PRODUCT_ID = "prod_VFe3hx29MYgCMR";

/** A Stripe id from a function secret, else the live default. Safe outside Deno (tests). */
export const stripeIdFromEnv = (name: string, liveDefault: string): string => {
  const v = (globalThis as any).Deno?.env?.get?.(name) ?? (globalThis as any).process?.env?.[name];
  return typeof v === "string" && v.trim() ? v.trim() : liveDefault;
};

export const premiumPriceId = () => stripeIdFromEnv("STRIPE_PREMIUM_PRICE_ID", LIVE_PREMIUM_PRICE_ID);
export const premiumProductId = () => stripeIdFromEnv("STRIPE_PREMIUM_PRODUCT_ID", LIVE_PREMIUM_PRODUCT_ID);

/** Kept for existing imports: the ids in use for this project (env override, else live). */
export const CONVERSATION_TOOL_SUBSCRIPTION_PRICE_ID = premiumPriceId();
export const CONVERSATION_TOOL_PRODUCT_ID = premiumProductId();
export const PROMO_ACCESS_MONTHS = 12;

export interface AccessRow {
  source?: string | null;
  expires_at: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
}

const future = (iso: string | null | undefined, now: number) =>
  !!iso && new Date(iso).getTime() > now;

/** Promo access: 12 months from now, no renewal. */
export const promoExpiry = (from: Date = new Date()) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + PROMO_ACCESS_MONTHS);
  return d.toISOString();
};

/**
 * Subscription rows: valid while active or trialing, otherwise (cancelled,
 * cancel_at_period_end, past_due, unpaid) only until current_period_end.
 * Promo and older one-off rows: valid until expires_at (null = no end).
 */
export const isActive = (a: AccessRow | null, now: number = Date.now()): boolean => {
  if (!a) return false;
  if (a.subscription_status) {
    if (["active", "trialing"].includes(a.subscription_status)) return true;
    return future(a.current_period_end, now);
  }
  return !a.expires_at || future(a.expires_at, now);
};

/** Stripe basil API moved current_period_end onto subscription items. */
export const periodEndIso = (sub: any): string | null => {
  const secs = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end ?? null;
  return secs ? new Date(secs * 1000).toISOString() : null;
};

/** Row fields mirrored from a Stripe subscription. expires_at mirrors current_period_end. */
export const subscriptionFields = (sub: any) => {
  const end = periodEndIso(sub);
  return {
    source: "subscription",
    stripe_subscription_id: sub.id as string,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
    subscription_status: sub.status as string,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    current_period_end: end,
    expires_at: end,
  };
};

export const isConversationToolSubscription = (sub: any) =>
  sub?.metadata?.collabor8_type === "conversation_tool" ||
  (sub?.items?.data ?? []).some(
    (i: any) =>
      [premiumPriceId(), LIVE_PREMIUM_PRICE_ID].includes(i?.price?.id) ||
      [premiumProductId(), LIVE_PREMIUM_PRODUCT_ID].includes(
        typeof i?.price?.product === "string" ? i.price.product : i?.price?.product?.id,
      ),
  );
