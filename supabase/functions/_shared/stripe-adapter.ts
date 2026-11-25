import Stripe from "https://esm.sh/stripe@18.5.0";
import { logStripeError } from "./stripe-errors.ts";
import type {
  PaymentMethodProvider,
  RecurringPaymentProvider,
  PayoutProvider,
  DynamicPricingProvider,
  CardInfo,
  RecurringAgreement,
  ConnectedAccountInfo,
} from "./payment-interfaces.ts";
import { cfg } from "./config.ts";
import {
  STRIPE_V2_API_VERSION,
  payoutStatusFromAccount,
  v2OnboardingLinkBody,
  v2RecipientAccountBody,
  type RecipientPerson,
  type V1AccountView,
} from "./stripe-connect-rules.ts";

async function tryStripe<T>(scope: string, step: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    logStripeError(scope, step, e);
    throw e;
  }
}

function getStripe(): Stripe {
  const key = cfg("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

function toIsoFromUnixTimestamp(primary?: number | null, fallback?: number | null): string {
  const unixSeconds = [primary, fallback, Math.floor(Date.now() / 1000)].find(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  return new Date(unixSeconds * 1000).toISOString();
}

// ─── Payment Method Provider ────────────────────────────────
export class StripePaymentMethodProvider implements PaymentMethodProvider {
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const stripe = getStripe();
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) return existing.data[0].id;
    const customer = await stripe.customers.create({
      email,
      metadata: { collabor8_user_id: userId },
    });
    return customer.id;
  }

  async createSetupSession(customerId: string, successUrl: string, cancelUrl: string): Promise<string> {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "setup",
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return session.url!;
  }

  async listPaymentMethods(customerId: string): Promise<CardInfo[]> {
    const stripe = getStripe();
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });
    return methods.data.map((m) => ({
      id: m.id,
      brand: m.card?.brand || "unknown",
      last4: m.card?.last4 || "****",
      expMonth: m.card?.exp_month || 0,
      expYear: m.card?.exp_year || 0,
    }));
  }
}

// ─── Recurring Payment Provider ─────────────────────────────
export class StripeRecurringProvider implements RecurringPaymentProvider {
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
    transferData?: { destinationAccountId: string };
  }): Promise<RecurringAgreement> {
    const stripe = getStripe();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: params.customerId,
      type: "card",
      limit: 1,
    });

    const subParams: Stripe.SubscriptionCreateParams = {
      customer: params.customerId,
      items: [{ price: params.priceId }],
      metadata: params.metadata || {},
      payment_behavior: "allow_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      // basil removed invoice.payment_intent, so expanding it errors; the payment is on invoice.payments.
      expand: ["latest_invoice"],
    };

    if (paymentMethods.data[0]?.id) {
      subParams.default_payment_method = paymentMethods.data[0].id;
    }

    // For Connect: use transfer_data on subscription to auto-transfer on each invoice
    if (params.transferData) {
      subParams.transfer_data = {
        destination: params.transferData.destinationAccountId,
      };
    }

    const subscription = await tryStripe("STRIPE-ADAPTER", "subscriptions.create", () =>
      stripe.subscriptions.create(subParams),
    );
    return this.mapSubscription(subscription);
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subscriptionId);
  }

  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<RecurringAgreement> {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: sub.items.data[0].id, deleted: true }, { price: newPriceId }],
      proration_behavior: "none",
    });
    return this.mapSubscription(updated);
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<RecurringAgreement> {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return this.mapSubscription(sub);
  }

  private mapSubscription(sub: Stripe.Subscription): RecurringAgreement {
    const periodEnd = toIsoFromUnixTimestamp(sub.current_period_end, sub.billing_cycle_anchor);

    return {
      subscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: periodEnd,
      nextPaymentDate: periodEnd,
    };
  }
}

// ─── Payout Provider (Connect) ──────────────────────────────
// New receivers get an Accounts v2 account (recipient configuration, Stripe-hosted onboarding,
// Stripe keeps the bank details). Older Accounts v1 accounts stay readable through /v1/accounts.

/** Error thrown for /v2 failures, shaped like a Stripe SDK error so logStripeError keeps the detail. */
class StripeV2Error extends Error {
  type?: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
  param?: string;
  constructor(message: string, init: { type?: string; code?: string; statusCode?: number; requestId?: string; param?: string }) {
    super(message);
    this.name = "StripeV2Error";
    Object.assign(this, init);
  }
}

async function stripeV2<T>(path: string, body: unknown): Promise<T> {
  const key = cfg("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_V2_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as any)?.error ?? {};
    const invalid = Array.isArray(err.invalid_fields) ? err.invalid_fields.map((f: any) => f?.field).join(",") : undefined;
    throw new StripeV2Error(String(err.message ?? `Stripe ${path} failed`), {
      type: err.type,
      code: err.code,
      statusCode: res.status,
      requestId: res.headers.get("request-id") ?? undefined,
      param: invalid,
    });
  }
  return json as T;
}

export class StripePayoutProvider implements PayoutProvider {
  /** POST /v2/core/accounts: UK individual, recipient configuration, GBP. Returns the acct_ id. */
  async createConnectedAccount(email: string, metadata?: Record<string, string>, person?: RecipientPerson): Promise<string> {
    const account = await tryStripe<{ id: string }>("STRIPE-ADAPTER", "v2.core.accounts.create", () =>
      stripeV2("/v2/core/accounts", v2RecipientAccountBody(email, metadata || {}, person)),
    );
    return account.id;
  }

  /**
   * Stripe-hosted onboarding link. v2 accounts use /v2/core/account_links; older v1
   * accounts keep using /v1/account_links.
   */
  async createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string, legacyV1 = false): Promise<string> {
    if (legacyV1) {
      const stripe = getStripe();
      const link = await tryStripe<Stripe.AccountLink>("STRIPE-ADAPTER", "accountLinks.create", () =>
        stripe.accountLinks.create({
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: "account_onboarding",
        }),
      );
      return link.url;
    }
    const link = await tryStripe<{ url: string }>("STRIPE-ADAPTER", "v2.core.account_links.create", () =>
      stripeV2("/v2/core/account_links", v2OnboardingLinkBody(accountId, refreshUrl, returnUrl)),
    );
    return link.url;
  }

  /** Works for v1 and v2 accounts (v2 accounts read back through /v1/accounts). */
  async getAccountStatus(accountId: string): Promise<ConnectedAccountInfo> {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    return payoutStatusFromAccount(account as unknown as V1AccountView);
  }

  async getAccount(accountId: string): Promise<Stripe.Account> {
    const stripe = getStripe();
    return await stripe.accounts.retrieve(accountId);
  }

  /** Like getAccount, but null when the id doesn't exist under this key (for example a live id on sandbox). */
  async getAccountOrNull(accountId: string): Promise<Stripe.Account | null> {
    try {
      return await this.getAccount(accountId);
    } catch (e) {
      const err = e as any;
      if (err?.code === "resource_missing" || err?.code === "account_invalid" || err?.statusCode === 404) return null;
      throw e;
    }
  }

  async createTransfer(params: {
    amount: number;
    currency: string;
    destinationAccountId: string;
    transferGroup?: string;
    metadata?: Record<string, string>;
  }): Promise<{ transferId: string; status: string }> {
    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: params.amount,
      currency: params.currency,
      destination: params.destinationAccountId,
      transfer_group: params.transferGroup,
      metadata: params.metadata || {},
    });
    return { transferId: transfer.id, status: "pending" };
  }
}

// ─── Dynamic Pricing ────────────────────────────────────────
export class StripeDynamicPricing implements DynamicPricingProvider {
  async createPrice(params: {
    amount: number;
    currency: string;
    interval: "day" | "week" | "month" | "year";
    productId: string;
    metadata?: Record<string, string>;
  }): Promise<string> {
    const stripe = getStripe();
    const price = await stripe.prices.create({
      unit_amount: params.amount,
      currency: params.currency,
      recurring: { interval: params.interval },
      product: params.productId,
      metadata: params.metadata || {},
    });
    return price.id;
  }
}
