import { sendTemplateEmail } from "./transactional-email-templates/send-email.ts";
import { createSupabaseAdmin } from "./supabase.ts";
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

type RuntimeConfig = Record<string, string>;

/**
 * Non-secret alert settings. Function env wins; the server-only table
 * public.sg_runtime_config is the fallback (readable by service role only).
 */
async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const { data } = await createSupabaseAdmin()
      .from("sg_runtime_config")
      .select("key, value")
      .in("key", ["qa_alert_email", "dsl_alert_email", "force_test_alerts"]);
    return Object.fromEntries((data ?? []).map((row) => [row.key as string, row.value as string]));
  } catch {
    return {};
  }
}

function configValue(envName: string, key: string, cfg: RuntimeConfig): string | undefined {
  return Deno.env.get(envName) || cfg[key] || undefined;
}

interface DeliveryRow {
  kind: string;
  test_account: boolean;
  channel: "email" | "sms";
  recipient_role: "qa" | "dsl" | "none";
  recipient_domain?: string | null;
  subject_test_prefix?: boolean | null;
  status: "sent" | "failed" | "dropped" | "skipped";
  reason?: string | null;
}

/** Records delivery metadata only. No message text, no full address, no phone number. */
async function recordDelivery(row: DeliveryRow) {
  try {
    await createSupabaseAdmin().from("sg_alert_deliveries").insert(row);
  } catch {
    console.warn("[safeguarding-notify] delivery log failed");
  }
}

function domainOf(address: string): string | null {
  const at = address.lastIndexOf("@");
  return at > 0 ? address.slice(at + 1).toLowerCase() : null;
}

async function sendEmailChannel(input: NotifyInput, cfg: RuntimeConfig): Promise<{ sent: number; dropped: boolean }> {
  const recipients = alertEmailRecipients(input.testAccount, {
    dsl: configValue("DSL_ALERT_EMAIL", "dsl_alert_email", cfg),
    qa: configValue("QA_ALERT_EMAIL", "qa_alert_email", cfg),
  });
  const role = input.testAccount ? "qa" : "dsl";
  if (recipients.dropped || recipients.to.length === 0) {
    console.warn("[safeguarding-notify] email dropped: missing QA_ALERT_EMAIL");
    await recordDelivery({ kind: input.kind, test_account: input.testAccount, channel: "email", recipient_role: "none", status: "dropped", reason: "missing_qa_email" });
    return { sent: 0, dropped: true };
  }
  const subject = alertSubject(input.kind, input.testAccount);
  const text = alertText(input.kind);
  let sent = 0;
  for (const to of recipients.to) {
    let status: "sent" | "failed" = "failed";
    let reason: string | null = null;
    try {
      const result = await sendTemplateEmail("safeguarding_dsl_alert", to, {
        templateData: { test: input.testAccount, kind: input.kind, subject, text },
        idempotencyKey: `${input.idempotencyKey}:${to}`,
      });
      if (result.sent) {
        sent += 1;
        status = "sent";
      } else {
        reason = "recipient_suppressed";
      }
    } catch (error) {
      reason = (error as Error).message.slice(0, 120);
      console.warn("[safeguarding-notify] email failed", reason);
    }
    await recordDelivery({
      kind: input.kind,
      test_account: input.testAccount,
      channel: "email",
      recipient_role: role,
      recipient_domain: domainOf(to),
      subject_test_prefix: subject.startsWith("[TEST] "),
      status,
      reason,
    });
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
  if (decision === "skip_test" || decision === "skip_hours" || decision === "skip_config") {
    if (decision === "skip_config") console.warn("[safeguarding-notify] sms skipped: missing config");
    await recordDelivery({ kind: input.kind, test_account: input.testAccount, channel: "sms", recipient_role: "none", status: "skipped", reason: decision });
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

export async function notifySafeguarding(rawInput: NotifyInput) {
  const now = rawInput.now ?? new Date();
  const cfg = await loadRuntimeConfig();
  // A test environment sets force_test_alerts so every alert, including monitoring, goes to QA with [TEST].
  const forceTest = configValue("SAFEGUARDING_FORCE_TEST_ALERTS", "force_test_alerts", cfg) === "true";
  const input = { ...rawInput, testAccount: rawInput.testAccount || forceTest };
  if (input.kind === "monitoring" && !isOutOfHours(now)) {
    await recordDelivery({ kind: input.kind, test_account: input.testAccount, channel: "email", recipient_role: "none", status: "skipped", reason: "in_hours_monitoring" });
    return { email: { sent: 0, dropped: false }, sms: { sent: 0, decision: "skip_hours" } };
  }
  const email = await sendEmailChannel(input, cfg);
  const sms = await sendSmsChannel(input, now);
  return { email, sms };
}
