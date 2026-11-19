// What the website's sign-in page shows when signing in fails. Shown inline on the page (not
// only as a toast), so a wrong password always gives a visible message.
// Accounts copied to the new UK database have no password yet, so a wrong-password answer also
// tells returning parents to set a new one. This only links to /forgot-password: nothing is
// emailed until the person asks for the reset there.

export const INVALID_CREDENTIALS_TEXT = "Invalid login credentials";
export const UPGRADE_LINE = "We've upgraded Collabor8. If you used it before, please set a new password to continue.";
export const SET_PASSWORD_LINK_TEXT = "Set a new password";

export type LoginErrorView =
  | { kind: "invalid_credentials"; text: string; upgrade: string }
  | { kind: "email_not_confirmed"; text: string }
  | { kind: "other"; text: string };

export function loginErrorView(error: { message?: string | null; code?: string | null } | null | undefined): LoginErrorView | null {
  if (!error) return null;
  const message = (error.message ?? "").trim();
  if (error.code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return { kind: "invalid_credentials", text: `${INVALID_CREDENTIALS_TEXT}. Please check your email and password.`, upgrade: UPGRADE_LINE };
  }
  if (error.code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return { kind: "email_not_confirmed", text: "Please confirm your email first. We sent you a link when you signed up." };
  }
  return { kind: "other", text: message || "We couldn't log you in. Please try again." };
}

/** The forgot-password page, with the typed email filled in when there is one. */
export function forgotPasswordHref(email: string): string {
  const e = email.trim();
  return e ? `/forgot-password?email=${encodeURIComponent(e)}` : "/forgot-password";
}
