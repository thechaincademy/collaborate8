// Pure rules for the Supabase Send Email Hook (auth-email-hook). No network, no npm
// imports, so the same code runs in the edge function (Deno) and in the bun tests.
// Never log anything this file handles: payloads hold email addresses, OTPs and token hashes.

export const SITE_NAME = "Collabor8";
export const LIVE_SITE = "https://collaborate8.com";
export const AUTH_FROM_DEFAULT = "Collabor8 <noreply@notify.collaborate8.com>";
/** Standard Webhooks default: refuse signatures more than 5 minutes old or ahead. */
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type EmailActionType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email"
  | "reauthentication"
  | string;

export interface HookUser {
  id?: string;
  email?: string;
  new_email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface HookEmailData {
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  email_action_type: EmailActionType;
  site_url?: string;
  token_new?: string;
  token_hash_new?: string;
  old_email?: string;
}

export interface HookPayload {
  user: HookUser;
  email_data: HookEmailData;
}

/** Which branded template renders a message. */
export type TemplateKind =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "reauthentication"
  | "security_notice";

export interface PlannedEmail {
  /** Recipient. Never log it. */
  to: string;
  template: TemplateKind;
  subject: string;
  /** Short non-personal label for logs and idempotency keys (for example "email_change:current"). */
  label: string;
  props: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Standard Webhooks signature (https://www.standardwebhooks.com), as sent by Supabase Auth.
// Secret format from the dashboard: "v1,whsec_<base64>". Signed content: "<id>.<timestamp>.<body>",
// HMAC-SHA256 with the base64-decoded secret; header "webhook-signature" holds one or more
// space-separated "v1,<base64 signature>" entries.
// ---------------------------------------------------------------------------

export function hookSecretBytes(secret: string | undefined | null): Uint8Array<ArrayBuffer> | null {
  const raw = String(secret ?? "").trim().replace(/^v1,/, "").replace(/^whsec_/, "");
  if (!raw) return null;
  try {
    const bin = atob(raw);
    if (bin.length < 16) return null;
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signHook(secret: Uint8Array<ArrayBuffer>, id: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return `v1,${toBase64(mac)}`;
}

export type VerifyResult = { ok: true } | { ok: false; reason: "missing_secret" | "missing_headers" | "stale_timestamp" | "bad_signature" };

export async function verifyHookSignature(
  secret: string | undefined | null,
  headers: { get(name: string): string | null },
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<VerifyResult> {
  const key = hookSecretBytes(secret);
  if (!key) return { ok: false, reason: "missing_secret" };
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return { ok: false, reason: "missing_headers" };
  const tsNum = Number(ts);
  if (!/^\d+$/.test(ts) || Math.abs(nowSeconds - tsNum) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale_timestamp" };
  }
  const expected = await signHook(key, id, ts, body);
  const match = sigHeader.split(" ").some((s) => s.startsWith("v1,") && safeEqual(s, expected));
  return match ? { ok: true } : { ok: false, reason: "bad_signature" };
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

const BLOCKED_HOST = /(^|\.)lovable\.(app|dev)$|(^|\.)lovableproject\.com$/i;

function cleanHttpsUrl(value: string | undefined | null): URL | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname))) {
      // Custom app schemes (for example a deep link) are allowed only when Supabase itself
      // already accepted them as a redirect; keep them as they are.
      if (u.protocol === "http:") return null;
      return u;
    }
    if (BLOCKED_HOST.test(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

/** The site people return to: email_data.site_url, never a Lovable host, else the live site. */
export function siteOrigin(siteUrl: string | undefined | null): string {
  const u = cleanHttpsUrl(siteUrl);
  if (!u || (u.protocol !== "https:" && u.protocol !== "http:")) return LIVE_SITE;
  return u.origin;
}

const DEFAULT_PATH: Record<string, string> = {
  recovery: "/reset-password",
  signup: "/dashboard",
  invite: "/dashboard",
  magiclink: "/dashboard",
  email: "/dashboard",
  email_change: "/dashboard",
};

/**
 * Where the email link sends people afterwards (feeds confirmUrl). Supabase has already checked redirect_to
 * against the project's allow list (and falls back to site_url when it is not allowed).
 * A bare site root (or nothing, or a Lovable host) becomes the right page on the site, so a
 * password reset always lands on /reset-password.
 */
export function redirectTarget(type: EmailActionType, redirectTo: string | undefined | null, siteUrl: string | undefined | null): string {
  const origin = siteOrigin(siteUrl);
  const path = DEFAULT_PATH[type] ?? "/";
  const u = cleanHttpsUrl(redirectTo);
  if (!u) return `${origin}${path}`;
  const isWeb = u.protocol === "https:" || u.protocol === "http:";
  if (isWeb && (u.pathname === "/" || u.pathname === "") && !u.search && !u.hash) return `${u.origin}${path}`;
  return u.toString();
}

/** The verifyOtp type for each action ("email" OTP sign-in links verify as a magic link). */
export function verifyType(type: EmailActionType): string {
  return type === "email" ? "magiclink" : type;
}

/**
 * Sites an auth email link may open. The link goes to our own /auth/confirm page there, never
 * straight to Supabase's /auth/v1/verify: email link scanners (Outlook Safe Links and similar)
 * open every link, and a GET on /auth/v1/verify spends the one-time token before the parent can.
 */
export const LINK_ORIGINS = [
  "https://collaborate8.com",
  "https://www.collaborate8.com",
  "https://collabor8-uk-test.rafa-f1b.workers.dev",
  "https://collabor8-web.rafa-f1b.workers.dev",
] as const;

const isLinkOrigin = (o: string) => (LINK_ORIGINS as readonly string[]).includes(o);

/** The site the confirm link opens: the redirect's site when allowed, else site_url when allowed, else the live site. */
export function linkOrigin(redirect: string | undefined | null, siteUrl: string | undefined | null): string {
  const u = cleanHttpsUrl(redirect);
  if (u && isLinkOrigin(u.origin)) return u.origin;
  const site = siteOrigin(siteUrl);
  return isLinkOrigin(site) ? site : LIVE_SITE;
}

const hasControlChar = (v: string) => [...v].some((c) => c.charCodeAt(0) < 32);

/** A same-site path only ("/x?y"), never "//host" or a backslash trick. */
export function safeNextPath(value: string | undefined | null): string | null {
  const v = String(value ?? "");
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || hasControlChar(v)) return null;
  return v;
}

/** Where /auth/confirm sends people after verifying: the redirect's path on the same site, else the default page. */
export function nextPath(type: EmailActionType, redirect: string | undefined | null, origin: string): string {
  const fallback = DEFAULT_PATH[type] ?? "/dashboard";
  const u = cleanHttpsUrl(redirect);
  if (!u || u.origin !== origin) return fallback;
  if (u.pathname === "/" && !u.search) return fallback;
  return safeNextPath(u.pathname + u.search) ?? fallback;
}

/**
 * The link put in the email: {site}/auth/confirm?token_hash=..&type=..&next=..
 * Opening it does nothing by itself; the token is only used when the parent presses the button.
 * `redirect` is the value from redirectTarget (Supabase already checked it against its allow list).
 */
/** True when the person should return to the admin area, not the parent app. */
export function isAdminNextPath(next: string): boolean {
  const path = (next.split("?")[0] || "");
  return path === "/admin" || path.startsWith("/admin/");
}

/** Admin magic links use /admin/confirm so they never open the parent app confirm page. */
export function confirmPagePath(next: string): string {
  return isAdminNextPath(next) ? "/admin/confirm" : "/auth/confirm";
}

export function confirmUrl(tokenHash: string, type: EmailActionType, redirect: string, siteUrl: string | undefined | null): string {
  const origin = linkOrigin(redirect, siteUrl);
  const next = nextPath(type, redirect, origin);
  const q = new URLSearchParams({ token_hash: tokenHash, type: verifyType(type), next });
  return `${origin}${confirmPagePath(next)}?${q.toString()}`;
}

// ---------------------------------------------------------------------------
// Subjects and planning
// ---------------------------------------------------------------------------

export const ADMIN_MAGICLINK_SUBJECT = "Your Collabor8 admin sign-in link";

export const SUBJECTS: Record<TemplateKind, string> = {
  signup: "Confirm your email for Collabor8",
  invite: "You've been invited to Collabor8",
  magiclink: "Your Collabor8 sign-in link",
  recovery: "Reset your Collabor8 password",
  email_change: "Confirm your new email for Collabor8",
  reauthentication: "Your Collabor8 verification code",
  security_notice: "Security notice from Collabor8",
};

const NOTICE_TEXT: Record<string, string> = {
  password_changed_notification: "The password for your Collabor8 account was just changed.",
  email_changed_notification: "The email address for your Collabor8 account was just changed.",
  phone_changed_notification: "The phone number for your Collabor8 account was just changed.",
  identity_linked_notification: "A new sign-in method was linked to your Collabor8 account.",
  identity_unlinked_notification: "A sign-in method was removed from your Collabor8 account.",
  mfa_factor_enrolled_notification: "A new verification method was added to your Collabor8 account.",
  mfa_factor_unenrolled_notification: "A verification method was removed from your Collabor8 account.",
};

const LINK_TYPES = new Set(["signup", "invite", "magiclink", "recovery", "email"]);

export class HookPayloadError extends Error {}

/** Turns one hook call into the emails to send. Throws HookPayloadError on a malformed payload. */
export function planAuthEmails(payload: HookPayload): PlannedEmail[] {
  const user = payload?.user ?? {};
  const d = payload?.email_data;
  if (!d || typeof d.email_action_type !== "string") throw new HookPayloadError("missing email_data");
  const type = d.email_action_type;
  const origin = siteOrigin(d.site_url);
  const email = String(user.email ?? "").trim();

  if (LINK_TYPES.has(type)) {
    if (!email) throw new HookPayloadError("missing user email");
    if (!d.token_hash) throw new HookPayloadError("missing token_hash");
    const template: TemplateKind = type === "email" ? "magiclink" : (type as TemplateKind);
    const url = confirmUrl(d.token_hash, type, redirectTarget(type, d.redirect_to, d.site_url), d.site_url);
    const adminLink = new URL(url).pathname === "/admin/confirm";
    const props: Record<string, string> = { siteName: SITE_NAME, siteUrl: origin, confirmationUrl: url };
    if (template === "signup") props.recipient = email;
    if (adminLink && template === "magiclink") {
      props.heading = "Your admin sign-in link";
      props.intro = "Click the button below to sign in to the Collabor8 admin area with your founder email. This link will expire shortly.";
      props.buttonLabel = "Sign in to admin";
      props.preview = "Your admin sign-in link for Collabor8";
    }
    const subject = adminLink && template === "magiclink" ? ADMIN_MAGICLINK_SUBJECT : SUBJECTS[template];
    return [{ to: email, template, subject, label: type, props }];
  }

  if (type === "email_change") {
    const newEmail = String(user.new_email ?? "").trim();
    const current = email || String(d.old_email ?? "").trim();
    if (!newEmail) throw new HookPayloadError("missing new email");
    const redirect = redirectTarget(type, d.redirect_to, d.site_url);
    const base = { siteName: SITE_NAME, siteUrl: origin, oldEmail: current, email: current, newEmail };
    const out: PlannedEmail[] = [];
    // Supabase's field names are reversed for backward compatibility:
    // token_hash_new goes with the CURRENT address, token_hash with the NEW address.
    if (d.token_hash_new && current) {
      out.push({
        to: current, template: "email_change", subject: SUBJECTS.email_change, label: "email_change:current",
        props: { ...base, confirmationUrl: confirmUrl(d.token_hash_new, type, redirect, d.site_url) },
      });
    }
    if (d.token_hash) {
      out.push({
        to: newEmail, template: "email_change", subject: SUBJECTS.email_change, label: "email_change:new",
        props: { ...base, confirmationUrl: confirmUrl(d.token_hash, type, redirect, d.site_url) },
      });
    }
    if (!out.length) throw new HookPayloadError("missing token_hash");
    return out;
  }

  if (type === "reauthentication") {
    if (!email) throw new HookPayloadError("missing user email");
    if (!d.token) throw new HookPayloadError("missing token");
    return [{ to: email, template: "reauthentication", subject: SUBJECTS.reauthentication, label: type, props: { siteName: SITE_NAME, token: d.token } }];
  }

  if (NOTICE_TEXT[type]) {
    if (!email) throw new HookPayloadError("missing user email");
    return [{
      to: email, template: "security_notice", subject: SUBJECTS.security_notice, label: type,
      props: { siteName: SITE_NAME, siteUrl: origin, message: NOTICE_TEXT[type] },
    }];
  }

  throw new HookPayloadError("unsupported email_action_type");
}

/** Error body Supabase Auth expects from a hook. Never put addresses or tokens in message. */
export function hookError(status: number, message: string): { status: number; body: string } {
  return { status, body: JSON.stringify({ error: { http_code: status, message } }) };
}
