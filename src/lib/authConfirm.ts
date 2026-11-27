// Rules for /auth/confirm, the page every auth email link opens (see auth-email-rules.ts).
// Email link scanners (Outlook Safe Links and similar) open links before the parent does, so
// opening the page must never use the one-time token. It is only used when the parent presses
// the button. No network and no Supabase imports here, so the bun tests can run it.
// Never log anything this file handles: the token hash signs a person in.

export type ConfirmType = "recovery" | "signup" | "invite" | "magiclink" | "email" | "email_change";

export interface ConfirmParams {
  tokenHash: string;
  type: ConfirmType;
  /** Same-site path to open afterwards. */
  next: string;
}

/** sessionStorage key the inline script in index.html moves the link details to. */
export const CONFIRM_STORAGE_KEY = "c8_auth_confirm";
/** Kept details older than this are ignored (Supabase links last at most a day). */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const TYPES: readonly ConfirmType[] = ["recovery", "signup", "invite", "magiclink", "email", "email_change"];
const TOKEN_RE = /^[A-Za-z0-9_-]{6,256}$/;

const hasControlChar = (v: string) => [...v].some((c) => c.charCodeAt(0) < 32);

export function isAdminConfirmNext(next: string): boolean {
  const path = (next.split("?")[0] || "");
  return path === "/admin" || path.startsWith("/admin/");
}


/** A same-site path only ("/x?y"), never "//host", a backslash trick or control characters. */
export function safeNextPath(value: string | null | undefined): string | null {
  const v = String(value ?? "");
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || hasControlChar(v)) return null;
  return v;
}

export function defaultNext(type: ConfirmType): string {
  return type === "recovery" ? "/reset-password" : "/dashboard";
}

function build(tokenHash: unknown, type: unknown, next: unknown): ConfirmParams | null {
  if (typeof tokenHash !== "string" || !TOKEN_RE.test(tokenHash)) return null;
  if (typeof type !== "string" || !(TYPES as readonly string[]).includes(type)) return null;
  const t = type as ConfirmType;
  return { tokenHash, type: t, next: safeNextPath(typeof next === "string" ? next : null) ?? defaultNext(t) };
}

/** Reads ?token_hash=..&type=..&next=.. from a query string. */
export function parseConfirmParams(search: string): ConfirmParams | null {
  const q = new URLSearchParams(search);
  return build(q.get("token_hash"), q.get("type"), q.get("next"));
}

interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

/** The link details: from the URL when still there, else from what index.html kept in sessionStorage. */
export function readConfirmParams(search: string, storage: StorageLike | null, now = Date.now()): ConfirmParams | null {
  const fromUrl = parseConfirmParams(search);
  if (fromUrl) return fromUrl;
  if (!storage) return null;
  try {
    const raw = storage.getItem(CONFIRM_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.at !== "number" || now - v.at > MAX_AGE_MS || v.at - now > 60_000) {
      storage.removeItem(CONFIRM_STORAGE_KEY);
      return null;
    }
    return build(v.token_hash, v.type, v.next);
  } catch {
    return null;
  }
}

export function clearConfirmParams(storage: StorageLike | null) {
  try {
    storage?.removeItem(CONFIRM_STORAGE_KEY);
  } catch {
    // storage unavailable
  }
}

export interface ConfirmCopy {
  title: string;
  body: string;
  button: string;
  busy: string;
}

export function confirmCopy(type: ConfirmType, next = ""): ConfirmCopy {
  if (isAdminConfirmNext(next) && (type === "magiclink" || type === "email")) {
    return {
      title: "Sign in to Collabor8 admin",
      body: "Press the button below to sign in to the Collabor8 admin area with your founder email.",
      button: "Sign in to admin",
      busy: "Signing you in...",
    };
  }
  switch (type) {
    case "recovery":
      return {
        title: "Reset your password",
        body: "Press the button below to choose a new password for your Collabor8 account.",
        button: "Set new password",
        busy: "Checking your link...",
      };
    case "magiclink":
    case "email":
      return { title: "Sign in to Collabor8", body: "Press the button below to sign in.", button: "Sign in", busy: "Signing you in..." };
    case "email_change":
      return {
        title: "Confirm your new email",
        body: "Press the button below to confirm the change to the email address on your Collabor8 account.",
        button: "Confirm email",
        busy: "Confirming...",
      };
    case "invite":
      return {
        title: "Join Collabor8",
        body: "Press the button below to confirm your email and accept your invitation.",
        button: "Confirm email",
        busy: "Confirming...",
      };
    default:
      return {
        title: "Confirm your email",
        body: "Press the button below to confirm your email address and finish setting up Collabor8.",
        button: "Confirm email",
        busy: "Confirming...",
      };
  }
}

/** The type passed to supabase.auth.verifyOtp({ token_hash, type }). */
export function otpType(type: ConfirmType): "recovery" | "signup" | "invite" | "magiclink" | "email_change" {
  return type === "email" ? "magiclink" : type;
}

export type AfterVerify =
  | { kind: "navigate"; to: string }
  /** Secure email change: this address is confirmed, the other one still has to be. */
  | { kind: "email_change_pending" };

/** Where to go once verifyOtp succeeded. */
export function afterVerify(params: ConfirmParams, hasSession: boolean): AfterVerify {
  if (params.type === "recovery") return hasSession ? { kind: "navigate", to: "/reset-password" } : { kind: "navigate", to: "/forgot-password" };
  if (!hasSession) {
    if (params.type === "email_change") return { kind: "email_change_pending" };
    if (isAdminConfirmNext(params.next)) {
      return { kind: "navigate", to: `/admin/login?next=${encodeURIComponent(params.next)}` };
    }
    return { kind: "navigate", to: "/login" };
  }
  return { kind: "navigate", to: params.next };
}

/** True when Supabase refused the token because it expired or was already used. */
export function isExpiredOrUsed(error: { code?: string; status?: number; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "otp_expired") return true;
  if (error.status === 403 || error.status === 404) return true;
  return /expired|invalid|not found/i.test(error.message ?? "");
}
