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
 *  - GA drops the pre-consent cookieless landing ping, so when analytics
 *    consent becomes granted (banner Accept, or a stored earlier acceptance)
 *    exactly one consented landing page_view is re-sent with the original
 *    landing URL, its UTM query string and the original document.referrer.
 *    A sessionStorage flag guarantees it fires only once per session and
 *    never doubles with the normal route page_views. When the flag survives
 *    a reload in the same session, the first send falls back to a regular
 *    route page_view instead of being dropped
 *  - StrictMode double effects and repeat renders cannot double-send: a URL
 *    is only sent once until the route actually changes
 */

export const GA4_MEASUREMENT_ID = "G-2YB8M4ZYEG";

/** Full landing URL (with query string), captured before the router runs. */
const LANDING_URL = typeof window !== "undefined" ? window.location.href : "";
/** Original referrer, captured at first load for campaign attribution. */
const LANDING_REFERRER = typeof document !== "undefined" ? document.referrer : "";
/** sessionStorage flag: the consented landing page_view fires once per session. */
const LANDING_SENT_KEY = "c8-ga4-landing-pv";

let lastSentUrl: string | null = null;
let firstSent = false;
let landingConsentedSent = false;
let cancelPending: (() => void) | undefined;

type GaWindow = {
  gtag?: (...args: unknown[]) => void;
  c8UpdateGoogleConsent?: () => void;
};

const isConsentGranted = () => {
  try {
    return localStorage.getItem("medi8-cookie-consent") === "accepted";
  } catch {
    return false;
  }
};

const landingAlreadySent = () => {
  if (landingConsentedSent) return true;
  try {
    return sessionStorage.getItem(LANDING_SENT_KEY) === "1";
  } catch {
    return false;
  }
};

const markLandingSent = () => {
  landingConsentedSent = true;
  try {
    sessionStorage.setItem(LANDING_SENT_KEY, "1");
  } catch {
    /* storage unavailable */
  }
};

/** The landing hit: original URL with UTMs, current title, original referrer. */
const landingHit = (w: GaWindow) => {
  w.gtag?.("event", "page_view", {
    send_to: GA4_MEASUREMENT_ID,
    page_location: LANDING_URL,
    page_title: document.title,
    page_referrer: LANDING_REFERRER,
  });
};

/**
 * Sends the one consented landing page_view (original URL with UTMs and the
 * original referrer) once analytics consent is granted. The consent update
 * runs first so the hit goes out with analytics_storage granted. Fires at
 * most once per session and never doubles with the route tracker.
 */
export const sendGa4ConsentedLandingPageView = () => {
  const w = window as unknown as GaWindow;
  if (typeof w.gtag !== "function") return;
  if (landingAlreadySent() || !isConsentGranted()) return;
  w.c8UpdateGoogleConsent?.();
  markLandingSent();
  landingHit(w);
};

/**
 * Wait for Helmet's title update, or one animation frame plus 300ms for
 * same-title routes. New navigation cancels the previous pending page view.
 * The returned cleanup is safe across React StrictMode effect replays.
 */
export const sendGa4PageView = (url?: string) => {
  cancelPending?.();
  const noop = () => {};
  const w = window as unknown as GaWindow;
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
    if (!firstSent && LANDING_URL) {
      firstSent = true;
      lastSentUrl = routeUrl;
      if (isConsentGranted()) {
        // Consented first hit: original landing URL + referrer, once per
        // session. Skip only when the banner Accept handler already sent
        // it in THIS page load, so it never doubles.
        if (landingConsentedSent) return;
        if (!landingAlreadySent()) {
          markLandingSent();
          landingHit(w);
          return;
        }
        // Reloaded in the same session: the consented landing hit went out
        // once already, so this first send is a regular route page_view.
        w.gtag("event", "page_view", {
          send_to: GA4_MEASUREMENT_ID,
          page_location: routeUrl,
          page_title: document.title,
        });
        return;
      }
      // No consent yet: cookieless landing ping (GA drops it, but the visit
      // signal is kept). The consented re-send happens on Accept.
      landingHit(w);
      return;
    }
    lastSentUrl = routeUrl;
    firstSent = true;
    w.gtag("event", "page_view", {
      send_to: GA4_MEASUREMENT_ID,
      page_location: routeUrl,
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
