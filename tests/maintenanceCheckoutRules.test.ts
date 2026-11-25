import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  BANK_PAYMENT_UNAVAILABLE_REPLY,
  START_DATE_WINDOW,
  checkoutPaymentMethodTypes,
  checkoutReturnUrls,
  coparentReadyReply,
  delayedStartSubscriptionData,
  isBankPaymentUnavailableError,
  maintenanceStartSchedule,
  nextNaturalBillingDate,
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


describe("child maintenance start date is never a trial", () => {
  const now = new Date("2026-11-25T23:40:00.000Z"); // London is on UTC in November

  test("no start date, or a start date of today, bills at once", () => {
    expect(maintenanceStartSchedule(now, undefined, "month")).toEqual({ kind: "immediate" });
    expect(maintenanceStartSchedule(now, "2026-11-25T00:00:00.000Z", "month")).toEqual({ kind: "immediate" });
    expect(maintenanceStartSchedule(now, "2026-11-25T23:59:59.000Z", "month")).toEqual({ kind: "immediate" });
  });

  test("a date in the first payment period becomes a billing cycle anchor, not a trial_end", () => {
    const start = "2026-12-02T00:00:00.000Z";
    const got = maintenanceStartSchedule(now, start, "month");
    expect(got).toEqual({ kind: "delayed", billing_cycle_anchor: Math.floor(Date.parse(start) / 1000) });
    expect(JSON.stringify(got)).not.toContain("trial");
  });

  test("weekly also allows a start at the next natural billing date (7 days)", () => {
    const start = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const got = maintenanceStartSchedule(now, start, "week");
    expect(got.kind).toBe("delayed");
    if (got.kind === "delayed") expect(got.billing_cycle_anchor).toBe(Math.floor(Date.parse(start) / 1000));
  });

  test("too soon (under 48 hours) or after the first payment period is rejected, with no two-year trial window", () => {
    expect(maintenanceStartSchedule(now, "2026-11-27T00:00:00.000Z", "month")).toEqual({ kind: "error", error: START_DATE_WINDOW });
    // 40 days is after the next monthly billing date of 25 Dec 23:40
    expect(maintenanceStartSchedule(now, "2027-01-04T00:00:00.000Z", "month")).toEqual({ kind: "error", error: START_DATE_WINDOW });
    expect(maintenanceStartSchedule(now, "2026-12-04T00:00:00.000Z", "week")).toEqual({ kind: "error", error: START_DATE_WINDOW });
    expect(START_DATE_WINDOW).not.toMatch(/two years|trial|free|—|–|police|victim/i);
  });

  test("exactly the next natural billing date is still accepted", () => {
    const edge = nextNaturalBillingDate(now, "month");
    expect(edge.toISOString()).toBe("2026-12-25T23:40:00.000Z");
    expect(maintenanceStartSchedule(now, edge, "month")).toEqual({ kind: "delayed", billing_cycle_anchor: Math.floor(edge.getTime() / 1000) });
    expect(maintenanceStartSchedule(now, new Date(edge.getTime() + 1000), "month").kind).toBe("error");
  });

  test("an unreadable date is rejected", () => {
    expect(maintenanceStartSchedule(now, "not-a-date", "month")).toEqual({ kind: "error", error: "Invalid start date" });
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

  test("a later start date delays the first charge with billing_cycle_anchor and proration_behavior none, never a trial", () => {
    const src = read("supabase/functions/stripe-subscriptions/index.ts");
    expect(src).toContain("delayedStartSubscriptionData(startSchedule.billing_cycle_anchor)");
    expect(src).toContain("maintenanceStartSchedule(new Date(), startDate, normalizedInterval)");
    expect(src).not.toContain("trial_end");
    expect(src).not.toContain("trial_period_days");
    const fields = delayedStartSubscriptionData(1_798_000_000);
    expect(fields).toEqual({ billing_cycle_anchor: 1_798_000_000, proration_behavior: "none" });
    expect(fields).not.toHaveProperty("trial_end");
  });

  test("Premium checkout is unchanged and can keep its own trial", () => {
    const src = read("supabase/functions/conversation-tool-access/index.ts");
    expect(src).toContain('collabor8_type: "conversation_tool"');
    expect(src).toContain("subscription_data: { metadata }");
    // This function does not set a maintenance start date or a trial itself.
    expect(src).not.toContain("billing_cycle_anchor");
    expect(src).not.toContain("maintenanceStartSchedule");
  });

  test("webhook and status still treat a trialing subscription as confirmed, and also accept active", () => {
    const hooks = read("supabase/functions/stripe-webhooks/index.ts");
    const subs = read("supabase/functions/stripe-subscriptions/index.ts");
    expect(hooks).toContain('["active", "trialing"].includes(subscription.status)');
    expect(subs).toContain('["active", "trialing"].includes(subscription.status)');
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
