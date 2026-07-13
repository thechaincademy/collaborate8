import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReminderType = "setup_bank_account" | "send_payment";

const TEMPLATES: Record<ReminderType, { subject: string; body: (name: string) => string }> = {
  setup_bank_account: {
    subject: "Your co-parent is ready to send payments on Collabor8",
    body: (name) =>
      `Hi${name ? " " + name : ""},\n\nYour co-parent has set up their payment method on Collabor8 and is ready to send you money. To start receiving payments, please connect your bank account.\n\nLog in: https://collaborate8.lovable.app\n\n— Collabor8`,
  },
  send_payment: {
    subject: "Your co-parent has connected their bank account on Collabor8",
    body: (name) =>
      `Hi${name ? " " + name : ""},\n\nYour co-parent has connected their bank account on Collabor8 and is ready to receive payments. You can now set up a recurring payment or send a one-off transfer.\n\nLog in: https://collaborate8.lovable.app\n\n— Collabor8`,
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

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  let emailSent = false;
  let error: string | undefined;

  if (email && lovableKey && resendKey) {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: "Collabor8 <onboarding@resend.dev>",
        to: [email],
        subject,
        text,
      }),
    });
    if (res.ok) {
      emailSent = true;
    } else {
      error = await res.text();
      console.error("Reminder email failed", res.status, error);
    }
  } else {
    error = "Email sender not configured (missing RESEND connector or verified domain)";
  }

  await admin.from("audit_events").insert({
    user_id: senderUserId,
    event_type: "coparent_reminder_sent",
    metadata: { type, recipientUserId, emailSent, error },
  });

  return { emailSent, error };
}
