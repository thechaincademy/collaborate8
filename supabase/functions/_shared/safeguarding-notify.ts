import { sendTemplateEmail } from "./transactional-email-templates/send-email.ts";
import {
  alertEmailRecipients,
  alertSubject,
  alertText,
  isOutOfHours,
  smsConfigured,
  smsDecision,
  splitList,
  type AlertKind,
} from "./safeguarding-rules.ts";

/**
 * Email and SMS are separate channels. A future provider plugs into sendSms
 * without changing callers. SMS_PROVIDER is the provider name (UK, TBD).
 * This file never logs phone numbers, message bodies from parents, or secrets.
 */

export interface NotifyInput {
  kind: AlertKind;
  testAccount: boolean;
  /** Stable per family and kind. Do not include the hour. */
  idempotencyKey: string;
  now?: Date;
}

export interface SmsMessage {
  to: string;
  body: string;
  senderId: string;
}

export interface SmsSendResult {
  ok: boolean;
  status: number;
}

/** Provider adapter. The HTTP call for a named UK provider is added here later. */
export async function sendSms(provider: string, _apiKey: string, message: SmsMessage): Promise<SmsSendResult> {
  if (!provider || provider === "pending" || provider === "tbd" || provider === "none") {
    console.warn("[safeguarding-notify] sms skipped: provider not implemented");
    return { ok: false, status: 0 };
  }
  console.warn("[safeguarding-notify] sms skipped: provider not implemented");
  void message.body;
  void message.senderId;
  return { ok: false, status: 501 };
}

async function sendEmailChannel(input: NotifyInput): Promise<{ sent: number; dropped: boolean }> {
  const recipients = alertEmailRecipients(input.testAccount, {
    dsl: Deno.env.get("DSL_ALERT_EMAIL"),
    qa: Deno.env.get("QA_ALERT_EMAIL"),
  });
  if (recipients.dropped || recipients.to.length === 0) {
    console.warn("[safeguarding-notify] email dropped: missing QA_ALERT_EMAIL");
    return { sent: 0, dropped: true };
  }
  const subject = alertSubject(input.kind, input.testAccount);
  const text = alertText(input.kind);
  let sent = 0;
  for (const to of recipients.to) {
    try {
      const result = await sendTemplateEmail("safeguarding_dsl_alert", to, {
        templateData: { test: input.testAccount, kind: input.kind, subject, text },
        idempotencyKey: `${input.idempotencyKey}:${to}`,
      });
      if (result.sent) sent += 1;
    } catch (error) {
      console.warn("[safeguarding-notify] email failed", (error as Error).message);
    }
  }
  return { sent, dropped: false };
}

async function sendSmsChannel(input: NotifyInput, now: Date): Promise<{ sent: number; decision: string }> {
  const env = {
    provider: Deno.env.get("SMS_PROVIDER"),
    apiKey: Deno.env.get("SMS_API_KEY"),
    senderId: Deno.env.get("SMS_SENDER_ID"),
    numbers: Deno.env.get("DSL_SMS_NUMBERS"),
  };
  const decision = smsDecision({
    kind: input.kind,
    testAccount: input.testAccount,
    outOfHours: isOutOfHours(now),
    configured: smsConfigured(env),
  });
  if (decision === "skip_test") return { sent: 0, decision };
  if (decision === "skip_hours") return { sent: 0, decision };
  if (decision === "skip_config") {
    console.warn("[safeguarding-notify] sms skipped: missing config");
    return { sent: 0, decision };
  }
  const numbers = splitList(env.numbers);
  const body = alertText(input.kind);
  let sent = 0;
  for (const to of numbers) {
    const result = await sendSms(env.provider ?? "", env.apiKey ?? "", {
      to,
      body,
      senderId: env.senderId ?? "",
    });
    if (result.ok) sent += 1;
  }
  console.warn(`[safeguarding-notify] sms finished count=${sent}`);
  return { sent, decision };
}

export async function notifySafeguarding(input: NotifyInput) {
  const now = input.now ?? new Date();
  if (input.kind === "monitoring" && !isOutOfHours(now)) {
    return { email: { sent: 0, dropped: false }, sms: { sent: 0, decision: "skip_hours" } };
  }
  const email = await sendEmailChannel(input);
  const sms = await sendSmsChannel(input, now);
  return { email, sms };
}
