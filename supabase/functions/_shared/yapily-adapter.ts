import type {
  BankConnector,
  PaymentProvider,
  AuthorisationResponse,
  BankAccount,
  Transaction,
  SinglePaymentParams,
  PaymentResponse,
  PaymentStatus,
} from "./types.ts";

const YAPILY_BASE_URL = "https://api.yapily.com";

function getAuthHeader(): string {
  const key = Deno.env.get("YAPILY_APPLICATION_KEY");
  const secret = Deno.env.get("YAPILY_APPLICATION_SECRET");
  if (!key || !secret) throw new Error("Yapily credentials not configured");
  return "Basic " + btoa(`${key}:${secret}`);
}

async function yapilyFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${YAPILY_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Yapily API error [${response.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================
// YapilyBankConnector implements BankConnector
// ============================================

export class YapilyBankConnector implements BankConnector {
  async getInstitutions(): Promise<any[]> {
    const result = await yapilyFetch("/institutions");
    return result.data || [];
  }

  async createAccountAuthorisation(
    userId: string,
    institutionId: string,
    callbackUrl: string
  ): Promise<AuthorisationResponse> {
    const result = await yapilyFetch("/account-auth-requests", {
      method: "POST",
      body: JSON.stringify({
        applicationUserId: userId,
        institutionId,
        callback: callbackUrl,
      }),
    });

    return {
      authorisationUrl: result.data?.authorisationUrl || result.data?.authorisationUri,
      consentToken: result.data?.consentToken,
      consentId: result.data?.id,
    };
  }

  async getAccounts(consentToken: string): Promise<BankAccount[]> {
    const result = await yapilyFetch("/accounts", {
      headers: { Consent: consentToken },
    });

    return (result.data || []).map((acc: any) => ({
      id: acc.id,
      type: acc.type,
      name: acc.nickname || acc.accountNames?.[0]?.name || "Account",
      currency: acc.currency,
      balance: acc.balance ?? null,
      sortCode: acc.accountIdentifications?.find((i: any) => i.type === "SORT_CODE")?.identification,
      accountNumberMasked: (() => {
        const accNum = acc.accountIdentifications?.find((i: any) => i.type === "ACCOUNT_NUMBER")?.identification;
        return accNum ? "••••" + accNum.slice(-4) : null;
      })(),
      institutionId: acc.institutionId || "",
    }));
  }

  async getTransactions(consentToken: string, accountId: string): Promise<Transaction[]> {
    const result = await yapilyFetch(`/accounts/${accountId}/transactions`, {
      headers: { Consent: consentToken },
    });

    return (result.data || []).map((tx: any) => ({
      id: tx.id,
      date: tx.date || tx.bookingDateTime,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description || tx.reference || "",
      type: tx.amount >= 0 ? "credit" : "debit",
      status: tx.status,
    }));
  }
}

// ============================================
// YapilyPaymentProvider implements PaymentProvider
// ============================================

export class YapilyPaymentProvider implements PaymentProvider {
  async createPaymentAuthorisation(
    userId: string,
    institutionId: string,
    callbackUrl: string,
    paymentRequest: SinglePaymentParams
  ): Promise<PaymentResponse> {
    const result = await yapilyFetch("/payment-auth-requests", {
      method: "POST",
      body: JSON.stringify({
        applicationUserId: userId,
        institutionId,
        callback: callbackUrl,
        paymentRequest: {
          type: "DOMESTIC_PAYMENT",
          reference: paymentRequest.reference,
          paymentIdempotencyId: paymentRequest.idempotencyKey,
          amount: {
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
          },
          payee: {
            name: paymentRequest.payeeName,
            accountIdentifications: [
              {
                type: "ACCOUNT_NUMBER",
                identification: paymentRequest.payeeAccountNumber,
              },
              {
                type: "SORT_CODE",
                identification: paymentRequest.payeeSortCode,
              },
            ],
          },
        },
      }),
    });

    return {
      paymentId: result.data?.id || "",
      status: result.data?.status || "AWAITING_AUTHORIZATION",
      authorisationUrl: result.data?.authorisationUrl || result.data?.authorisationUri,
      consentToken: result.data?.consentToken,
    };
  }

  async executePayment(
    consentToken: string,
    paymentRequest: SinglePaymentParams
  ): Promise<PaymentResponse> {
    const result = await yapilyFetch("/payments", {
      method: "POST",
      headers: { Consent: consentToken },
      body: JSON.stringify({
        type: "DOMESTIC_PAYMENT",
        reference: paymentRequest.reference,
        paymentIdempotencyId: paymentRequest.idempotencyKey,
        amount: {
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
        },
        payee: {
          name: paymentRequest.payeeName,
          accountIdentifications: [
            {
              type: "ACCOUNT_NUMBER",
              identification: paymentRequest.payeeAccountNumber,
            },
            {
              type: "SORT_CODE",
              identification: paymentRequest.payeeSortCode,
            },
          ],
        },
      }),
    });

    return {
      paymentId: result.data?.id || "",
      status: result.data?.status || "PENDING",
      consentToken,
    };
  }

  async getPaymentStatus(
    paymentId: string,
    consentToken: string
  ): Promise<PaymentStatus> {
    const result = await yapilyFetch(`/payments/${paymentId}/details`, {
      headers: { Consent: consentToken },
    });

    return {
      paymentId: result.data?.id || paymentId,
      status: result.data?.status || "UNKNOWN",
      statusDetails: result.data?.statusDetails?.status,
    };
  }
}
