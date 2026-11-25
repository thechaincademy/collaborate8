import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  NOT_CREATED_REPLY,
  STRIPE_V2_API_VERSION,
  checkStatusReply,
  createAccountReply,
  existingAccountAction,
  isLegacyV1Account,
  onboardingStatus,
  payoutStatusFromAccount,
  v2OnboardingLinkBody,
  storedCheckStatusReply,
  v2RecipientAccountBody,
} from "../supabase/functions/_shared/stripe-connect-rules";
import { isMissingStripeAccountError } from "../supabase/functions/_shared/stripe-errors";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

describe("stripe-connect reply contract (mobile builds 31 to 34)", () => {
  test("create-account replies with exactly { url, accountId }", () => {
    const r = createAccountReply("https://connect.stripe.com/setup/e/acct_x/abc", "acct_x");
    expect(Object.keys(r).sort()).toEqual(["accountId", "url"]);
    expect(r).toEqual({ url: "https://connect.stripe.com/setup/e/acct_x/abc", accountId: "acct_x" });
  });

  test("check-status with no account replies with exactly { status: 'not_created' }", () => {
    expect(NOT_CREATED_REPLY).toEqual({ status: "not_created" });
  });

  test("check-status replies with exactly status, payoutsEnabled, chargesEnabled, accountId, detailsSubmitted", () => {
    const s = { accountId: "acct_y", onboardingComplete: true, payoutsEnabled: false, chargesEnabled: true };
    const r = checkStatusReply(onboardingStatus(s), s);
    expect(Object.keys(r).sort()).toEqual(["accountId", "chargesEnabled", "detailsSubmitted", "payoutsEnabled", "status"]);
    expect(r).toEqual({ status: "complete", payoutsEnabled: false, chargesEnabled: true, accountId: "acct_y", detailsSubmitted: true });
    for (const k of ["payoutsEnabled", "chargesEnabled", "detailsSubmitted"] as const) expect(typeof r[k]).toBe("boolean");
  });

  test("status values stay within the ones the apps know", () => {
    const vals = new Set<string>();
    for (const onboardingComplete of [true, false])
      for (const payoutsEnabled of [true, false])
        for (const chargesEnabled of [true, false]) vals.add(onboardingStatus({ onboardingComplete, payoutsEnabled, chargesEnabled }));
    expect([...vals].sort()).toEqual(["complete", "pending", "pending_capabilities"]);
  });

  test("the function sends every reply through the contract helpers and keeps the action names", () => {
    const src = read("supabase/functions/stripe-connect/index.ts");
    expect(src).toContain('action === "create-account"');
    expect(src).toContain('action === "check-status"');
    expect(src).toContain("JSON.stringify(createAccountReply(onboardingUrl, accountId))");
    expect(src).toContain("JSON.stringify(checkStatusReply(newStatus, status))");
    expect(src).toContain("JSON.stringify(NOT_CREATED_REPLY)");
    // The mobile builds still get /profile?stripe-return=true: the addresses moved into the shared rules
    // and are only different when the website sends returnTo "manage-payments".
    const rules = read("supabase/functions/_shared/maintenance-checkout-rules.ts");
    expect(src).toContain("onboardingReturnUrls(origin, body.returnTo)");
    expect(rules).toContain("stripe-return=true");
    expect(rules).toContain("stripe-refresh=true");
  });
});

describe("Accounts v2 recipient account", () => {
  const body = v2RecipientAccountBody("parent@example.com", { collabor8_user_id: "u1" });

  test("UK individual, GBP, recipient configuration with transfers, Stripe-hosted Express dashboard", () => {
    expect(body.identity).toEqual({ country: "gb", entity_type: "individual" });
    expect(body.defaults.currency).toBe("gbp");
    expect(body.dashboard).toBe("express");
    expect(body.configuration).toEqual({ recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } });
    expect(body.metadata).toEqual({ collabor8_user_id: "u1" });
  });

  test("Collabor8 sends no bank or identity details (Stripe collects them)", () => {
    const json = JSON.stringify(body);
    for (const k of ["external_account", "bank_account", "account_number", "sort_code", "routing_number", "dob", "first_name", "address"]) expect(json).not.toContain(k);
    expect(Object.keys(body.identity).sort()).toEqual(["country", "entity_type"]);
    expect(json).not.toContain("merchant");
  });

  test("onboarding link uses the v2 account_onboarding use case", () => {
    expect(v2OnboardingLinkBody("acct_z", "https://r", "https://t")).toEqual({
      account: "acct_z",
      use_case: { type: "account_onboarding", account_onboarding: { refresh_url: "https://r", return_url: "https://t" } },
    });
  });

  test("adapter creates accounts with POST /v2/core/accounts and a Stripe-Version header, never accounts.create", () => {
    const src = read("supabase/functions/_shared/stripe-adapter.ts");
    expect(src).toContain('"/v2/core/accounts"');
    expect(src).toContain('"/v2/core/account_links"');
    expect(src).toContain('"Stripe-Version": STRIPE_V2_API_VERSION');
    expect(src).not.toContain("accounts.create(");
    expect(STRIPE_V2_API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.[a-z]+$/);
  });
});

describe("status reads for v1 and v2 accounts", () => {
  test("v2 recipient account with active transfers can receive payments", () => {
    const s = payoutStatusFromAccount({ id: "acct_v2", type: "none", details_submitted: true, charges_enabled: false, payouts_enabled: true, capabilities: { transfers: "active" } });
    expect(s).toEqual({ accountId: "acct_v2", onboardingComplete: true, payoutsEnabled: true, chargesEnabled: true });
    expect(onboardingStatus(s)).toBe("complete");
  });

  test("new v2 account before onboarding is pending", () => {
    const s = payoutStatusFromAccount({ id: "acct_v2", type: "none", details_submitted: false, charges_enabled: false, payouts_enabled: false, capabilities: { transfers: "inactive" } });
    expect(s.chargesEnabled).toBe(false);
    expect(onboardingStatus(s)).toBe("pending");
  });

  test("existing v1 Express account reads exactly as before", () => {
    const pending = payoutStatusFromAccount({ id: "acct_v1", type: "express", details_submitted: false, charges_enabled: false, payouts_enabled: false, capabilities: { transfers: "inactive", card_payments: "inactive" } });
    expect(pending).toEqual({ accountId: "acct_v1", onboardingComplete: false, payoutsEnabled: false, chargesEnabled: false });
    const done = payoutStatusFromAccount({ id: "acct_v1", type: "express", details_submitted: true, charges_enabled: true, payouts_enabled: true, capabilities: { transfers: "active", card_payments: "active" } });
    expect(onboardingStatus(done)).toBe("complete");
  });

  test("webhook and check-status share the same rules", () => {
    const wh = read("supabase/functions/stripe-webhooks/index.ts");
    expect(wh).toContain("payoutStatusFromAccount(account as unknown as V1AccountView)");
    expect(wh).toContain("charges_enabled: payout.chargesEnabled");
  });
});

describe("pressing Set up payouts again", () => {
  test("missing account (for example a live id under the sandbox key) gets a new one", () => expect(existingAccountAction(null)).toBe("missing"));
  test("v2 account still onboarding is reused, not duplicated", () =>
    expect(existingAccountAction({ id: "a", type: "none", details_submitted: false, charges_enabled: false, payouts_enabled: false })).toBe("reuse"));
  test("unfinished v1 account is replaced with a v2 account", () =>
    expect(existingAccountAction({ id: "a", type: "express", business_type: "individual", details_submitted: false, charges_enabled: false, payouts_enabled: false })).toBe("replace"));
  test("working v1 account is kept", () =>
    expect(existingAccountAction({ id: "a", type: "express", business_type: "individual", details_submitted: true, charges_enabled: true, payouts_enabled: true })).toBe("reuse"));
  test("rejected account is replaced", () =>
    expect(existingAccountAction({ id: "a", type: "none", requirements: { disabled_reason: "rejected.fraud" } })).toBe("replace"));
  test("legacy detection", () => {
    expect(isLegacyV1Account({ id: "a", type: "express" })).toBe(true);
    expect(isLegacyV1Account({ id: "a", type: "none" })).toBe(false);
  });
});


describe("check-status falls back to the stored payout row when Stripe cannot find the account", () => {
  test("stored complete row (uk2) replies with the same contract as a live lookup", () => {
    const r = storedCheckStatusReply({
      provider_account_id: "acct_stored",
      onboarding_status: "complete",
      payouts_enabled: true,
      charges_enabled: true,
    });
    expect(Object.keys(r).sort()).toEqual(["accountId", "chargesEnabled", "detailsSubmitted", "payoutsEnabled", "status"]);
    expect(r).toEqual({
      status: "complete",
      payoutsEnabled: true,
      chargesEnabled: true,
      accountId: "acct_stored",
      detailsSubmitted: true,
    });
  });

  test("an unknown stored status is treated as pending, not as not_created", () => {
    const r = storedCheckStatusReply({ provider_account_id: "acct_x", onboarding_status: "unknown" });
    expect(r.status).toBe("pending");
    expect(r.detailsSubmitted).toBe(false);
    expect(r.payoutsEnabled).toBe(false);
  });

  test("missing-account errors include No such account and account_invalid", () => {
    expect(isMissingStripeAccountError({ code: "resource_missing", message: "No such account: 'acct_x'" })).toBe(true);
    expect(isMissingStripeAccountError({ code: "account_invalid", message: "The provided key does not have access to account 'acct_x' (or that account does not exist)." })).toBe(true);
    expect(isMissingStripeAccountError({ message: "No such account" })).toBe(true);
    expect(isMissingStripeAccountError({ code: "card_declined", message: "Your card was declined." })).toBe(false);
  });

  test("the function uses the stored reply on a missing-account error and does not update the row", () => {
    const src = read("supabase/functions/stripe-connect/index.ts");
    expect(src).toContain("storedCheckStatusReply(connected)");
    expect(src).toContain("isMissingStripeAccountError(statusError)");
    expect(src).toContain("JSON.stringify(checkStatusReply(newStatus, status))");
    const start = src.indexOf("if (isMissingStripeAccountError(statusError))");
    const end = src.indexOf("throw statusError");
    const block = src.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain("storedCheckStatusReply(connected)");
    expect(block).not.toContain(".update(");
  });
});
