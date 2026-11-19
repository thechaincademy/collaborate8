/**
 * Pure rules for the web "Request access" wall, shared by the request-access edge function
 * and the unit tests. No Deno or Supabase imports, no secrets. Never log a note or a phone.
 */

export const DEFAULT_REVIEWER_EMAILS = ["rafa@collaborate8.com", "jade@collaborate8.com"] as const;
export const QA_INBOX_DEFAULT = "collaborate8-qa@agentmail.to";
export const PUBLIC_SITE = "https://collaborate8.com";
/** Sites a link in an email may point at. Anything else falls back to collaborate8.com. */
export const LINK_ORIGINS = [
  "https://collaborate8.com",
  "https://www.collaborate8.com",
  "https://collabor8-uk-test.rafa-f1b.workers.dev",
] as const;

export const NAME_MAX = 100;
export const NOTE_MAX = 500;
export const EMAIL_MAX = 254;
/** How long an approval sign-up link works. */
export const TOKEN_DAYS = 14;

const EMAIL_RE = /^[^\s@,<>()]+@[^\s@,<>()]+\.[^\s@,<>()]{2,}$/;

export function normaliseEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/** Test and QA addresses: the QA inbox (agentmail.to) or a +uk test alias. */
export function isTestEmail(email: string): boolean {
  const e = normaliseEmail(email);
  if (!e.includes("@")) return false;
  const [local, domain] = [e.slice(0, e.lastIndexOf("@")), e.slice(e.lastIndexOf("@") + 1)];
  return domain === "agentmail.to" || /\+uk/.test(local);
}

export type RequestInput = { email: string; name: string; note: string | null };
export type ValidationResult = { ok: true; value: RequestInput } | { ok: false; field: "email" | "name" | "note"; error: string };

export function validateRequest(body: unknown): ValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = normaliseEmail(b.email);
  const name = typeof b.name === "string" ? b.name.replace(/\s+/g, " ").trim() : "";
  const noteRaw = typeof b.note === "string" ? b.note.trim() : "";
  if (!name) return { ok: false, field: "name", error: "Please tell us your name." };
  if (name.length > NAME_MAX) return { ok: false, field: "name", error: `Please keep your name under ${NAME_MAX} characters.` };
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return { ok: false, field: "email", error: "Please enter a valid email address." };
  }
  if (noteRaw.length > NOTE_MAX) return { ok: false, field: "note", error: `Please keep your note under ${NOTE_MAX} characters.` };
  return { ok: true, value: { email, name, note: noteRaw ? noteRaw : null } };
}

export function splitEmails(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;\s]+/)
    .map((e) => normaliseEmail(e))
    .filter((e) => EMAIL_RE.test(e));
}

/**
 * Who gets the "someone asked to join" email. A test or QA request only ever goes to the
 * QA inbox, so Rafa and Jade are never emailed about test traffic.
 */
export function reviewerRecipients(
  requesterEmail: string,
  env: { reviewers?: string | null; qa?: string | null },
): { to: string[]; test: boolean } {
  if (isTestEmail(requesterEmail)) {
    const qa = splitEmails(env.qa).filter((e) => e.endsWith("@agentmail.to"));
    return { to: qa.length ? qa : [QA_INBOX_DEFAULT], test: true };
  }
  const list = splitEmails(env.reviewers);
  return { to: list.length ? list : [...DEFAULT_REVIEWER_EMAILS], test: false };
}

export function withTestPrefix(subject: string, test: boolean): string {
  return test ? `[TEST] ${subject}` : subject;
}

/** A link base taken from the caller's Origin header, only if it is one of our sites. */
export function linkBase(origin: string | null | undefined): string {
  const o = (origin ?? "").trim().replace(/\/+$/, "").toLowerCase();
  return (LINK_ORIGINS as readonly string[]).includes(o) ? o : PUBLIC_SITE;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** 32 random bytes as URL-safe base64 (43 characters). */
export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function looksLikeToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(t);
}

/** Lower-case hex SHA-256, the same value Postgres gives for encode(sha256(convert_to(t,'UTF8')),'hex'). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- Emails ----------

const wrap = (inner: string) =>
  `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111111;padding:24px">` +
  `<div style="max-width:520px;margin:0 auto">${inner}` +
  `<p style="margin:24px 0 0;font-size:13px;color:#666666">Collabor8</p></div></body></html>`;
const p = (html: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333">${html}</p>`;
const button = (href: string, label: string, bg: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:10px;background:${bg};color:#ffffff;font-weight:700;font-size:15px;text-decoration:none">${escapeHtml(label)}</a>`;

export type Email = { subject: string; html: string; text: string };

export function reviewerEmail(input: { id: string; name: string; email: string; note: string | null; base: string; test: boolean }): Email {
  const page = `${input.base}/admin/access-requests`;
  const approve = `${page}?id=${encodeURIComponent(input.id)}&action=approve`;
  const reject = `${page}?id=${encodeURIComponent(input.id)}&action=reject`;
  const subject = withTestPrefix(`New request to join Collabor8: ${input.name}`, input.test);
  const note = input.note ? p(`<strong>Their note:</strong><br>${escapeHtml(input.note).replace(/\n/g, "<br>")}`) : p("They didn't add a note.");
  const html = wrap(
    p(`<strong>${escapeHtml(input.name)}</strong> (${escapeHtml(input.email)}) has asked to join Collabor8 on the website.`) +
      note +
      p("Both buttons open the admin page, where you confirm your choice. Nothing changes until you do.") +
      `<div style="margin:0 0 16px">${button(approve, "Approve", "#2F6B4F")}${button(reject, "Reject", "#8A4B3A")}</div>` +
      p(`Or see every request: <a href="${escapeHtml(page)}" style="color:#B8860B">${escapeHtml(page)}</a>`),
  );
  const text =
    `${input.name} (${input.email}) has asked to join Collabor8 on the website.\n\n` +
    (input.note ? `Their note:\n${input.note}\n\n` : "They didn't add a note.\n\n") +
    `Approve: ${approve}\nReject: ${reject}\n\nBoth links open the admin page, where you confirm your choice.\n\nCollabor8`;
  return { subject, html, text };
}

export function approvalEmail(input: { name: string; link: string; test: boolean }): Email {
  const first = input.name.split(" ")[0] || "there";
  const subject = withTestPrefix("You're invited to join Collabor8", input.test);
  const html = wrap(
    p(`Hi ${escapeHtml(first)},`) +
      p("Thanks for your interest in Collabor8. Your request has been approved, so you can now create your account.") +
      `<div style="margin:0 0 16px">${button(input.link, "Create your account", "#2F6B4F")}</div>` +
      p(`This link works once and lasts ${TOKEN_DAYS} days. Please use the same email address this message was sent to.`) +
      p("If you didn't ask to join, you can ignore this email."),
  );
  const text =
    `Hi ${first},\n\nThanks for your interest in Collabor8. Your request has been approved, so you can now create your account:\n${input.link}\n\n` +
    `This link works once and lasts ${TOKEN_DAYS} days. Please use the same email address this message was sent to.\n\nIf you didn't ask to join, you can ignore this email.\n\nCollabor8`;
  return { subject, html, text };
}

export function rejectionEmail(input: { name: string; test: boolean }): Email {
  const first = input.name.split(" ")[0] || "there";
  const subject = withTestPrefix("Your request to join Collabor8", input.test);
  const body1 = "Thank you for asking to join Collabor8. We're opening up slowly so we can look after every family well, and we can't offer you a place just yet.";
  const body2 = "We're sorry about that, and we hope to welcome more families soon. If your co-parent already uses Collabor8, they can invite you from the app.";
  const html = wrap(p(`Hi ${escapeHtml(first)},`) + p(body1) + p(body2));
  const text = `Hi ${first},\n\n${body1}\n\n${body2}\n\nCollabor8`;
  return { subject, html, text };
}

// ---------- Client and hook rules (mirrored in the SQL hook) ----------

/** Sign-up metadata key the website sends: "web", or "app" inside the app's web view. */
export const CLIENT_META_KEY = "c8_client";
export const ACCESS_TOKEN_META_KEY = "c8_access_token";

/**
 * Plain mirror of the decision public.c8_before_user_created makes, kept here so the rules
 * are unit tested. The database lookups are passed in as booleans.
 */
export function signupDecision(input: {
  email: string;
  meta: Record<string, unknown>;
  inviteIsValid: boolean;
  approvalTokenIsValid: boolean;
}): "test" | "app" | "invite" | "approved" | "deny" {
  const e = normaliseEmail(input.email);
  if (/^collaborate8-qa(\+[a-z0-9._-]+)?@agentmail\.to$/.test(e) || /^[^@]+\+uk[a-z0-9._-]*@collaborate8\.com$/.test(e)) return "test";
  const client = typeof input.meta[CLIENT_META_KEY] === "string" ? (input.meta[CLIENT_META_KEY] as string) : "";
  const acq = typeof input.meta.acquisition_source === "string" ? (input.meta.acquisition_source as string).trim() : "";
  if (client === "app") return "app";
  if (client === "" && acq !== "") return "app";
  if (input.inviteIsValid) return "invite";
  if (input.approvalTokenIsValid) return "approved";
  return "deny";
}
