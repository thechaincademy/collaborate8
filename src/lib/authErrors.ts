export const EMAIL_RATE_LIMIT_MESSAGE = "Too many emails were sent just now. Please wait a few minutes and try again.";

type AuthErrorLike = { status?: number; code?: string; message?: string } | null | undefined;

export function isEmailRateLimit(error: AuthErrorLike): boolean {
  if (!error) return false;
  return error.status === 429 || error.code === "over_email_send_rate_limit" || /rate limit|only request this after/i.test(error.message ?? "");
}
