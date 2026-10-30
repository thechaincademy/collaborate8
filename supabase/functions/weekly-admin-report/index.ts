import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const ADMIN_EMAILS = ["jade@collaborate8.com", "rafa@collaborate8.com"];
const UK = "Europe/London";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "prefix";

async function readSubjectPrefix(req: Request): Promise<string> {
  let raw: unknown = new URL(req.url).searchParams.get("subject_prefix");
  if (req.method === "POST") {
    try {
      const body = await req.clone().json();
      if (body && typeof body.subject_prefix === "string") raw = body.subject_prefix;
    } catch { /* no JSON body */ }
  }
  return typeof raw === "string" ? raw.trim().slice(0, 40).trim() : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createSupabaseAdmin();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const subjectPrefix = await readSubjectPrefix(req);

    const { data: summaryData, error: summaryError } = await supabase.rpc("admin_signup_summary", { _weeks: 8 });
    if (summaryError) throw summaryError;
    const summary = (summaryData ?? {}) as any;

    // Shared sign-up classification (paged past the default row limit)
    const excluded = new Set<string>();
    const real = new Set<string>();
    for (let from = 0; from < 1_000_000; from += 1000) {
      const { data, error } = await supabase.rpc("admin_signup_classification").range(from, from + 999);
      if (error) throw error;
      for (const r of data ?? []) {
        if (r.exclusion_reason) excluded.add(r.user_id);
        else real.add(r.user_id);
      }
      if (!data || data.length < 1000) break;
    }

    const { data: linkedRows } = await supabase.from("profiles").select("id").not("coparent_id", "is", null);
    const linkedPairs = (linkedRows ?? []).filter((r) => real.has(r.id as string)).length;

    const { data: events } = await supabase
      .from("usage_events")
      .select("user_id, tab, path, event_type")
      .gte("created_at", since);

    const { data: payments } = await supabase
      .from("payments")
      .select("amount, status, payer_id, payee_id")
      .gte("created_at", since);

    const { data: expenses } = await supabase
      .from("expense_requests")
      .select("user_id, created_at")
      .gte("created_at", since);

    const rows = (events ?? []).filter((r) => !r.user_id || !excluded.has(r.user_id as string));
    const activeUsers = new Set(rows.map((r) => r.user_id as string).filter((id) => id && real.has(id))).size;

    const byTab = new Map<string, { clicks: number; users: Set<string> }>();
    for (const r of rows) {
      if (r.event_type !== "tab_click") continue;
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

    const realPayments = (payments ?? []).filter(
      (p) => !(p.payer_id && excluded.has(p.payer_id as string)) && !(p.payee_id && excluded.has(p.payee_id as string)),
    );
    const paid = realPayments.filter((p) => ["succeeded", "completed", "paid"].includes(String(p.status)));
    const paymentsTotal = paid.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expensesCount = (expenses ?? []).filter((e) => !excluded.has(e.user_id as string)).length;

    const nowDate = new Date();
    const last7 = summary.last_7_full_days ?? {};
    const wsf = summary.this_week_so_far ?? {};
    const total = summary.total ?? {};
    const activityTo = nowDate.toLocaleString("en-GB", {
      timeZone: UK, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const weekKey = nowDate.toISOString().slice(0, 10);
    const templateData = {
      periodLabel: `Week ending ${nowDate.toLocaleDateString("en-GB", {
        timeZone: UK,
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      newUsers: Number(last7.real_parent_signups ?? 0),
      newUsersConfirmed: Number(last7.confirmed ?? 0),
      newUsersLabel: String(last7.label ?? "Last 7 full days"),
      weekSoFar: {
        label: String(wsf.label ?? "This week (so far)"),
        real: Number(wsf.real_parent_signups ?? 0),
        confirmed: Number(wsf.confirmed ?? 0),
      },
      totalUsers: Number(total.real_parent_signups ?? 0),
      totalUsersConfirmed: Number(total.confirmed ?? 0),
      weekly: (Array.isArray(summary.weekly) ? summary.weekly : []).map((w: any) => ({
        label: String(w.label ?? w.week_start_uk ?? ""),
        real: Number(w.real_parent_signups ?? 0),
        confirmed: Number(w.confirmed ?? 0),
        isPartial: Boolean(w.is_partial),
      })),
      excluded: (summary.excluded ?? {}) as Record<string, number>,
      activityLabel: `Last 7 days (rolling, to ${activityTo} UK)`,
      activeUsers,
      totalEvents: rows.length,
      linkedPairs,
      linkedPairsLabel: "Linked co-parents (real parents)",
      paymentsCount: realPayments.length,
      paymentsTotal,
      expensesCount,
      tabs,
      dashboardUrl: "https://collaborate8.com/admin",
      ...(subjectPrefix ? { subjectPrefix } : {}),
    };

    for (const recipient of ADMIN_EMAILS) {
      try {
        const idempotencyKey = subjectPrefix
          ? `weekly_report:${weekKey}:${slug(subjectPrefix)}:${recipient}`
          : `weekly_report:${weekKey}:${recipient}`;
        const result = await sendTemplateEmail("admin_weekly_report", recipient, {
          templateData,
          idempotencyKey,
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
