// Pure rules for Stripe Connect payouts (no Deno or Stripe imports, so bun tests can load it).
//
// New receiving parents get a Stripe Accounts v2 account with the `recipient` configuration:
// Stripe hosts onboarding and collects bank details, Collabor8 never sees or stores them.
// Accounts created earlier with Accounts v1 keep working: every account (v1 or v2) is still
// read through GET /v1/accounts/{id}, which Stripe supports for v2 accounts too.
//
// The stripe-connect replies are a fixed contract used by mobile builds 31 to 34:
//   create-account -> { url, accountId }
//   check-status   -> { status: "not_created" }
//                  or { status, payoutsEnabled, chargesEnabled, accountId, detailsSubmitted }

/** Stripe-Version for /v2 calls (the v1 SDK keeps its own pinned version). */
export const STRIPE_V2_API_VERSION = "2026-10-28.endive";

export const SITE_URL = "https://collaborate8.com";

/** Body for POST /v2/core/accounts: a UK individual who receives transfers and payouts in GBP. */
export function v2RecipientAccountBody(email: string, metadata: Record<string, string> = {}) {
  return {
    contact_email: email,
    dashboard: "express",
    identity: { country: "gb", entity_type: "individual" },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: { stripe_transfers: { requested: true } },
        },
      },
    },
    defaults: {
      currency: "gbp",
      locales: ["en-GB"],
      profile: {
        business_url: SITE_URL,
        product_description: "Receiving child maintenance payments via Collabor8",
      },
      responsibilities: { fees_collector: "application", losses_collector: "application" },
    },
    metadata,
    include: ["configuration.recipient"],
  };
}

/** Body for POST /v2/core/account_links (Stripe-hosted onboarding). */
export function v2OnboardingLinkBody(accountId: string, refreshUrl: string, returnUrl: string) {
  return {
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: { refresh_url: refreshUrl, return_url: returnUrl },
    },
  };
}

/** Minimal shape of a v1 Account read (works for v1 and v2 accounts). */
export interface V1AccountView {
  id: string;
  type?: string | null;
  business_type?: string | null;
  details_submitted?: boolean | null;
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  capabilities?: Record<string, string | undefined> | null;
  requirements?: { disabled_reason?: string | null } | null;
  controller?: { type?: string | null; requirement_collection?: string | null } | null;
}

export interface PayoutStatus {
  accountId: string;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  /**
   * "Can receive maintenance payments". Destination charges only need the transfers
   * capability on the receiving account, so this is true when v1 charges are enabled
   * (older v1 accounts with card_payments) or when transfers are active (v2 recipient
   * accounts, which never have card_payments). Kept under the existing name so the
   * check-status reply and the connected_accounts.charges_enabled column stay the same.
   */
  chargesEnabled: boolean;
}

export function payoutStatusFromAccount(account: V1AccountView): PayoutStatus {
  const transfersActive = account.capabilities?.transfers === "active";
  return {
    accountId: account.id,
    onboardingComplete: !!account.details_submitted,
    payoutsEnabled: !!account.payouts_enabled,
    chargesEnabled: !!account.charges_enabled || transfersActive,
  };
}

export type OnboardingStatus = "complete" | "pending_capabilities" | "pending";

export function onboardingStatus(s: Pick<PayoutStatus, "onboardingComplete" | "payoutsEnabled" | "chargesEnabled">): OnboardingStatus {
  const capabilitiesActive = s.chargesEnabled || s.payoutsEnabled;
  if (s.onboardingComplete && capabilitiesActive) return "complete";
  if (s.onboardingComplete) return "pending_capabilities";
  return "pending";
}

/**
 * Accounts made with the old Accounts v1 API by this app are type "express". Accounts made
 * with /v2/core/accounts read back through /v1/accounts as type "none" with a controller.
 */
export function isLegacyV1Account(account: V1AccountView): boolean {
  return account.type === "express" || account.type === "custom" || account.type === "standard";
}

/**
 * What to do with a parent's existing connected account when they press
 * "Set up payouts with Stripe" again.
 *  - "missing": the id is not found under this Stripe key, create a new v2 account.
 *  - "reuse": keep it and send a fresh onboarding link (v2 accounts still onboarding, or any working account).
 *  - "replace": a rejected account, or an unfinished, unusable Accounts v1 account; create a v2 account instead.
 */
export function existingAccountAction(account: V1AccountView | null): "missing" | "reuse" | "replace" {
  if (!account) return "missing";
  if (account.requirements?.disabled_reason?.startsWith("rejected")) return "replace";
  if (!isLegacyV1Account(account)) return "reuse";
  const s = payoutStatusFromAccount(account);
  const unusable = !s.chargesEnabled && !s.payoutsEnabled;
  const notIndividualAndUnfinished = !account.details_submitted && account.business_type !== "individual";
  return unusable || notIndividualAndUnfinished ? "replace" : "reuse";
}

/** The fixed create-account reply. */
export function createAccountReply(url: string, accountId: string) {
  return { url, accountId };
}

/** The fixed check-status reply. */
export function checkStatusReply(status: OnboardingStatus, s: PayoutStatus) {
  return {
    status,
    payoutsEnabled: s.payoutsEnabled,
    chargesEnabled: s.chargesEnabled,
    accountId: s.accountId,
    detailsSubmitted: s.onboardingComplete,
  };
}

export const NOT_CREATED_REPLY = { status: "not_created" } as const;
