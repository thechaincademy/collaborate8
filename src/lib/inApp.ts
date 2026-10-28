/**
 * True when the site is running inside the Collabor8 mobile app's web view.
 * The app marks <html>/<body> with `c8-in-app` or adds `Collabor8App` to the user agent.
 * Inside the app, Premium must not be priced or sold (App Store 3.1.3(b), Google Play).
 */
export const isInApp = (): boolean => {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("Collabor8App")) return true;
  const html = document.documentElement;
  const body = document.body;
  return !!(html?.classList.contains("c8-in-app") || body?.classList.contains("c8-in-app"));
};
