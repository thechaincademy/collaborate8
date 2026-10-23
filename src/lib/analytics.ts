import { supabase } from "@/integrations/supabase/client";

/**
 * Product usage analytics (Product Tracker row 7).
 *
 * Privacy rules - enforced here AND in the database (see migration):
 *  - store only: event name, timestamp, user id (or an anonymous id), and a
 *    few non-personal properties from the allow-list below
 *  - never message text, names, emails, file names or exact amounts
 *    (use amountBucket() for money)
 *  - NOTHING is recorded (signed in or out, database or Clarity) unless the
 *    visitor has given analytics consent in the cookie banner ("Accept All")
 */

export type UsageEvent =
  | "tab_click"
  | "signup_started"
  | "signup_completed"
  | "login"
  | "expense_added"
  | "expense_approved"
  | "expense_rejected"
  | "chat_message_sent"
  | "document_uploaded"
  | "payment_started"
  | "payment_completed"
  | "chatbot_opened"
  | "chatbot_message_sent"
  | "coparent_invite_sent"
  | "coparent_linked"
  | "decision_created"
  | "benefits_viewed"
  | "calculator_used";

/** Events that may be recorded before sign-in (anonymous id only). */
const ANON_ALLOWED: UsageEvent[] = ["signup_started", "signup_completed", "calculator_used"];

/** The only property keys we ever store. Values must be short strings, numbers or booleans. */
const ALLOWED_PROPS = [
  "tab",
  "flow",
  "method",
  "source",
  "surface",
  "kind",
  "category",
  "priority",
  "product",
  "interval",
  "amount_bucket",
  "file_type",
  "has_receipt",
  "has_deadline",
  "require_ack",
  "used_suggestion",
  "rewritten",
  "pending",
  "options_count",
  "action",
] as const;

type PropKey = (typeof ALLOWED_PROPS)[number];
export type UsageProps = Partial<Record<PropKey, string | number | boolean>>;

const CONSENT_KEY = "medi8-cookie-consent"; // set by CookieConsent.tsx
const ANON_KEY = "c8_anon_id";

// GA4 page_view tracking lives in ./ga4.ts; the gtag.js script itself is
// in index.html (window.c8LoadGtag), shared with Ads and using Consent Mode v2.


/** "accepted" = Accept All. "analytics" is reserved for a future analytics-only choice. */
const CONSENT_VALUES = ["accepted", "analytics"];

export const hasAnalyticsConsent = () => {
  try {
    return CONSENT_VALUES.includes(localStorage.getItem(CONSENT_KEY) ?? "");
  } catch {
    return false;
  }
};

/** Random per-browser id, created only after analytics consent. Never derived from personal data. */
const getAnonymousId = (): string | null => {
  if (!hasAnalyticsConsent()) return null;
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};

const cleanProps = (props?: UsageProps) => {
  if (!props) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const key of ALLOWED_PROPS) {
    const v = props[key];
    if (v === undefined || v === null) continue;
    if (typeof v === "string") out[key] = v.slice(0, 40);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
  }
  return Object.keys(out).length ? out : null;
};

/** Money as a coarse bucket, never the exact amount. */
export const amountBucket = (amount: number | string | null | undefined): string => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "none";
  if (n < 25) return "<25";
  if (n < 100) return "25-99";
  if (n < 250) return "100-249";
  if (n < 500) return "250-499";
  return "500+";
};

/** "pdf" | "image" | "other" - never the file name. */
export const fileType = (file: File | { type?: string } | null | undefined): string => {
  const t = file?.type ?? "";
  if (t === "application/pdf") return "pdf";
  if (t.startsWith("image/")) return "image";
  return "other";
};

const sendToClarity = (name: UsageEvent) => {
  if (name === "tab_click") return;
  try {
    const clarity = (window as unknown as { clarity?: (...args: unknown[]) => void }).clarity;
    clarity?.("event", name);
  } catch {
    // Clarity is optional
  }
};

/**
 * Record one usage event. Never throws, never blocks the UI.
 * Does nothing at all without analytics consent (checked on every call, so it
 * starts working as soon as the visitor clicks "Accept All").
 * Signed in: stored with the user's id (and the anonymous id, so test accounts'
 * earlier signed-out events can be excluded). Signed out: anonymous id only,
 * and only for ANON_ALLOWED events.
 */
export const track = async (name: UsageEvent, props?: UsageProps): Promise<void> => {
  if (!hasAnalyticsConsent()) return;
  try {
    sendToClarity(name);
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;
    const anonymousId = getAnonymousId();
    if (!userId && (!anonymousId || !ANON_ALLOWED.includes(name))) return;

    const metadata = name === "tab_click" ? null : cleanProps(props);
    await supabase.from("usage_events").insert([
      {
        user_id: userId,
        anonymous_id: anonymousId,
        event_type: name,
        tab: name === "tab_click" ? (props?.tab as string | undefined) : undefined,
        path: window.location.pathname.slice(0, 120),
        metadata: metadata as never,
      },
    ]);
  } catch (error) {
    console.warn("usage tracking failed", error);
  }
};

/**
 * Use right before a full-page redirect (Stripe Checkout), so the insert is
 * not cancelled by the navigation. Waits at most `maxWaitMs`.
 */
export const trackBeforeRedirect = (name: UsageEvent, props?: UsageProps, maxWaitMs = 800) =>
  Promise.race([track(name, props), new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs))]);

/** Kept for existing callers. */
export const trackEvent = async (
  eventType: UsageEvent,
  options: { tab?: string; metadata?: UsageProps } = {},
) => track(eventType, { ...(options.metadata ?? {}), ...(options.tab ? { tab: options.tab } : {}) });

export const trackTab = (tab: string) => track("tab_click", { tab });
