/**
 * True when the site is running inside the Collabor8 mobile app's web view.
 * The app marks <html>/<body> with `c8-in-app`, adds `Collabor8App` to the user agent,
 * or opens the page with `?app=1` (kept for this tab so later navigations stay in-app).
 * Inside the app, Premium must not be priced or sold (App Store 3.1.3(b), Google Play).
 */
const IN_APP_SESSION_KEY = "c8-in-app";

/** Remember `?app=1` for this tab. Later pages in the web view often drop the query. */
const appParamRemembered = (): boolean => {
  try {
    if (new URLSearchParams(window.location.search).get("app") === "1") {
      if (sessionStorage.getItem(IN_APP_SESSION_KEY) !== "1") {
        sessionStorage.setItem(IN_APP_SESSION_KEY, "1");
      }
      return true;
    }
    return sessionStorage.getItem(IN_APP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
};

export const isInApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const remembered = appParamRemembered();
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("Collabor8App")) return true;
  if (remembered) return true;
  const html = document.documentElement;
  const body = document.body;
  return !!(html?.classList.contains("c8-in-app") || body?.classList.contains("c8-in-app"));
};
