/** Pure alert rules shared by the edge functions and the unit tests. No secrets and no phone numbers. */

export const DEFAULT_DSL_EMAILS = ["rafa@collaborate8.com", "jade@collaborate8.com"] as const;

export const QA_ALERT_EMAIL_DEFAULT = "collaborate8-qa@agentmail.to";

export const SAFETY_ALERT_TEXT =
  "Collabor8: a safety flag needs review. Please check your email or the console.";

export const MONITORING_ALERT_TEXT =
  "Collabor8: a monitoring alert needs review. Please check your email or the console.";

export type AlertKind = "safety_flag" | "monitoring";

export function splitList(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function alertEmailRecipients(
  testAccount: boolean,
  env: { dsl?: string | null; qa?: string | null },
): { to: string[]; dropped: boolean } {
  if (testAccount) {
    const qa = splitList(env.qa);
    if (qa.length === 0) return { to: [], dropped: true };
    return { to: qa, dropped: false };
  }
  const dsl = splitList(env.dsl);
  return { to: dsl.length > 0 ? dsl : [...DEFAULT_DSL_EMAILS], dropped: false };
}

export function alertSubject(kind: AlertKind, testAccount: boolean): string {
  const base = kind === "monitoring"
    ? "A monitoring alert needs review on Collabor8"
    : "A safety flag needs review on Collabor8";
  return testAccount ? `[TEST] ${base}` : base;
}

export function alertText(kind: AlertKind): string {
  return kind === "monitoring" ? MONITORING_ALERT_TEXT : SAFETY_ALERT_TEXT;
}

/** In hours are weekdays 09:00 to 17:30 in Europe/London. Everything else is out of hours. */
export function isOutOfHours(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  if (weekday === "Sat" || weekday === "Sun") return true;
  const mins = hour * 60 + minute;
  return mins < 9 * 60 || mins >= 17 * 60 + 30;
}

export type SmsDecision = "send" | "skip_test" | "skip_hours" | "skip_config";

/** SMS is provider-agnostic. Test accounts never send. Monitoring SMS is out of hours only. */
export function smsDecision(input: {
  kind: AlertKind;
  testAccount: boolean;
  outOfHours: boolean;
  configured: boolean;
}): SmsDecision {
  if (input.testAccount) return "skip_test";
  if (!input.configured) return "skip_config";
  if (input.kind === "monitoring" && !input.outOfHours) return "skip_hours";
  return "send";
}

export function smsConfigured(env: {
  provider?: string | null;
  apiKey?: string | null;
  senderId?: string | null;
  numbers?: string | null;
}): boolean {
  return Boolean(env.provider && env.apiKey && env.senderId && splitList(env.numbers).length > 0);
}
