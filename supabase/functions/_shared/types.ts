// ============================================
// Provider-Agnostic Banking & Payment Interfaces
// ============================================

export interface AuthorisationResponse {
  authorisationUrl: string;
  consentToken?: string;
  consentId?: string;
}

export interface ConsentResponse {
  consentToken: string;
  consentStatus: string;
  institutionId: string;
}

export interface BankAccount {
  id: string;
  type?: string;
  name?: string;
  currency?: string;
  balance?: number;
  sortCode?: string;
  accountNumberMasked?: string; // last 4 only
  institutionId: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  type: string; // credit | debit
  status?: string;
}

export interface SinglePaymentParams {
  idempotencyKey: string;
  amount: number;
  currency: string;
  reference: string;
  payeeName: string;
  payeeAccountNumber: string;
  payeeSortCode: string;
  payerInstitutionId: string;
  payerConsentToken?: string;
}

export interface ScheduledPaymentParams extends SinglePaymentParams {
  executionDate: string; // ISO date
}

export interface PaymentResponse {
  paymentId: string;
  status: string;
  authorisationUrl?: string;
  consentToken?: string;
}

export interface PaymentStatus {
  paymentId: string;
  status: string; // pending | authorised | completed | failed | cancelled
  statusDetails?: string;
}

// ============================================
// Abstract interfaces for provider swapping
// ============================================

export interface BankConnector {
  getInstitutions(): Promise<any[]>;
  createAccountAuthorisation(
    userId: string,
    institutionId: string,
    callbackUrl: string
  ): Promise<AuthorisationResponse>;
  getAccounts(consentToken: string): Promise<BankAccount[]>;
  getTransactions(consentToken: string, accountId: string): Promise<Transaction[]>;
}

export interface PaymentProvider {
  createPaymentAuthorisation(
    userId: string,
    institutionId: string,
    callbackUrl: string,
    paymentRequest: SinglePaymentParams
  ): Promise<PaymentResponse>;
  executePayment(
    consentToken: string,
    paymentRequest: SinglePaymentParams
  ): Promise<PaymentResponse>;
  getPaymentStatus(
    paymentId: string,
    consentToken: string
  ): Promise<PaymentStatus>;
}
