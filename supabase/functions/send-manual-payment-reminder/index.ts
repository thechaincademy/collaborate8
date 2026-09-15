import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createSupabaseAdmin();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dayOfMonth = now.getUTCDate();
    const dayOfWeek = WEEKDAYS[now.getUTCDay()];

    // Last day of the current month, so a "31st" schedule still fires in short months.
    const lastDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();

    const { data: accounts, error } = await supabase
      .from("coparent_bank_accounts")
      .select("*")
      .eq("reminders_enabled", true);

    if (error) throw error;

    let sent = 0;

    for (const account of accounts ?? []) {
      const isMonthly = account.frequency === "monthly";
      const scheduledDay = Math.min(Number(account.day_of_month ?? 1), lastDayOfMonth);
      const due = isMonthly
        ? dayOfMonth === scheduledDay
        : String(account.day_of_week ?? "").toLowerCase() === dayOfWeek;

      if (!due) continue;

      // Never send twice for the same day.
      if (account.last_reminder_sent_at && String(account.last_reminder_sent_at).slice(0, 10) === today) {
        continue;
      }

      const [{ data: profile }, { data: authUser }] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", account.user_id).maybeSingle(),
        supabase.auth.admin.getUserById(account.user_id),
      ]);

      const recipient = authUser?.user?.email;
      if (!recipient) continue;

      const amountLabel = account.amount ? `£${Number(account.amount).toFixed(2)}` : "";

      try {
        const result = await sendTemplateEmail("manual_payment_reminder", recipient, {
          templateData: {
            firstName: profile?.first_name || "there",
            amountLabel,
            holderName: account.holder_name,
            sortCode: account.sort_code,
            accountNumber: account.account_number,
            paymentReference: account.payment_reference ?? "",
          },
          idempotencyKey: `manual_payment_reminder:${account.id}:${today}`,
        });

        await supabase.from("email_send_log").insert({
          template_name: "manual_payment_reminder",
          recipient_email: recipient,
          status: result.sent ? "sent" : "suppressed",
          error_message: result.sent ? null : "Recipient is suppressed",
        });

        await supabase
          .from("coparent_bank_accounts")
          .update({ last_reminder_sent_at: now.toISOString() })
          .eq("id", account.id);

        if (result.sent) sent += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Send failed";
        console.error("manual payment reminder failed", account.id, message);
        await supabase.from("email_send_log").insert({
          template_name: "manual_payment_reminder",
          recipient_email: recipient,
          status: "failed",
          error_message: message,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-manual-payment-reminder error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
