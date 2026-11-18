import { cfg } from "./config.ts";
/** Server-only Resend sender. Reads RESEND_API_KEY and EMAIL_FROM. */

export const DEFAULT_FROM = "Collabor8 <alerts@notify.collaborate8.com>";

export function sanitizeEmailError(message: string | null | undefined): string {
  return String(message ?? "error")
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\+?\d[\d\s()-]{6,}\d/g, "[number]")
    .slice(0, 200);
}

export type SendResendResult =
  | { sent: true }
  | { sent: false; reason: "recipient_suppressed" };

export interface SendResendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  idempotencyKey?: string;
}

export async function sendResendEmail(input: SendResendEmailInput): Promise<SendResendResult> {
  const apiKey = cfg("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const from = cfg("EMAIL_FROM") || DEFAULT_FROM;

  const payload: Record<string, unknown> = {
    from,
    to: [input.to],
    subject: input.subject,
  };
  if (input.html) payload.html = input.html;
  if (input.text) payload.text = input.text;
  if (input.replyTo) payload.reply_to = input.replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey || crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) return { sent: true };

  let code = "resend_error";
  let raw = `Resend request failed (${res.status})`;
  try {
    const body = await res.json() as { message?: string; name?: string; code?: string };
    raw = String(body?.message || body?.name || raw);
    code = String(body?.name || body?.code || code);
  } catch {
    try {
      raw = sanitizeEmailError(await res.text()) || raw;
    } catch {
      // keep the status-only message
    }
  }

  const lowered = `${code} ${raw}`.toLowerCase();
  if (code === "recipient_suppressed" || lowered.includes("suppressed")) {
    return { sent: false, reason: "recipient_suppressed" };
  }

  throw new Error(`Resend request failed (${res.status} ${code}): ${sanitizeEmailError(raw)}`);
}
