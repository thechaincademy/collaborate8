/**
 * First-touch sign-up attribution. Stored only after analytics cookie consent
 * (same "medi8-cookie-consent" gate as GA4/Clarity). First visit wins.
 */
const KEY = "c8_attribution";
const CONSENT_KEY = "medi8-cookie-consent";

// Snapshot the original landing URL and referrer at module load, so a later
// consent in the same session still captures the true first touch.
const LANDING_HREF = typeof window !== "undefined" ? window.location.href : "";
const LANDING_REFERRER = typeof document !== "undefined" ? document.referrer : "";

export interface Attribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  landing_page: string | null;
}

export const buildAttribution = (href: string, referrer: string): Attribution => {
  let url: URL | null = null;
  try { url = new URL(href); } catch { /* ignore */ }
  const p = url?.searchParams;
  const v = (k: string) => (p?.get(k) || "").slice(0, 200) || null;
  return {
    utm_source: v("utm_source"),
    utm_medium: v("utm_medium"),
    utm_campaign: v("utm_campaign"),
    utm_content: v("utm_content"),
    referrer: referrer ? referrer.slice(0, 500) : null,
    landing_page: url ? url.pathname : null,
  };
};

/** Store attribution once, only with consent. Safe to call repeatedly. */
export const captureAttribution = () => {
  try {
    if (localStorage.getItem(CONSENT_KEY) !== "accepted") return;
    if (localStorage.getItem(KEY)) return;
    localStorage.setItem(KEY, JSON.stringify(buildAttribution(LANDING_HREF, LANDING_REFERRER)));
  } catch { /* storage unavailable */ }
};

export const getAttribution = (): Partial<Attribution> => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
};
