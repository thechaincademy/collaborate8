// ============================================
// Provider-Agnostic Payment Abstraction Layer
// ============================================
// These interfaces allow swapping between Stripe, Open Banking, etc.

export interface CardInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface PaymentMethodProvider {
  /** Create or retrieve a Stripe customer for a user */
  getOrCreateCustomer(userId: string, email: string): Promise<string>; // returns customerId
  /** Create a checkout session to add a card / payment method */
  createSetupSession(customerId: string, successUrl: string, cancelUrl: string): Promise<string>; // returns session URL
  /** List saved payment methods for a customer */
  listPaymentMethods(customerId: string): Promise<CardInfo[]>;
}

export interface RecurringAgreement {
  subscriptionId: string;
  status: string; // active | past_due | canceled | incomplete
  currentPeriodEnd: string; // ISO
  nextPaymentDate: string; // ISO
}

export interface RecurringPaymentProvider {
  /** Create a subscription that charges the payer on a recurring basis */
  createSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
    transferData?: {
      destinationAccountId: string;
    };
  }): Promise<RecurringAgreement>;

  /** Cancel a subscription */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /** Update subscription (e.g. change amount via new price) */
  updateSubscription(subscriptionId: string, newPriceId: string): Promise<RecurringAgreement>;

  /** Get subscription status */
  getSubscriptionStatus(subscriptionId: string): Promise<RecurringAgreement>;
}

export interface ConnectedAccountInfo {
  accountId: string;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
}

export interface PayoutProvider {
  /** Create a connected account for a receiver */
  createConnectedAccount(email: string, metadata?: Record<string, string>): Promise<string>; // returns accountId

  /** Generate onboarding link for a connected account */
  createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string>; // returns URL

  /** Get connected account status */
  getAccountStatus(accountId: string): Promise<ConnectedAccountInfo>;

  /** Create a transfer from platform to connected account */
  createTransfer(params: {
    amount: number;
    currency: string;
    destinationAccountId: string;
    transferGroup?: string;
    metadata?: Record<string, string>;
  }): Promise<{ transferId: string; status: string }>;
}

/** Create a dynamic price for a custom amount (used for variable maintenance amounts) */
export interface DynamicPricingProvider {
  createPrice(params: {
    amount: number; // in minor units (pence)
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    productId: string;
    metadata?: Record<string, string>;
  }): Promise<string>; // returns priceId
}
