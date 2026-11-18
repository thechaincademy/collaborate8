// Auth email links return to the site the person is using (live site or London test site).
// Outside a normal https page (for example a local file or app shell) fall back to the live site.
const LIVE_ORIGIN = "https://collaborate8.com";

export const siteOrigin = () => {
  if (typeof window === "undefined") return LIVE_ORIGIN;
  const { protocol, origin } = window.location;
  return protocol === "https:" || protocol === "http:" ? origin : LIVE_ORIGIN;
};

export const confirmRedirect = () => `${siteOrigin()}/dashboard`;
export const resetRedirect = () => `${siteOrigin()}/reset-password`;
