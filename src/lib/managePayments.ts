// Pure rules and copy for the Manage payments screen (no React, so bun tests can load it).
//
// Payer: sees the amount and how often, chooses card or bank, then goes to Stripe once.
// Receiver: sees what to expect, adds the bank account to be paid into on Stripe's page.
// Collabor8 never stores card or bank details; Stripe holds them.

export type PaymentChoice = "card" | "bank";
export type PayFrequency = "week" | "month";

export const PAYMENT_CHOICES: { value: PaymentChoice; title: string; detail: string }[] = [
  { value: "card", title: "Debit or credit card", detail: "Includes Apple Pay and Google Pay. The first payment is taken straight away or on your start date." },
  { value: "bank", title: "Bank account (Direct Debit)", detail: "Pays straight from your bank account. Stripe sets up the Direct Debit on the next page." },
];

export const BANK_UNAVAILABLE_CODE = "BANK_PAYMENTS_UNAVAILABLE";
export const BANK_UNAVAILABLE_TEXT = "Paying from a bank account isn't available yet. Please choose card.";

export const frequencyLabel = (f?: string | null): string =>
  f === "week" || f === "weekly" ? "Weekly" : f === "month" || f === "monthly" ? "Monthly" : f === "daily" ? "Daily" : "";

export const perFrequency = (f?: string | null): string =>
  f === "week" || f === "weekly" ? "every week" : f === "month" || f === "monthly" ? "every month" : f === "daily" ? "every day" : "";

/** "Every month" / "Every week", for lines like "Every month, to Sam". */
export const everyLabel = (f?: string | null): string => {
  const p = perFrequency(f);
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
};

export const poundsLabel = (amount: number): string => `£${amount.toFixed(2)}`;

/** The amount rules the server enforces too: at least 50p, whole pence. */
export const validAmount = (value: string): boolean => {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) && n >= 0.5 && Math.abs(n * 100 - Math.round(n * 100)) < 0.00001;
};

export const parseChoice = (v: unknown): PaymentChoice => (v === "bank" ? "bank" : "card");

export type ReceiverPayoutView = "add" | "finish" | "checking" | "done";

/** Which receiver message to show, from the check-status value (stored value is the fallback). */
export const receiverPayoutView = (connectStatus: string): ReceiverPayoutView => {
  if (connectStatus === "complete") return "done";
  if (connectStatus === "pending_capabilities") return "checking";
  if (connectStatus === "pending") return "finish";
  return "add";
};

export const RECEIVER_COPY: Record<ReceiverPayoutView, { title: string; body: string; button: string | null }> = {
  add: {
    title: "Add the bank account you want to be paid into",
    body: "You add it on Stripe's secure page, which takes about two minutes. Collabor8 doesn't store your bank details. Stripe holds them.",
    button: "Add bank account",
  },
  finish: {
    title: "Finish adding your bank account",
    body: "You started but haven't finished on Stripe. Pick up where you left off. Your co-parent can't set up payments until this is done.",
    button: "Continue on Stripe",
  },
  checking: {
    title: "Stripe is checking your details",
    body: "This usually takes a few minutes. You don't need to do anything.",
    button: null,
  },
  done: {
    title: "Bank account added",
    body: "You're ready to receive payments. Your co-parent's payments will go to the bank account you added.",
    button: "Change bank account",
  },
};

export type CoparentReady = { linked: boolean; ready: boolean } | null;

/** Payer's "can I continue?" message. null means no message, the button is free to use. */
export const payerBlockMessage = (hasCoparent: boolean, ready: CoparentReady): string | null => {
  if (!hasCoparent || (ready && !ready.linked)) return "Link your co-parent first. You can invite them from Settings.";
  if (ready && !ready.ready) return "Your co-parent hasn't added their bank account yet. You can carry on once they have. Nothing is charged until you confirm on Stripe.";
  return null;
};

export const payerReviewNote = (choice: PaymentChoice, email?: string | null): string =>
  `${choice === "bank" ? "Stripe will ask for your bank details to set up the Direct Debit." : "Stripe will ask for your card details."} ${email ? `We'll use ${email}, so Stripe won't ask for your email.` : "Stripe won't ask for your email."} Collabor8 doesn't store your ${choice === "bank" ? "bank" : "card"} details.`;

/** Return params Stripe adds when sending a parent back to Manage payments. */
export const stripeReturnState = (search: string): "return" | "refresh" | "cancelled" | null => {
  const p = new URLSearchParams(search);
  if (p.get("stripe") === "return") return "return";
  if (p.get("stripe") === "refresh") return "refresh";
  if (p.get("subscription-checkout") === "cancelled") return "cancelled";
  return null;
};

/**
 * Stripe's own first screen asks every parent for an email address and a mobile number, whatever we send it.
 * Say so before they go, and say which email to use, so it doesn't feel like a different account.
 */
export const stripeHeadsUp = (email?: string | null): string =>
  `Stripe's first screen asks for your email and mobile number${email ? `. Use ${email}` : ""}. They keep your payout account safe. Collabor8 doesn't see or keep your mobile number.`;
