import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  BANK_UNAVAILABLE_TEXT,
  PAYMENT_CHOICES,
  RECEIVER_COPY,
  frequencyLabel,
  parseChoice,
  payerBlockMessage,
  payerReviewNote,
  perFrequency,
  receiverPayoutView,
  stripeHeadsUp,
  stripeReturnState,
  validAmount,
} from "../src/lib/managePayments";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

describe("Manage payments copy and rules", () => {
  test("every line a parent can read has no em dash, no 'police' and no 'victim'", () => {
    const all = [
      ...PAYMENT_CHOICES.flatMap((c) => [c.title, c.detail]),
      ...Object.values(RECEIVER_COPY).flatMap((c) => [c.title, c.body, c.button ?? ""]),
      BANK_UNAVAILABLE_TEXT,
      payerBlockMessage(false, null) ?? "",
      payerBlockMessage(true, { linked: true, ready: false }) ?? "",
      payerReviewNote("card", "a@b.co"),
      payerReviewNote("bank"),
      stripeHeadsUp("a@b.co"),
      read("src/pages/ManagePayments.tsx"),
      read("src/components/dashboard/PayingParentSetup.tsx"),
    ].join("\n");
    expect(all).not.toMatch(/[\u2014\u2013]/);
    expect(all.toLowerCase()).not.toContain("police");
    expect(all.toLowerCase()).not.toContain("victim");
  });

  test("the payer chooses card or bank; anything else is card", () => {
    expect(PAYMENT_CHOICES.map((c) => c.value)).toEqual(["card", "bank"]);
    expect(parseChoice("bank")).toBe("bank");
    expect(parseChoice(undefined)).toBe("card");
    expect(parseChoice("bacs_debit")).toBe("card");
  });

  test("amount rule matches the server: 50p or more, whole pence", () => {
    for (const ok of ["0.50", "50", "50.00", "123.45"]) expect(validAmount(ok)).toBe(true);
    for (const bad of ["", "0.49", "0", "-5", "abc", "10.005"]) expect(validAmount(bad)).toBe(false);
  });

  test("labels", () => {
    expect(frequencyLabel("month")).toBe("Monthly");
    expect(frequencyLabel("weekly")).toBe("Weekly");
    expect(perFrequency("week")).toBe("every week");
    expect(frequencyLabel(undefined)).toBe("");
  });

  test("receiver sees add, finish, checking or done from the payout status", () => {
    expect(receiverPayoutView("not_created")).toBe("add");
    expect(receiverPayoutView("loading")).toBe("add");
    expect(receiverPayoutView("pending")).toBe("finish");
    expect(receiverPayoutView("pending_capabilities")).toBe("checking");
    expect(receiverPayoutView("complete")).toBe("done");
    expect(RECEIVER_COPY.add.button).toBe("Add bank account");
    expect(RECEIVER_COPY.checking.button).toBeNull();
    for (const v of Object.values(RECEIVER_COPY)) expect(v.body.toLowerCase()).not.toMatch(/sort code|account number/);
  });

  test("payer is only blocked when we know the co-parent is missing or not ready", () => {
    expect(payerBlockMessage(true, null)).toBeNull(); // unknown (older function): never block
    expect(payerBlockMessage(true, { linked: true, ready: true })).toBeNull();
    expect(payerBlockMessage(true, { linked: true, ready: false })).toContain("hasn't added their bank account");
    expect(payerBlockMessage(false, null)).toContain("Link your co-parent");
  });

  test("review note says Stripe will not ask for the email and that nothing is stored", () => {
    expect(payerReviewNote("card", "a@b.co")).toContain("won't ask for your email");
    expect(payerReviewNote("bank", "a@b.co")).toContain("Direct Debit");
    expect(payerReviewNote("card", "a@b.co")).toContain("doesn't store");
  });

  test("receiver is told before leaving that Stripe asks for an email and mobile number, and which email to use", () => {
    const t = stripeHeadsUp("a@b.co");
    expect(t).toContain("email and mobile number");
    expect(t).toContain("Use a@b.co");
    expect(t).toContain("doesn't see or keep your mobile number");
    expect(stripeHeadsUp(null)).not.toContain("Use ");
  });

  test("what Stripe adds to the return address is understood", () => {
    expect(stripeReturnState("?stripe=return")).toBe("return");
    expect(stripeReturnState("?stripe=refresh")).toBe("refresh");
    expect(stripeReturnState("?subscription-checkout=cancelled")).toBe("cancelled");
    expect(stripeReturnState("")).toBeNull();
  });
});

describe("Manage payments wiring", () => {
  test("Settings points at Manage payments; the old payout page and Stripe-portal row are gone from Settings", () => {
    const row = read("src/components/settings/CoparentLinkSettings.tsx");
    expect(row).toContain('navigate("/manage-payments")');
    expect(row).not.toContain("Payout details with Stripe");
    expect(read("src/pages/Settings.tsx")).not.toContain("Stop a recurring payment");
  });

  test("routes: /manage-payments is signed-in only and the old page redirects to it", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('path="/manage-payments" element={<ProtectedRoute><ManagePayments /></ProtectedRoute>}');
    expect(app).toContain('path="/coparent-bank-account" element={<Navigate to="/manage-payments" replace />}');
  });

  test("payer goes to Stripe once, with the chosen method, and cancel returns to Manage payments", () => {
    const setup = read("src/components/dashboard/PayingParentSetup.tsx");
    expect(setup).toContain("paymentMethod: choice");
    expect(setup).toContain('returnTo: "manage-payments"');
    expect(setup).not.toContain("setupCard");
    expect(setup).not.toContain("Connect your account");
  });

  test("receiver onboarding asks to return to Manage payments and the page never shows or stores bank numbers", () => {
    const hook = read("src/hooks/useStripe.tsx");
    expect(hook).toContain('body: { action: "create-account", returnTo: "manage-payments" }');
    const page = read("src/pages/ManagePayments.tsx");
    expect(page).not.toMatch(/sort_code|account_number|iban/i);
    expect(page).toContain("role_confirmed_");
  });
});
