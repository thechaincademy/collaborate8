/** Pure alert rules shared by the edge functions and the unit tests. No secrets and no phone numbers. */

/** Test alerts only ever go to this inbox, marked [TEST]. */
export const QA_ALERT_EMAIL_DEFAULT = "collaborate8-qa@agentmail.to";

/** The review page a lead opens from an alert. No ids, names or text go in the link. */
export const DEFAULT_REVIEW_SITE = "https://collaborate8.com";
export const DSL_REVIEW_PATH = "/dsl";

/** SMS is on hold. No SMS is sent while this is true, whatever is configured. */
export const SMS_ON_HOLD = true;

export const MONITORING_ALERT_TEXT =
  "Collabor8: a monitoring alert needs review. Please check your email or the console.";

export type AlertKind = "safety_flag" | "concern" | "monitoring";

export function splitList(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function domainOfAddress(address: string): string {
  const at = address.lastIndexOf("@");
  return at > 0 ? address.slice(at + 1).toLowerCase() : "";
}

/** A QA test lead is a dsl role holder whose sign-in email is on the QA inbox domain. */
export function isTestLead(email: string): boolean {
  return domainOfAddress(email) === domainOfAddress(QA_ALERT_EMAIL_DEFAULT);
}

export interface AlertRoute {
  to: string[];
  role: "dsl" | "qa" | "none";
  dropped: boolean;
  reason?: "no_lead" | "no_test_lead";
}

/**
 * Routes one alert to the holders of the dsl (safeguarding lead) role.
 * Real alerts go to every real lead and never to a QA test lead.
 * Test alerts never reach a real lead: they go only to the QA inbox, and only
 * when a QA test lead holds the role, so QA can check role-based delivery.
 */
export function routeAlert(testAlert: boolean, leadEmails: readonly string[]): AlertRoute {
  const leads = [...new Set(leadEmails.map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@")))];
  if (testAlert) {
    if (!leads.some(isTestLead)) return { to: [], role: "none", dropped: true, reason: "no_test_lead" };
    return { to: [QA_ALERT_EMAIL_DEFAULT], role: "qa", dropped: false };
  }
  const real = leads.filter((email) => !isTestLead(email));
  if (real.length === 0) return { to: [], role: "none", dropped: true, reason: "no_lead" };
  return { to: real, role: "dsl", dropped: false };
}

export function alertSubject(kind: AlertKind, testAccount: boolean): string {
  const base = kind === "monitoring"
    ? "A monitoring alert needs review on Collabor8"
    : kind === "concern"
    ? "A concern report needs review on Collabor8"
    : "A safety flag needs review on Collabor8";
  return testAccount ? `[TEST] ${base}` : base;
}

export function reviewUrl(site?: string | null): string {
  const base = (site && /^https:\/\/[^\s/]+/.test(site) ? site : DEFAULT_REVIEW_SITE).replace(/\/+$/, "");
  return `${base}${DSL_REVIEW_PATH}`;
}

/** Alert body: the kind and a link to the review page only. */
export function alertText(kind: AlertKind, site?: string | null): string {
  if (kind === "monitoring") return MONITORING_ALERT_TEXT;
  const what = kind === "concern" ? "a concern report needs review" : "a safety flag needs review";
  return `Collabor8: ${what}. Please open the safeguarding review page to see it: ${reviewUrl(site)}`;
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
