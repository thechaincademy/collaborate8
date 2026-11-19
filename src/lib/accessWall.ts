/**
 * Web-only "Request access" wall. The phone app (and the site inside the app's web view) is
 * never gated. On the website, sign-up is open only to a co-parent with an invite code or to
 * someone Rafa or Jade approved (single-use ?access= link). The server enforces the same rule
 * in the before-user-created auth hook (supabase/manual/NEEDS_RAFA_APPROVAL_access_requests.sql).
 */
export const CLIENT_META_KEY = "c8_client";
export const ACCESS_TOKEN_META_KEY = "c8_access_token";
export const ACCESS_PARAM = "access";

export type SignupGate = "open" | "invite" | "check_link" | "request";

/** What the web sign-up page should do for this visit. */
export const signupGate = ({ inApp, search }: { inApp: boolean; search: string }): SignupGate => {
  if (inApp) return "open";
  const q = new URLSearchParams(search);
  if ((q.get("code") ?? "").trim().length >= 6) return "invite";
  if (isAccessToken(q.get(ACCESS_PARAM))) return "check_link";
  return "request";
};

export const isAccessToken = (t: string | null | undefined): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(t);

/** Sign-up metadata telling the server where the sign-up came from. */
export const signupClientMeta = (inApp: boolean): Record<string, string> => ({ [CLIENT_META_KEY]: inApp ? "app" : "web" });

/** "Sam Parent Jones" -> first "Sam", last "Parent Jones". */
export const splitName = (name: string): { first: string; last: string } => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
};

export const REQUEST_NOTE_MAX = 500;
export const REQUEST_NAME_MAX = 100;
