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

export const GA4_MEASUREMENT_ID = "G-QLHPHSQVJJ";

const CONSENT_KEY = "medi8-cookie-consent"; // set by CookieConsent.tsx
const CONSENT_VALUES = ["accepted", "analytics"];

/** Full landing URL (with query string), captured before the router runs. */
const LANDING_URL = typeof window !== "undefined" ? window.location.href : "";

let lastSentUrl: string | null = null;
let firstSent = false;

const hasConsent = () => {
  try {
    return CONSENT_VALUES.includes(localStorage.getItem(CONSENT_KEY) ?? "");
  } catch {
    return false;
  }
};

/**
 * Send a GA4 page_view for the given URL (defaults to the current location).
 * The first send after consent uses the captured landing URL. Repeat sends of
 * the same URL are ignored.
 */
export const sendGa4PageView = (url?: string) => {
  if (!hasConsent()) return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  const target = !firstSent && LANDING_URL ? LANDING_URL : (url ?? window.location.href);
  if (target === lastSentUrl) return;
  lastSentUrl = target;
  firstSent = true;
  // send_to keeps this event on GA4 only, so the Ads tag does not double-count
  w.gtag("event", "page_view", { send_to: GA4_MEASUREMENT_ID, page_location: target });
};
