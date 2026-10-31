// Captures expired/used email confirmation link errors at app start, before
// any route guard redirects away, and keeps them for the /login page.
const KEY = "c8_confirm_link_error";

export function captureConfirmLinkError() {
  try {
    const { pathname, hash, search } = window.location;
    if (pathname.startsWith("/reset-password")) return; // handled by ResetPassword
    const h = new URLSearchParams(hash.replace(/^#/, ""));
    const q = new URLSearchParams(search);
    const error = h.get("error") ?? q.get("error");
    const code = h.get("error_code") ?? q.get("error_code");
    if (error !== "access_denied" && code !== "otp_expired") return;
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), email: q.get("email") ?? "" }));
    ["error", "error_code", "error_description"].forEach((k) => { h.delete(k); q.delete(k); });
    const qs = q.toString();
    const hs = h.toString();
    window.history.replaceState(window.history.state, "", pathname + (qs ? `?${qs}` : "") + (hs ? `#${hs}` : ""));
  } catch {
    // ignore
  }
}

/** Returns the captured error (valid for 10 minutes) and clears it. */
export function consumeConfirmLinkError(): { email: string } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const v = JSON.parse(raw);
    if (Date.now() - v.at > 10 * 60 * 1000) return null;
    return { email: v.email ?? "" };
  } catch {
    return null;
  }
}
