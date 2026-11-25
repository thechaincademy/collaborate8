import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  BANK_PAYMENT_UNAVAILABLE_REPLY,
  checkoutPaymentMethodTypes,
  checkoutReturnUrls,
  coparentReadyReply,
  isBankPaymentUnavailableError,
  normalizePaymentChoice,
  onboardingReturnUrls,
} from "../supabase/functions/_shared/maintenance-checkout-rules";
import { v2RecipientAccountBody } from "../supabase/functions/_shared/stripe-connect-rules";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

describe("payer chooses how to pay", () => {
  test("only 'bank' means bank, everything else (including old callers that send nothing) is card", () => {
    expect(normalizePaymentChoice("bank")).toBe("bank");
    for (const v of ["card", undefined, null, "", "BANK ", 5, "bacs_debit"]) expect(normalizePaymentChoice(v)).toBe("card");
  });

  test("card is card (wallets ride on card), bank is Bacs Direct Debit", () => {
    expect(checkoutPaymentMethodTypes("card")).toEqual(["card"]);
    expect(checkoutPaymentMethodTypes("bank")).toEqual(["bacs_debit"]);
  });

  test("recognises Stripe's 'not switched on' error for Bacs, and nothing else", () => {
    expect(isBankPaymentUnavailableError({ message: "The payment method type provided: bacs_debit is invalid. Please ensure the provided type is activated in your dashboard." })).toBe(true);
    expect(isBankPaymentUnavailableError({ message: "Your card was declined." })).toBe(false);
    expect(isBankPaymentUnavailableError({ message: "No such customer: cus_1" })).toBe(false);
    expect(isBankPaymentUnavailableError(undefined)).toBe(false);
    expect(BANK_PAYMENT_UNAVAILABLE_REPLY.code).toBe("BANK_PAYMENTS_UNAVAILABLE");
    expect(BANK_PAYMENT_UNAVAILABLE_REPLY.error).not.toMatch(/—|–|police|victim/i);
  });

  test("success still lands on the dashboard (which confirms the session); cancel returns to where the payer started", () => {
    const o = "https://collaborate8.com";
    expect(checkoutReturnUrls(o, { returnToMaintenance: true, returnTo: "manage-payments" })).toEqual({
      success_url: `${o}/dashboard?tab=maintenance&subscription-checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${o}/manage-payments?subscription-checkout=cancelled`,
    });
    // Callers that send no returnTo keep the old addresses exactly.
    expect(checkoutReturnUrls(o, { returnToMaintenance: true }).cancel_url).toBe(`${o}/dashboard?tab=maintenance`);
    expect(checkoutReturnUrls(o, {}).cancel_url).toBe(`${o}/edit-payment?subscription-checkout=cancelled`);
    expect(checkoutReturnUrls(o, {}).success_url).toBe(`${o}/dashboard?subscription-checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  });
});

describe("receiver payout setup returns to Manage payments", () => {
  test("website asks for manage-payments, mobile builds (no returnTo) keep /profile", () => {
    const o = "https://collaborate8.com";
    expect(onboardingReturnUrls(o, "manage-payments")).toEqual({ refresh: `${o}/manage-payments?stripe=refresh`, return: `${o}/manage-payments?stripe=return` });
    expect(onboardingReturnUrls(o)).toEqual({ refresh: `${o}/profile?stripe-refresh=true`, return: `${o}/profile?stripe-return=true` });
    expect(onboardingReturnUrls(o, "anything-else").return).toBe(`${o}/profile?stripe-return=true`);
  });

  test("the account is created with the parent's email and name so Stripe does not ask again; never phone or bank", () => {
    const withName = v2RecipientAccountBody("a@b.co", {}, { givenName: " Sam ", surname: "Lee" });
    expect(withName.identity).toEqual({ country: "gb", entity_type: "individual", individual: { email: "a@b.co", given_name: "Sam", surname: "Lee" } });
    const emailOnly = v2RecipientAccountBody("a@b.co", {}, { givenName: null, surname: "" });
    expect(emailOnly.identity.individual).toEqual({ email: "a@b.co" });
    const json = JSON.stringify(withName);
    for (const k of ["phone", "external_account", "account_number", "sort_code", "dob"]) expect(json).not.toContain(k);
    expect(v2RecipientAccountBody("a@b.co").identity).toEqual({ country: "gb", entity_type: "individual" });
  });

  test("coparent-status says only linked and ready, nothing about the account", () => {
    expect(coparentReadyReply(false, null)).toEqual({ linked: false, ready: false });
    expect(coparentReadyReply(true, null)).toEqual({ linked: true, ready: false });
    expect(coparentReadyReply(true, { onboarding_status: "pending", charges_enabled: false })).toEqual({ linked: true, ready: false });
    expect(coparentReadyReply(true, { onboarding_status: "complete", charges_enabled: false })).toEqual({ linked: true, ready: true });
    expect(coparentReadyReply(true, { onboarding_status: "pending", charges_enabled: true })).toEqual({ linked: true, ready: true });
  });
});

describe("function wiring", () => {
  test("stripe-subscriptions passes the choice to Checkout and keeps destination transfers", () => {
    const src = read("supabase/functions/stripe-subscriptions/index.ts");
    expect(src).toContain("checkoutPaymentMethodTypes(paymentChoice)");
    expect(src).toContain("normalizePaymentChoice(body.paymentMethod)");
    expect(src).toContain("transfer_data");
    expect(src).not.toContain('payment_method_types: ["card"],\n        line_items');
  });

  test("a future start date is sent as trial_end only: Stripe rejects proration_behavior without a billing cycle anchor", () => {
    const src = read("supabase/functions/stripe-subscriptions/index.ts");
    expect(src).toContain("...(trialEnd ? { trial_end: trialEnd } : {})");
    expect(src).not.toMatch(/proration_behavior\s*:/);
  });

  test("stripe-connect adds coparent-status and the web return addresses, reply contract untouched", () => {
    const src = read("supabase/functions/stripe-connect/index.ts");
    expect(src).toContain('action === "coparent-status"');
    expect(src).toContain("onboardingReturnUrls(origin, body.returnTo)");
    expect(src).toContain("createAccountReply(onboardingUrl, accountId)");
    // Name for prefill is read but never written to a log line.
    expect(src).not.toMatch(/logStep\([^)]*(first_name|last_name|givenName|surname)/);
  });
});
