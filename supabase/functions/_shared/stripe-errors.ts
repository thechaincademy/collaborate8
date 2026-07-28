// Shared helpers to capture and log rich Stripe error details.

export interface StripeErrorDetails {
  message: string;
  name?: string;
  type?: string;
  code?: string;
  decline_code?: string;
  param?: string;
  statusCode?: number;
  requestId?: string;
  doc_url?: string;
  raw?: unknown;
  stack?: string;
}

export function extractStripeError(error: unknown): StripeErrorDetails {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const e = error as any;
  return {
    message: e?.message ?? String(error),
    name: e?.name,
    type: e?.type,
    code: e?.code,
    decline_code: e?.decline_code,
    param: e?.param,
    statusCode: e?.statusCode,
    requestId: e?.requestId,
    doc_url: e?.doc_url,
    raw: e?.raw,
    stack: e?.stack,
  };
}

export function logStripeError(scope: string, step: string, error: unknown) {
  const details = extractStripeError(error);
  console.error(
    `[${scope}] ERROR at "${step}"`,
    JSON.stringify(details, null, 2),
  );
  return details;
}
