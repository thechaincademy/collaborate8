// Pure rules for the payer's Stripe Checkout (no Deno or Stripe imports, so bun tests can load it).
//
// The payer picks how to pay inside Collabor8, then goes to Stripe once. "card" also covers
// Apple Pay and Google Pay (wallets ride on card). "bank" is Bacs Direct Debit, the UK bank
// payment that can repeat. Collabor8 never sees or stores card or bank details.

export type PaymentChoice = "card" | "bank";

/** Anything other than "bank" is a card, so older callers that send nothing keep working. */
export function normalizePaymentChoice(value: unknown): PaymentChoice {
  return value === "bank" ? "bank" : "card";
}

export function checkoutPaymentMethodTypes(choice: PaymentChoice): ("card" | "bacs_debit")[] {
  return choice === "bank" ? ["bacs_debit"] : ["card"];
}

/** Stripe refuses a payment method that is not switched on for the account. */
export function isBankPaymentUnavailableError(error: unknown): boolean {
  const e = (error ?? {}) as { message?: string; param?: string; code?: string };
  const text = `${e.message ?? ""} ${e.param ?? ""}`.toLowerCase();
  return text.includes("bacs_debit") && (text.includes("invalid") || text.includes("not") || text.includes("enable") || e.code === "parameter_invalid_enum" || e.code === "payment_method_unactivated");
}

export const BANK_PAYMENT_UNAVAILABLE_REPLY = {
  error: "Paying from a bank account isn't available yet. Please choose card.",
  code: "BANK_PAYMENTS_UNAVAILABLE",
} as const;

export interface CheckoutReturnUrls {
  success_url: string;
  cancel_url: string;
}

/**
 * Where Stripe sends the payer back to. Success always lands on the dashboard, which confirms the
 * session and refreshes the arrangement. Cancel goes back to the screen the payer started from:
 * Manage payments when the web asks for it, otherwise the same places as before.
 */
export function checkoutReturnUrls(origin: string, opts: { returnToMaintenance?: boolean; returnTo?: unknown }): CheckoutReturnUrls {
  const success_url = `${origin}/dashboard?${opts.returnToMaintenance ? "tab=maintenance&" : ""}subscription-checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url = opts.returnTo === "manage-payments"
    ? `${origin}/manage-payments?subscription-checkout=cancelled`
    : opts.returnToMaintenance
      ? `${origin}/dashboard?tab=maintenance`
      : `${origin}/edit-payment?subscription-checkout=cancelled`;
  return { success_url, cancel_url };
}

/**
 * Where Stripe's hosted payout setup sends the receiver back to. The mobile apps send no returnTo and keep
 * the old addresses. The website asks for Manage payments, so the receiver lands on a screen that
 * shows the result. "refresh" is where Stripe sends an expired or reused link: the page makes a new one.
 */
export function onboardingReturnUrls(origin: string, returnTo?: unknown): { refresh: string; return: string } {
  if (returnTo === "manage-payments") {
    return { refresh: `${origin}/manage-payments?stripe=refresh`, return: `${origin}/manage-payments?stripe=return` };
  }
  return { refresh: `${origin}/profile?stripe-refresh=true`, return: `${origin}/profile?stripe-return=true` };
}

/** Stored co-parent payout state, read without calling Stripe and without exposing any account detail. */
export function coparentReadyReply(linked: boolean, row: { onboarding_status?: string | null; charges_enabled?: boolean | null } | null) {
  if (!linked) return { linked: false, ready: false };
  return { linked: true, ready: !!row && (!!row.charges_enabled || row.onboarding_status === "complete") };
}
