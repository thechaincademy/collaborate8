/**
 * Internal traffic (team, QA bots, test accounts) is left out of analytics.
 * A device is marked with localStorage "c8_internal" = "1". index.html runs
 * the same URL switch inline before any tracker can load.
 */
export const INTERNAL_KEY = "c8_internal";
export const INTERNAL_PARAM = "c8_internal";

const TEAM_EMAILS = ["rafa@collaborate8.com", "jade@collaborate8.com"];
const QA_BOT_PATTERN = /^collaborate8-qa.*@agentmail\.to$/i;

type TrackerWindow = Window & {
  clarity?: (...args: unknown[]) => void;
  [key: string]: unknown;
};

export const isInternalDevice = (): boolean => {
  try {
    return localStorage.getItem(INTERNAL_KEY) === "1";
  } catch {
    return false;
  }
};

/** Opt trackers already on this page out, where they support it. */
export const optOutLoadedTrackers = () => {
  try {
    const w = window as unknown as TrackerWindow;
    w["ga-disable-G-2YB8M4ZYEG"] = true;
    w["ga-disable-AW-18435476721"] = true;
    if (typeof w.clarity === "function") w.clarity("consent", false);
  } catch {
    /* tracker optional */
  }
};

export const markInternalDevice = () => {
  try {
    localStorage.setItem(INTERNAL_KEY, "1");
  } catch {
    /* storage unavailable */
  }
  optOutLoadedTrackers();
};

export const clearInternalDevice = () => {
  try {
    localStorage.removeItem(INTERNAL_KEY);
  } catch {
    /* storage unavailable */
  }
};

export const isInternalEmail = (email?: string | null): boolean => {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  return TEAM_EMAILS.includes(e) || QA_BOT_PATTERN.test(e);
};

export const isInternalUser = ({ email, isTestAccount }: { email?: string | null; isTestAccount?: boolean | null }) =>
  isTestAccount === true || isInternalEmail(email);

export const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

/** True when nothing from this page view may be tracked. */
export const isInternalTraffic = (): boolean => {
  if (isInternalDevice()) return true;
  try {
    return isAdminPath(window.location.pathname);
  } catch {
    return false;
  }
};

/**
 * Applies ?c8_internal=1 (mark) or ?c8_internal=0 (clear) and removes only
 * that parameter from the address bar. Returns the action taken.
 */
export const applyInternalUrlSwitch = (): "marked" | "cleared" | null => {
  try {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(INTERNAL_PARAM);
    if (value === null) return null;
    let result: "marked" | "cleared" | null = null;
    if (value === "1") {
      markInternalDevice();
      result = "marked";
    } else if (value === "0") {
      clearInternalDevice();
      result = "cleared";
    }
    url.searchParams.delete(INTERNAL_PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    return result;
  } catch {
    return null;
  }
};
