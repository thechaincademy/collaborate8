/**
 * Shared Sentry privacy scrubber for the website and edge functions.
 * Drops request bodies, chat and concern text, names, emails, phone numbers,
 * bank details, and suitability answers. Strips query strings from URLs.
 */

export const sentrySendDefaultPii = false;
export const sentryReplaySessionSampleRate = 0;
export const sentryReplayOnErrorSampleRate = 0;

const DROP_KEYS = new Set([
  "body",
  "note",
  "text",
  "original_body",
  "answers",
  "p_answers",
  "p_note",
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "first_name",
  "last_name",
  "full_name",
  "display_name",
  "name",
  "email",
  "phone",
  "mobile",
  "sort_code",
  "account_number",
  "iban",
  "password",
  "suitability",
  "concern",
  "request_body",
  "requestbody",
  "cookies",
  "cookie",
  "authorization",
]);

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;
const PHONE = /\+\d[\d\s().-]{8,20}\d|\b0\d[\d\s().-]{8,16}\d\b/g;
const SORT_CODE = /\b\d{2}-\d{2}-\d{2}\b/g;
const ACCOUNT = /\b\d{8}\b/g;

export interface SentryRequestLike {
  url?: string;
  query_string?: string | null;
  data?: unknown;
  headers?: Record<string, unknown>;
  cookies?: unknown;
}

export interface SentryBreadcrumbLike {
  message?: string;
  category?: string;
  data?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface SentryEventLike {
  message?: string;
  transaction?: string;
  culprit?: string;
  request?: SentryRequestLike;
  breadcrumbs?: SentryBreadcrumbLike[];
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  user?: Record<string, unknown>;
  exception?: { values?: Array<{ value?: string; type?: string }> };
  [key: string]: unknown;
}

export function stripQueryString(value: string): string {
  const hashAt = value.indexOf("#");
  const beforeHash = hashAt === -1 ? value : value.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : value.slice(hashAt);
  const queryAt = beforeHash.indexOf("?");
  const withoutQuery = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  return withoutQuery + hash;
}

export function scrubSensitiveText(value: string): string {
  return stripQueryString(value)
    .replace(EMAIL, "[redacted]")
    .replace(IBAN, "[redacted]")
    .replace(SORT_CODE, "[redacted]")
    .replace(ACCOUNT, "[redacted]")
    .replace(PHONE, "[redacted]");
}

function shouldDropKey(key: string): boolean {
  return DROP_KEYS.has(key.toLowerCase().replace(/-/g, "_"));
}

function scrubNested(value: unknown): unknown {
  if (typeof value === "string") return scrubSensitiveText(value);
  if (Array.isArray(value)) return value.map((item) => scrubNested(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (shouldDropKey(key)) continue;
    if (key === "url" || key === "to" || key === "from" || key === "transaction") {
      out[key] = typeof child === "string" ? stripQueryString(scrubSensitiveText(child)) : scrubNested(child);
      continue;
    }
    out[key] = scrubNested(child);
  }
  return out;
}

function scrubRequest(request: SentryRequestLike | undefined): SentryRequestLike | undefined {
  if (!request) return request;
  const next: SentryRequestLike = { ...request };
  delete next.data;
  delete next.cookies;
  delete next.query_string;
  if (typeof next.url === "string") next.url = stripQueryString(next.url);
  if (next.headers) {
    const headers: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next.headers)) {
      if (shouldDropKey(key) || /authorization|cookie/i.test(key)) continue;
      headers[key] = typeof value === "string" ? scrubSensitiveText(value) : undefined;
    }
    next.headers = headers;
  }
  return next;
}

export function scrubSentryBreadcrumb<T extends SentryBreadcrumbLike>(breadcrumb: T): T {
  const next = { ...breadcrumb } as T;
  if (typeof next.message === "string") next.message = scrubSensitiveText(next.message);
  if (next.data && typeof next.data === "object") {
    next.data = scrubNested(next.data) as Record<string, unknown>;
  }
  return next;
}

export function scrubSentryEvent<T extends SentryEventLike>(event: T): T {
  const next = { ...event } as T;
  if (typeof next.message === "string") next.message = scrubSensitiveText(next.message);
  if (typeof next.transaction === "string") next.transaction = stripQueryString(next.transaction);
  if (typeof next.culprit === "string") next.culprit = stripQueryString(scrubSensitiveText(next.culprit));
  if (next.request) next.request = scrubRequest(next.request);
  if (next.user) {
    const user = { ...next.user };
    delete user.email;
    delete user.username;
    delete user.ip_address;
    delete user.name;
    next.user = user;
  }
  if (next.extra) next.extra = scrubNested(next.extra) as Record<string, unknown>;
  if (next.contexts) next.contexts = scrubNested(next.contexts) as Record<string, unknown>;
  if (Array.isArray(next.breadcrumbs)) {
    next.breadcrumbs = next.breadcrumbs.map((crumb) => scrubSentryBreadcrumb(crumb));
  }
  if (next.exception?.values) {
    next.exception = {
      ...next.exception,
      values: next.exception.values.map((item) => ({
        ...item,
        value: typeof item.value === "string" ? scrubSensitiveText(item.value) : item.value,
      })),
    };
  }
  return next;
}
