/**
 * GA4 page_view tracking for the SPA.
 *
 * The gtag.js script uses Consent Mode v2 in index.html (window.c8LoadGtag,
 * shared with the Google Ads tag AW-18435476721, so gtag.js loads only once
 * with denied storage before "Accept All"). GA4 is configured there with
 * send_page_view: false - this module sends exactly one page_view per route
 * change instead.
 *
 * Rules enforced here:
 *  - every send reapplies the stored Google consent choice; without acceptance,
 *    Google receives cookieless pings with all four consent signals denied
 *  - the first page_view uses the landing URL captured at module load, before
 *    the router can strip the query string, so UTM params are kept
 *  - StrictMode double effects and repeat renders cannot double-send: a URL
 *    is only sent once until the route actually changes
 */

export const GA4_MEASUREMENT_ID = "G-2YB8M4ZYEG";

/** Full landing URL (with query string), captured before the router runs. */
const LANDING_URL = typeof window !== "undefined" ? window.location.href : "";

let lastSentUrl: string | null = null;
let firstSent = false;
let cancelPending: (() => void) | undefined;

/**
 * Wait for Helmet's title update, or one animation frame plus 300ms for
 * same-title routes. New navigation cancels the previous pending page view.
 * The returned cleanup is safe across React StrictMode effect replays.
 */
export const sendGa4PageView = (url?: string) => {
  cancelPending?.();
  const noop = () => {};
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
    c8UpdateGoogleConsent?: () => void;
  };
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
    // Consent can change while waiting for the new title. Denied still allows
    // Google's cookieless visit ping, but never grants storage or ad consent.
    w.c8UpdateGoogleConsent?.();
    if (typeof w.gtag !== "function") return;
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
