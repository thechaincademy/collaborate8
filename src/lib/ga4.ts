/**
 * GA4 page_view tracking for the SPA.
 *
 * The gtag.js script itself is consent-gated in index.html (window.c8LoadGtag,
 * shared with the Google Ads tag AW-18435476721, so gtag.js loads only once
 * and only after "Accept All"). GA4 is configured there with
 * send_page_view: false - this module sends exactly one page_view per route
 * change instead.
 *
 * Rules enforced here:
 *  - nothing is sent without analytics consent (checked again on every send,
 *    so withdrawing consent stops further sends immediately)
 *  - the first page_view uses the landing URL captured at module load, before
 *    the router can strip the query string, so UTM params are kept
 *  - StrictMode double effects and repeat renders cannot double-send: a URL
 *    is only sent once until the route actually changes
 */

export const GA4_MEASUREMENT_ID = "G-2YB8M4ZYEG";

const CONSENT_KEY = "medi8-cookie-consent"; // set by CookieConsent.tsx
const CONSENT_VALUES = ["accepted", "analytics"];

/** Full landing URL (with query string), captured before the router runs. */
const LANDING_URL = typeof window !== "undefined" ? window.location.href : "";

let lastSentUrl: string | null = null;
let firstSent = false;
let cancelPending: (() => void) | undefined;

const hasConsent = () => {
  try {
    return CONSENT_VALUES.includes(localStorage.getItem(CONSENT_KEY) ?? "");
  } catch {
    return false;
  }
};

/**
 * Wait for Helmet's title update, or one animation frame plus 300ms for
 * same-title routes. New navigation cancels the previous pending page view.
 * The returned cleanup is safe across React StrictMode effect replays.
 */
export const sendGa4PageView = (url?: string) => {
  cancelPending?.();
  const noop = () => {};
  if (!hasConsent()) return noop;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return noop;
  const routeUrl = url ?? window.location.href;
  if (routeUrl === lastSentUrl) return noop;
  const initialTitle = document.title;
  let settled = false;
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    if (document.title !== initialTitle) finish();
  });
  const cancel = () => {
    settled = true;
    observer.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (timer !== undefined) clearTimeout(timer);
    if (cancelPending === cancel) cancelPending = undefined;
  };
  const finish = () => {
    if (settled) return;
    cancel();
    // Consent can change while waiting for the new title.
    if (!hasConsent() || typeof w.gtag !== "function") return;
    const target = !firstSent && LANDING_URL ? LANDING_URL : routeUrl;
    lastSentUrl = routeUrl;
    firstSent = true;
    w.gtag("event", "page_view", {
      send_to: GA4_MEASUREMENT_ID,
      page_location: target,
      page_title: document.title,
    });
  };
  cancelPending = cancel;
  // Observe head as Helmet may replace the title element rather than its text.
  observer.observe(document.head, { subtree: true, childList: true, characterData: true });
  frame = requestAnimationFrame(() => {
    timer = setTimeout(finish, 300);
  });
  return cancel;
};
