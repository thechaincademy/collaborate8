// Read-only admin analytics. Returns aggregate counts only, never personal data.
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";

const ALLOWED_EMAILS = ["rafa@collaborate8.com", "jade@collaborate8.com"];
const DAY = 24 * 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
// Monday-start week key (UTC)
const weekStart = (d: Date) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let caller;
  try {
    caller = await getUserFromRequest(req);
  } catch {
    return json({ error: "Not signed in" }, 401);
  }

  const admin = createSupabaseAdmin();
  const email = (caller.email ?? "").toLowerCase();
  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.id });
  if (!isAdmin || !ALLOWED_EMAILS.includes(email)) return json({ error: "Forbidden" }, 403);

  try {
    const now = Date.now();
    const since7 = new Date(now - 7 * DAY).toISOString();
    const since30 = new Date(now - 30 * DAY).toISOString();
    const count = (q: any) => q.then((r: { count: number | null }) => r.count ?? 0);

    // Auth users (aggregated locally, nothing personal leaves this function)
    const users: { created_at: string; email_confirmed_at?: string | null; last_sign_in_at?: string | null }[] = [];
    for (let page = 1; page < 200; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }

    const today = new Date();
    const daily: { date: string; count: number }[] = [];
    const dailyMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const k = dayKey(new Date(now - i * DAY));
      dailyMap.set(k, 0);
    }
    const weeklyMap = new Map<string, number>();
    const thisWeek = weekStart(today);
    for (let i = 7; i >= 0; i--) {
      weeklyMap.set(dayKey(new Date(thisWeek.getTime() - i * 7 * DAY)), 0);
    }
    let confirmed = 0, active7Auth = 0, active30Auth = 0;
    const t7 = now - 7 * DAY, t30 = now - 30 * DAY;
    for (const u of users) {
      const c = new Date(u.created_at);
      const dk = dayKey(c);
      if (dailyMap.has(dk)) dailyMap.set(dk, dailyMap.get(dk)! + 1);
      const wk = dayKey(weekStart(c));
      if (weeklyMap.has(wk)) weeklyMap.set(wk, weeklyMap.get(wk)! + 1);
      if (u.email_confirmed_at) confirmed++;
      const ls = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
      if (ls >= t7) active7Auth++;
      if (ls >= t30) active30Auth++;
    }
    for (const [date, n] of dailyMap) daily.push({ date, count: n });
    const weekly = [...weeklyMap].map(([week_start, n]) => ({ week_start, count: n }));

    // Activity-based actives (usage_events)
    const { data: ev30 } = await admin
      .from("usage_events").select("user_id, created_at").gte("created_at", since30).not("user_id", "is", null);
    const a7 = new Set<string>(), a30 = new Set<string>();
    for (const e of ev30 ?? []) {
      a30.add(e.user_id as string);
      if (new Date(e.created_at as string).getTime() >= t7) a7.add(e.user_id as string);
    }

    const [
      totalProfiles, newProfiles7, linkedProfiles,
      invitesSent, invitesAccepted,
      paymentsTotal, payments7, expensesTotal, expenses7,
    ] = await Promise.all([
      count(admin.from("profiles").select("id", { count: "exact", head: true })),
      count(admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7)),
      count(admin.from("profiles").select("id", { count: "exact", head: true }).not("coparent_id", "is", null)),
      count(admin.from("invitations").select("id", { count: "exact", head: true })),
      count(admin.from("invitations").select("id", { count: "exact", head: true }).eq("status", "accepted")),
      count(admin.from("payments").select("id", { count: "exact", head: true })),
      count(admin.from("payments").select("id", { count: "exact", head: true }).gte("created_at", since7)),
      count(admin.from("expense_requests").select("id", { count: "exact", head: true })),
      count(admin.from("expense_requests").select("id", { count: "exact", head: true }).gte("created_at", since7)),
    ]);

    // Premium: distinct users with an unexpired access row
    const { data: access } = await admin
      .from("conversation_tool_access").select("user_id, expires_at, subscription_status");
    const premium = new Set<string>();
    for (const a of access ?? []) {
      const notExpired = !a.expires_at || new Date(a.expires_at as string).getTime() > now;
      const badStatus = ["canceled", "incomplete_expired", "unpaid"].includes(String(a.subscription_status ?? ""));
      if (notExpired && !badStatus) premium.add(a.user_id as string);
    }

    // Weekly report metrics (copied logic from weekly-admin-report, last 7 days)
    const { data: wEvents } = await admin
      .from("usage_events").select("user_id, tab, path, event_type").gte("created_at", since7);
    const { data: wPayments } = await admin
      .from("payments").select("amount, status").gte("created_at", since7);
    const rows = wEvents ?? [];
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
    const paid = (wPayments ?? []).filter((p) => ["succeeded", "completed", "paid"].includes(String(p.status)));

    return json({
      generated_at: new Date().toISOString(),
      signups: { daily_30d: daily, weekly_8w: weekly },
      accounts: {
        total_auth_users: users.length,
        total_profiles: totalProfiles,
        email_confirmed: confirmed,
        email_unconfirmed: users.length - confirmed,
      },
      active_users: {
        last_7d_sign_in: active7Auth,
        last_30d_sign_in: active30Auth,
        last_7d_activity: a7.size,
        last_30d_activity: a30.size,
      },
      invites: { sent: invitesSent, accepted: invitesAccepted },
      linked_pairs: Math.floor(linkedProfiles / 2),
      payments: { total: paymentsTotal, last_7d: payments7 },
      expenses: { total: expensesTotal, last_7d: expenses7 },
      premium_subscribers: premium.size,
      weekly_report: {
        new_users: newProfiles7,
        total_users: totalProfiles,
        active_users: new Set(rows.map((r) => r.user_id).filter(Boolean)).size,
        total_events: rows.length,
        linked_pairs: linkedProfiles,
        payments_count: wPayments?.length ?? 0,
        payments_total: paid.reduce((s, p) => s + Number(p.amount || 0), 0),
        expenses_count: expenses7,
        tabs,
      },
    });
  } catch (e) {
    console.error("admin-analytics error", e);
    return json({ error: "Internal error" }, 500);
  }
});
