// Read-only admin analytics. Returns aggregate counts only, never personal data.
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import { getBufferAnalytics } from "../_shared/buffer-analytics.ts";
import { getYouTubeAnalytics } from "../_shared/youtube-analytics.ts";
import { getClarityAnalytics } from "../_shared/clarity-analytics.ts";

const ALLOWED_EMAILS = ["rafa@collaborate8.com", "jade@collaborate8.com"];
const DAY = 24 * 60 * 60 * 1000;
// Test or QA email addresses that are not real Collabor8 users (matched on lowercased email).
const TEST_EMAIL_PATTERNS: RegExp[] = [
  /\+test/,         // plus-addressed test inboxes
  /@example\./,     // reserved example domains
  /^qa@/,           // QA inboxes
  /@test\.com$/,    // test.com addresses
  /@collabor8\.dev$/, // internal dev domain
];

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
    const socialResult = getBufferAnalytics();
    const youtubeResult = getYouTubeAnalytics();
    const clarityResult = getClarityAnalytics();
    const now = Date.now();
    const since7 = new Date(now - 7 * DAY).toISOString();
    const since30 = new Date(now - 30 * DAY).toISOString();
    const count = (q: any) => q.then((r: { count: number | null }) => r.count ?? 0);

    // Auth users (aggregated locally, nothing personal leaves this function)
    const allUsers: { id: string; created_at: string; email?: string | null; email_confirmed_at?: string | null; last_sign_in_at?: string | null; user_metadata?: Record<string, unknown> }[] = [];
    for (let page = 1; page < 200; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      allUsers.push(...data.users);
      if (data.users.length < 1000) break;
    }

    // Excluded set: flagged test accounts plus agentmail test inboxes
    const { data: testProfiles } = await admin.from("profiles").select("id").eq("is_test_account", true);
    const flaggedIds = new Set<string>((testProfiles ?? []).map((p) => p.id as string));
    const excluded = new Set<string>(flaggedIds);
    let agentmailCount = 0, patternCount = 0;
    for (const u of allUsers) {
      const em = (u.email ?? "").toLowerCase();
      if (em.endsWith("@agentmail.to")) { agentmailCount++; excluded.add(u.id); }
      else if (TEST_EMAIL_PATTERNS.some((re) => re.test(em))) { patternCount++; excluded.add(u.id); }
    }
    const users = allUsers.filter((u) => !excluded.has(u.id));
    // Profiles (aggregated locally): non-test profile count, plus sign-ups with no profile row
    const { data: allProfiles } = await admin.from("profiles").select("id");
    const profileIds = new Set<string>((allProfiles ?? []).map((p) => p.id as string));
    const nonTestProfiles = [...profileIds].filter((id) => !excluded.has(id)).length;
    const authUsersWithoutProfile = users.filter((u) => !profileIds.has(u.id)).length;
    const exList = [...excluded];
    const excl = (q: any, col: string) => (exList.length ? q.not(col, "in", `(${exList.join(",")})`) : q);

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
    let confirmed = 0, signIn1 = 0, active7Auth = 0, active30Auth = 0, newUsers7 = 0;
    const t1 = now - DAY, t7 = now - 7 * DAY, t30 = now - 30 * DAY;
    for (const u of users) {
      const c = new Date(u.created_at);
      if (c.getTime() >= t7) newUsers7++;
      const dk = dayKey(c);
      if (dailyMap.has(dk)) dailyMap.set(dk, dailyMap.get(dk)! + 1);
      const wk = dayKey(weekStart(c));
      if (weeklyMap.has(wk)) weeklyMap.set(wk, weeklyMap.get(wk)! + 1);
      if (u.email_confirmed_at) confirmed++;
      const ls = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
      if (ls >= t1) signIn1++;
      if (ls >= t7) active7Auth++;
      if (ls >= t30) active30Auth++;
    }
    for (const [date, n] of dailyMap) daily.push({ date, count: n });
    const weekly = [...weeklyMap].map(([week_start, n]) => ({ week_start, count: n }));

    // Sign-up attribution breakdown (counts only)
    const NONE = "(none)";
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : NONE);
    const host = (v: unknown) => {
      if (typeof v !== "string" || !v) return NONE;
      try { return new URL(v).hostname.replace(/^www\./, "") || NONE; } catch { return NONE; }
    };
    const breakdown = (sinceMs: number) => {
      const dims = { source: new Map<string, number>(), medium: new Map<string, number>(), campaign: new Map<string, number>(), referrer_domain: new Map<string, number>(), acquisition_source: new Map<string, number>() };
      const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
      for (const u of users) {
        if (new Date(u.created_at).getTime() < sinceMs) continue;
        const md = u.user_metadata ?? {};
        inc(dims.source, str(md.utm_source));
        inc(dims.medium, str(md.utm_medium));
        inc(dims.campaign, str(md.utm_campaign));
        inc(dims.referrer_domain, host(md.referrer));
        inc(dims.acquisition_source, str(md.acquisition_source));
      }
      const out = (m: Map<string, number>) => [...m].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
      return { source: out(dims.source), medium: out(dims.medium), campaign: out(dims.campaign), referrer_domain: out(dims.referrer_domain), acquisition_source: out(dims.acquisition_source) };
    };
    const attribution = { last_7d: breakdown(t7), last_30d: breakdown(t30) };

    // Activity-based actives (usage_events), excluding test accounts
    const { data: ev30 } = await excl(
      admin.from("usage_events").select("user_id, created_at").gte("created_at", since30).not("user_id", "is", null),
      "user_id",
    );
    const a7 = new Set<string>(), a30 = new Set<string>();
    for (const e of ev30 ?? []) {
      a30.add(e.user_id as string);
      if (new Date(e.created_at as string).getTime() >= t7) a7.add(e.user_id as string);
    }

    const [
      linkedProfiles,
      invitesSent, invitesAccepted,
      paymentsTotal, payments7, expensesTotal, expenses7,
    ] = await Promise.all([
      count(excl(excl(admin.from("profiles").select("id", { count: "exact", head: true }).not("coparent_id", "is", null), "id"), "coparent_id")),
      count(excl(admin.from("invitations").select("id", { count: "exact", head: true }), "inviter_id")),
      count(excl(admin.from("invitations").select("id", { count: "exact", head: true }).eq("status", "accepted"), "inviter_id")),
      count(excl(excl(admin.from("payments").select("id", { count: "exact", head: true }), "payer_id"), "payee_id")),
      count(excl(excl(admin.from("payments").select("id", { count: "exact", head: true }).gte("created_at", since7), "payer_id"), "payee_id")),
      count(excl(admin.from("expense_requests").select("id", { count: "exact", head: true }), "user_id")),
      count(excl(admin.from("expense_requests").select("id", { count: "exact", head: true }).gte("created_at", since7), "user_id")),
    ]);

    // Premium: conversation_tool_access rows with an active or trialing subscription,
    // or promo access (no subscription status) that has not expired
    const { data: access } = await admin
      .from("conversation_tool_access").select("user_id, expires_at, subscription_status");
    const premium = new Set<string>();
    for (const a of access ?? []) {
      if (excluded.has(a.user_id as string)) continue;
      const notExpired = !a.expires_at || new Date(a.expires_at as string).getTime() > now;
      const status = String(a.subscription_status ?? "");
      const counts = ["active", "trialing"].includes(status) || (!status && notExpired);
      if (notExpired && counts) premium.add(a.user_id as string);
    }

    // Weekly report metrics (copied logic from weekly-admin-report, last 7 days)
    const { data: wEvents } = await excl(
      admin.from("usage_events").select("user_id, tab, path, event_type").gte("created_at", since7),
      "user_id",
    );
    const { data: wPayments } = await excl(
      excl(admin.from("payments").select("amount, status").gte("created_at", since7), "payer_id"),
      "payee_id",
    );
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

    // ---- Expanded metrics (real users only) ----
    const realIds = new Set(users.map((u) => u.id));
    const realCount = users.length;
    const pct = (n: number) => Math.round((n / Math.max(1, realCount)) * 1000) / 10;
    const [{ data: ca }, { data: rp }, { data: cba }] = await Promise.all([
      admin.from("connected_accounts").select("user_id, charges_enabled, onboarding_status"),
      admin.from("recurring_payments").select("user_id, is_active, updated_at"),
      admin.from("coparent_bank_accounts").select("user_id"),
    ]);
    const connectSet = new Set<string>(), recurSet = new Set<string>(), bankSet = new Set<string>();
    for (const r of ca ?? []) if (realIds.has(r.user_id) && (r.charges_enabled === true || r.onboarding_status === "complete")) connectSet.add(r.user_id);
    for (const r of rp ?? []) if (realIds.has(r.user_id)) recurSet.add(r.user_id);
    for (const r of cba ?? []) if (realIds.has(r.user_id)) bankSet.add(r.user_id);
    const setupSet = new Set<string>([...connectSet, ...recurSet, ...bankSet]);

    const { data: ctaFull } = await admin.from("conversation_tool_access")
      .select("user_id, subscription_status, cancel_at_period_end, current_period_end, created_at");
    const premActive = new Set<string>(), premAll = new Set<string>();
    let premCancelAll = 0, premCancel30 = 0;
    for (const r of ctaFull ?? []) {
      if (!realIds.has(r.user_id)) continue;
      premAll.add(r.user_id);
      const st = String(r.subscription_status ?? "");
      if (st === "active" || st === "trialing") premActive.add(r.user_id);
      if (r.cancel_at_period_end === true || st === "canceled") {
        premCancelAll++;
        const cpe = r.current_period_end ? new Date(r.current_period_end).getTime() : 0;
        const cr = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (cpe >= t30 || cr >= t30) premCancel30++;
      }
    }
    let recCancelAll = 0, recCancel30 = 0, recActive = 0;
    for (const r of rp ?? []) {
      if (!realIds.has(r.user_id)) continue;
      if (r.is_active === false) {
        recCancelAll++;
        if (r.updated_at && new Date(r.updated_at).getTime() >= t30) recCancel30++;
      } else recActive++;
    }
    const churnDen = Math.max(1, premActive.size + recActive + premCancel30 + recCancel30);
    const churnRate = Math.round(((premCancel30 + recCancel30) / churnDen) * 1000) / 10;

    // Weekly active users, last 8 Monday-start weeks
    const since56 = new Date(weekStart(today).getTime() - 7 * 7 * DAY).toISOString();
    const wauMap = new Map<string, Set<string>>();
    for (let i = 7; i >= 0; i--) wauMap.set(dayKey(new Date(thisWeek.getTime() - i * 7 * DAY)), new Set());
    for (let from = 0; from < 200000; from += 1000) {
      const { data: evs } = await admin.from("usage_events").select("user_id, created_at")
        .gte("created_at", since56).not("user_id", "is", null).order("created_at").range(from, from + 999);
      for (const e of evs ?? []) {
        if (!realIds.has(e.user_id)) continue;
        wauMap.get(dayKey(weekStart(new Date(e.created_at))))?.add(e.user_id);
      }
      if (!evs || evs.length < 1000) break;
    }
    const weeklyActive = [...wauMap].map(([week_start, s]) => ({ week_start, users: s.size }));

    const { data: linkedRows } = await admin.from("profiles").select("id").not("coparent_id", "is", null);
    const linkedReal = (linkedRows ?? []).filter((r) => realIds.has(r.id)).length;
    const funnel = [
      { step: "Signed up", count: realCount },
      { step: "Linked co-parent", count: linkedReal },
      { step: "Payment set up", count: setupSet.size },
      { step: "Premium", count: premAll.size },
    ];

    const srcMap = new Map<string, number>();
    for (const u of users) {
      const md = u.user_metadata ?? {};
      let v = str(md.utm_source);
      if (v === NONE) v = host(md.referrer);
      if (v === NONE) v = "(direct or unknown)";
      srcMap.set(v, (srcMap.get(v) ?? 0) + 1);
    }
    const bySource = [...srcMap].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    return json({
      social: (await socialResult).social,
      youtube: await youtubeResult,
      clarity: await clarityResult,
      exclusions: {
        flagged_test: flaggedIds.size,
        agentmail: agentmailCount,
        email_pattern: patternCount,
        total_excluded: allUsers.length - realCount,
        real_users: realCount,
      },
      payment_setup: {
        users: setupSet.size,
        pct_of_real_users: pct(setupSet.size),
        stripe_connect_onboarded: connectSet.size,
        recurring_payment_users: recurSet.size,
        bank_details_users: bankSet.size,
      },
      upgrades: { premium_active: premActive.size, all_time: premAll.size, pct_of_real_users: pct(premAll.size) },
      churn: {
        premium_cancelled_30d: premCancel30,
        premium_cancelled_all_time: premCancelAll,
        recurring_cancelled_30d: recCancel30,
        recurring_cancelled_all_time: recCancelAll,
        churn_rate_30d_pct: churnRate,
      },
      weekly_active_8w: weeklyActive,
      funnel,
      signups_by_source_all_time: bySource,
      generated_at: new Date().toISOString(),
      signups: { daily_30d: daily, weekly_8w: weekly },
      accounts: {
        total: nonTestProfiles,
        auth_users_without_profile: authUsersWithoutProfile,
        email_confirmed: confirmed,
        email_unconfirmed: users.length - confirmed,
      },
      active_users: {
        last_1d_sign_in: signIn1,
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
      attribution,
      weekly_report: {
        new_users: newUsers7,
        total_users: users.length,
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
