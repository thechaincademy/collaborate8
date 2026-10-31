// Remembers the email address a person last tried to sign up with, so the log-in
// page can prefill the box that asks for a new confirmation link. Email only.
const KEY = "c8_last_signup_email";

export function rememberLastSignupEmail(email: string) {
  try {
    const value = email.trim();
    if (!value) return;
    localStorage.setItem(KEY, value);
  } catch {
    // storage may be unavailable (private mode); ignore
  }
}

export function readLastSignupEmail(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
