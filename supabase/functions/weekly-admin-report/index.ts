import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const ADMIN_EMAILS = ["jade@collaborate8.com", "rafa@collaborate8.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createSupabaseAdmin();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: totalUsers }, { count: newUsers }, { count: linkedPairs }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("coparent_id", "is", null),
    ]);

    const { data: events } = await supabase
      .from("usage_events")
      .select("user_id, tab, path, event_type")
      .gte("created_at", since);

    const { data: payments } = await supabase
      .from("payments")
      .select("amount, status")
      .gte("created_at", since);

    const { count: expensesCount } = await supabase
      .from("expense_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    const rows = events ?? [];
    const activeUsers = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;

    const byTab = new Map<string, { clicks: number; users: Set<string> }>();
    for (const r of rows) {
      const name = (r.tab || r.path || r.event_type || "unknown") as string;
      const entry = byTab.get(name) ?? { clicks: 0, users: new Set<string>() };
      entry.clicks += 1;
      if (r.user_id) entry.users.add(r.user_id as string);
      byTab.set(name, entry);
    }
    const tabs = [...byTab.entries()]
      .map(([name, v]) => ({ name, clicks: v.clicks, users: v.users.size }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 12);

    const paid = (payments ?? []).filter((p) =>
      ["succeeded", "completed", "paid"].includes(String(p.status))
    );
    const paymentsTotal = paid.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const weekKey = new Date().toISOString().slice(0, 10);
    const templateData = {
      periodLabel: `Week ending ${new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      newUsers: newUsers ?? 0,
      totalUsers: totalUsers ?? 0,
      activeUsers,
      totalEvents: rows.length,
      linkedPairs: linkedPairs ?? 0,
      paymentsCount: payments?.length ?? 0,
      paymentsTotal,
      expensesCount: expensesCount ?? 0,
      tabs,
      dashboardUrl: "https://collaborate8.com/admin",
    };

    for (const recipient of ADMIN_EMAILS) {
      try {
        const result = await sendTemplateEmail("admin_weekly_report", recipient, {
          templateData,
          idempotencyKey: `weekly_report:${weekKey}:${recipient}`,
        });
        await supabase.from("email_send_log").insert({
          template_name: "admin_weekly_report",
          recipient_email: recipient,
          status: result.sent ? "sent" : "suppressed",
          error_message: result.sent ? null : "Recipient is suppressed",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Send failed";
        console.error("weekly report send failed", recipient, message);
        await supabase.from("email_send_log").insert({
          template_name: "admin_weekly_report",
          recipient_email: recipient,
          status: "failed",
          error_message: message,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, ...templateData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("weekly-admin-report error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
