import { sendResendEmail, sanitizeEmailError } from "./resend.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReminderType = "setup_bank_account" | "send_payment";

const TEMPLATES: Record<ReminderType, { subject: string; body: (name: string) => string }> = {
  setup_bank_account: {
    subject: "Your co-parent is ready to send payments on Collabor8",
    body: (name) =>
      `Hi${name ? " " + name : ""},\n\nYour co-parent has set up their payment method on Collabor8 and is ready to send you money. To start receiving payments, please connect your bank account.\n\nLog in: https://collaborate8.com\n\nCollabor8`,
  },
  send_payment: {
    subject: "Your co-parent has connected their bank account on Collabor8",
    body: (name) =>
      `Hi${name ? " " + name : ""},\n\nYour co-parent has connected their bank account on Collabor8 and is ready to receive payments. You can now set up a recurring payment or send a one-off transfer.\n\nLog in: https://collaborate8.com\n\nCollabor8`,
  },
};

export async function sendCoparentReminder(
  recipientUserId: string,
  senderUserId: string,
  type: ReminderType,
): Promise<{ emailSent: boolean; error?: string }> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const { data: recipientProfile } = await admin
    .from("profiles")
    .select("first_name")
    .eq("id", recipientUserId)
    .single();

  const { data: recipientUser } = await admin.auth.admin.getUserById(recipientUserId);
  const email = recipientUser?.user?.email;
  const template = TEMPLATES[type];
  const subject = template.subject;
  const text = template.body(recipientProfile?.first_name ?? "");

  let emailSent = false;
  let error: string | undefined;

  if (email) {
    try {
      const result = await sendResendEmail({ to: email, subject, text, idempotencyKey: `coparent-reminder/${type}/${recipientUserId}` });
      emailSent = result.sent;
      if (!result.sent) error = result.reason;
    } catch (err) {
      error = sanitizeEmailError((err as Error).message);
      console.error("Reminder email failed", error);
    }
  } else {
    error = "Email sender not configured";
  }

  await admin.from("audit_events").insert({
    user_id: senderUserId,
    event_type: "coparent_reminder_sent",
    metadata: { type, recipientUserId, emailSent, error },
  });

  return { emailSent, error };
}
