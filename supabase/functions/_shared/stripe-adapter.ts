import Stripe from "https://esm.sh/stripe@18.5.0";
import type {
  PaymentMethodProvider,
  RecurringPaymentProvider,
  PayoutProvider,
  DynamicPricingProvider,
  CardInfo,
  RecurringAgreement,
  ConnectedAccountInfo,
} from "./payment-interfaces.ts";

function getStripe(): Stripe {
  //const key = Deno.env.get("STRIPE_SECRET_KEY");
  const key = Deno.env.get("STRIPE_SECRET_KEY_BRYAN");

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_BRYAN") || "";

  console.log(`[DEBUG] Chave do Stripe carregada: ${stripeKey.substring(0, 14)}...`);

  if (!stripeKey) {
    console.error("ERRO CRÍTICO: STRIPE_SECRET_KEY_BRYAN não encontrada nas variáveis de ambiente!");
  }

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
      expand: ["latest_invoice.payment_intent"],
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

    const subscription = await stripe.subscriptions.create(subParams);
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
export class StripePayoutProvider implements PayoutProvider {
  async createConnectedAccount(email: string, metadata?: Record<string, string>): Promise<string> {
    const stripe = getStripe();

    // Check if we're in test mode (test keys start with sk_test_)
    //const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_BRYAN") || "";
    const isTestMode = stripeKey.startsWith("sk_test_");

    const accountParams: Stripe.AccountCreateParams = {
      type: "express",
      business_type: "individual",
      email,
      // [BR-TEST] country: "GB",
      country: "BR",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: "5734",
        url: "https://collabor8.lovable.app",
        // [BR-TEST] product_description: "Receiving child maintenance payments via Collabor8",
        product_description: "Recebimento de pagamentos de pensão alimentícia via Collabor8",
      },
      metadata: metadata || {},
    };

    // In test mode, pre-fill individual details with test tokens to bypass identity verification
    if (isTestMode) {
      accountParams.individual = {
        // [BR-TEST] first_name: "Test",
        // [BR-TEST] last_name: "User",
        first_name: "Teste",
        last_name: "Usuario",
        dob: { day: 1, month: 1, year: 1901 },
        id_number: "000.000.001-91", // [BR-TEST] CPF test token for BR
        address: {
          line1: "address_full_match",
          // [BR-TEST] city: "London",
          // [BR-TEST] postal_code: "EC1Y 8SY",
          // [BR-TEST] country: "GB",
          city: "Santos",
          state: "SP",
          postal_code: "11010-000",
          country: "BR",
        },
        verification: {
          document: {
            front: "file_identity_document_success",
          },
        },
      };
    }

    const account = await stripe.accounts.create(accountParams);
    return account.id;
  }

  async createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    const stripe = getStripe();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return link.url;
  }

  async getAccountStatus(accountId: string): Promise<ConnectedAccountInfo> {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    return {
      accountId: account.id,
      onboardingComplete: account.details_submitted || false,
      payoutsEnabled: account.payouts_enabled || false,
      chargesEnabled: account.charges_enabled || false,
    };
  }

  async getAccount(accountId: string): Promise<Stripe.Account> {
    const stripe = getStripe();
    return await stripe.accounts.retrieve(accountId);
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
