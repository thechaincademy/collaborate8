import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ALLOWED = ["rafa@collaborate8.com", "jade@collaborate8.com"];

type Dim = "source" | "medium" | "campaign" | "referrer_domain" | "acquisition_source";
const DIMS: { key: Dim; label: string }[] = [
  { key: "source", label: "Source" },
  { key: "medium", label: "Medium" },
  { key: "campaign", label: "Campaign" },
  { key: "referrer_domain", label: "Referrer" },
  { key: "acquisition_source", label: "App acquisition source" },
];

interface Analytics {
  generated_at: string;
  signups: { daily_30d: { date: string; count: number }[]; weekly_8w: { week_start: string; count: number }[] };
  accounts: { total: number; auth_users_without_profile: number; email_confirmed: number; email_unconfirmed: number };
  active_users: { last_1d_sign_in: number; last_7d_sign_in: number; last_30d_sign_in: number; last_7d_activity: number; last_30d_activity: number };
  invites: { sent: number; accepted: number };
  linked_pairs: number;
  payments: { total: number; last_7d: number };
  expenses: { total: number; last_7d: number };
  premium_subscribers: number;
  exclusions?: { flagged_test: number; agentmail: number; email_pattern: number; total_excluded: number; real_users: number };
  payment_setup?: { users: number; pct_of_real_users: number; stripe_connect_onboarded: number; recurring_payment_users: number; bank_details_users: number };
  upgrades?: { premium_active: number; all_time: number; pct_of_real_users: number };
  churn?: { premium_cancelled_30d: number; premium_cancelled_all_time: number; recurring_cancelled_30d: number; recurring_cancelled_all_time: number; churn_rate_30d_pct: number };
  weekly_active_8w?: { week_start: string; users: number }[];
  funnel?: { step: string; count: number }[];
  signups_by_source_all_time?: { value: string; count: number }[];
  attribution: Record<"last_7d" | "last_30d", Record<Dim, { value: string; count: number }[]>>;
  weekly_report: {
    new_users: number; total_users: number; active_users: number; total_events: number;
    linked_pairs: number; payments_count: number; payments_total: number; expenses_count: number;
    tabs: { name: string; clicks: number; users: number }[];
  };
}

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="mb-3 text-lg font-semibold">{title}</h2>
    {children}
  </section>
);

const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const HOW_WE_COUNT: [string, string][] = [
  ["Real users", "Everyone who signed up, minus accounts flagged as test, agentmail inboxes and known test email patterns."],
  ["Accounts", "Real users who have a Collabor8 profile."],
  ["Sign-ups", "Real users counted on the day or week they created their account."],
  ["Active users", "Sign-in counts use the last time someone signed in; activity counts use anything they did in the app."],
  ["Linked co-parents", "Real users whose profile is linked to a co-parent."],
  ["Payment set up", "Real users who finished Stripe onboarding, set up a recurring payment, or added bank details."],
  ["Premium", "Real users with an active or trialing Premium subscription right now."],
  ["Upgrades", "Real users who have ever had Premium access, even if it has since ended."],
  ["Churn and churn rate", "Cancelled Premium plans and stopped recurring payments; the rate is cancellations in the last 30 days divided by active plus recently cancelled."],
  ["Sources", "The UTM source a person arrived with, otherwise the site that referred them, otherwise direct or unknown."],
  ["Weekly active users", "Real users who did anything in the app in each Monday to Sunday week."],
];

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
    <CardContent className="h-56 p-2">
      <ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer>
    </CardContent>
  </Card>
);

const AdminAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"week" | "day">("week");
  const [range, setRange] = useState<"last_7d" | "last_30d">("last_7d");

  const emailOk = ALLOWED.includes((user?.email ?? "").toLowerCase());

  useEffect(() => {
    if (!user) return;
    if (!emailOk) { setIsAdmin(false); return; }
    supabase.rpc("is_admin", { _user_id: user.id }).then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user, emailOk]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.functions.invoke("admin-analytics").then(({ data, error }) => {
      if (error) setError("Could not load analytics.");
      else setData(data as Analytics);
    });
  }, [isAdmin]);

  if (authLoading || (user && isAdmin === null)) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const chartData = data
    ? view === "week"
      ? data.signups.weekly_8w.map((w) => ({ label: fmtDay(w.week_start), count: w.count }))
      : data.signups.daily_30d.map((d) => ({ label: fmtDay(d.date), count: d.count }))
    : [];

  return (
    <>
      <Helmet>
        <title>Analytics - Collabor8</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="mx-auto max-w-md px-4 py-8 md:max-w-3xl">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Collabor8 counts only. Read-only.</p>

        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
        {!data && !error && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        )}

        {data && (
          <>
            <Section title="Sign-ups">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                  <CardTitle className="text-sm font-medium">
                    {view === "week" ? "Per week, last 8 weeks" : "Per day, last 30 days"}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button size="sm" variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>Week</Button>
                    <Button size="sm" variant={view === "day" ? "default" : "outline"} onClick={() => setView("day")}>Day</Button>
                  </div>
                </CardHeader>
                <CardContent className="h-56 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} fontSize={10} width={28} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Sign-ups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Section>

            <Section title="Overview">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {data.exclusions && (
                  <Stat label="Real users" value={data.exclusions.real_users} hint={`${data.exclusions.total_excluded} test accounts excluded`} />
                )}
                {data.payment_setup && (
                  <Stat label="Payment set up" value={data.payment_setup.users} hint={`${data.payment_setup.pct_of_real_users}% of real users`} />
                )}
                {data.upgrades && (
                  <Stat label="Premium" value={data.upgrades.premium_active} hint={`${data.upgrades.all_time} upgrades all time (${data.upgrades.pct_of_real_users}%)`} />
                )}
                {data.churn && (
                  <Stat
                    label="Churn, 30 days"
                    value={`${data.churn.churn_rate_30d_pct}%`}
                    hint={`${data.churn.premium_cancelled_30d + data.churn.recurring_cancelled_30d} cancelled in 30 days, ${data.churn.premium_cancelled_all_time + data.churn.recurring_cancelled_all_time} all time`}
                  />
                )}
              </div>
              {data.payment_setup && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Payment set up: {data.payment_setup.stripe_connect_onboarded} Stripe onboarded, {data.payment_setup.recurring_payment_users} recurring payments, {data.payment_setup.bank_details_users} bank details.
                </p>
              )}
            </Section>

            <Section title="Charts">
              <div className="grid gap-3 md:grid-cols-2">
                <ChartCard title="Sign-ups over time, last 30 days">
                  <LineChart data={data.signups.daily_30d.map((d) => ({ label: fmtDay(d.date), count: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} fontSize={10} width={28} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Sign-ups" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartCard>
                <ChartCard title="Weekly active users, last 8 weeks">
                  <BarChart data={(data.weekly_active_8w ?? []).map((w) => ({ label: fmtDay(w.week_start), users: w.users }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" fontSize={10} tickLine={false} />
                    <YAxis allowDecimals={false} fontSize={10} width={28} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="users" name="Active users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
                <ChartCard title="Sign-up funnel">
                  <BarChart
                    layout="vertical"
                    margin={{ right: 56 }}
                    data={(data.funnel ?? []).map((f) => {
                      const base = Math.max(1, data.funnel?.[0]?.count ?? 1);
                      return { ...f, label: `${f.count} (${Math.round((f.count / base) * 1000) / 10}%)` };
                    })}
                  >
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="step" fontSize={10} width={96} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Users" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="label" position="right" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ChartCard>
                <ChartCard title="Sign-ups by source, all time">
                  <BarChart data={data.signups_by_source_all_time ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="value" fontSize={10} tickLine={false} interval={0} angle={-30} textAnchor="end" height={56} />
                    <YAxis allowDecimals={false} fontSize={10} width={28} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Sign-ups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
            </Section>

            <Section title="Where sign-ups come from">
              <div className="mb-3 flex gap-1">
                <Button size="sm" variant={range === "last_7d" ? "default" : "outline"} onClick={() => setRange("last_7d")}>7 days</Button>
                <Button size="sm" variant={range === "last_30d" ? "default" : "outline"} onClick={() => setRange("last_30d")}>30 days</Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {DIMS.map(({ key, label }) => {
                  const rows = data.attribution?.[range]?.[key] ?? [];
                  return (
                    <Card key={key}>
                      <CardContent className="space-y-2 p-4">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        {rows.length === 0 && <p className="text-sm text-muted-foreground">No sign-ups</p>}
                        {rows.map((r) => (
                          <div key={r.value} className="flex justify-between text-sm">
                            <span className="truncate pr-2">{r.value}</span>
                            <span className="tabular-nums text-muted-foreground">{r.count}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </Section>

            <Section title="Accounts">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat
                  label="Total accounts"
                  value={data.accounts.total}
                  hint={
                    data.accounts.auth_users_without_profile === 0
                      ? undefined
                      : `${data.accounts.auth_users_without_profile} sign-up${data.accounts.auth_users_without_profile === 1 ? "" : "s"} without a profile`
                  }
                />

                <Stat label="Email confirmed" value={data.accounts.email_confirmed} />
                <Stat label="Email unconfirmed" value={data.accounts.email_unconfirmed} />
                <Stat label="Premium (conversation tools)" value={data.premium_subscribers} />
                <Stat label="Linked co-parent pairs" value={data.linked_pairs} />
              </div>
            </Section>

            <Section title="Active users">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Signed in, 24 hours" value={data.active_users.last_1d_sign_in} />
                <Stat label="Signed in, 7 days" value={data.active_users.last_7d_sign_in} />
                <Stat label="Signed in, 30 days" value={data.active_users.last_30d_sign_in} />
                <Stat label="Used the app, 7 days" value={data.active_users.last_7d_activity} />
                <Stat label="Used the app, 30 days" value={data.active_users.last_30d_activity} />
              </div>
            </Section>

            <Section title="Invites, payments and expenses">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat label="Invites sent" value={data.invites.sent} />
                <Stat label="Invites accepted" value={data.invites.accepted} />
                <Stat label="Payments created" value={data.payments.total} hint={`${data.payments.last_7d} in last 7 days`} />
                <Stat label="Expenses created" value={data.expenses.total} hint={`${data.expenses.last_7d} in last 7 days`} />
              </div>
            </Section>

            <Section title="Weekly report (last 7 days)">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat label="New users" value={data.weekly_report.new_users} />
                <Stat label="Total users" value={data.weekly_report.total_users} />
                <Stat label="Active users" value={data.weekly_report.active_users} />
                <Stat label="Total events" value={data.weekly_report.total_events} />
                <Stat label="Linked profiles" value={data.weekly_report.linked_pairs} />
                <Stat label="Payments" value={data.weekly_report.payments_count} />
                <Stat label="Paid total" value={`£${data.weekly_report.payments_total.toFixed(2)}`} />
                <Stat label="Expenses" value={data.weekly_report.expenses_count} />
              </div>
              {data.weekly_report.tabs.length > 0 && (
                <Card className="mt-3">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-xs text-muted-foreground">Top areas (clicks / users)</p>
                    {data.weekly_report.tabs.map((t) => (
                      <div key={t.name} className="flex justify-between text-sm">
                        <span className="truncate pr-2">{t.name}</span>
                        <span className="tabular-nums text-muted-foreground">{t.clicks} / {t.users}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Section>
          </>
        )}

        <Section title="How we count">
          <details className="rounded-lg border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">Show definitions</summary>
            <dl className="mt-3 space-y-2 text-sm">
              {HOW_WE_COUNT.map(([k, v]) => (
                <div key={k}><dt className="font-medium">{k}</dt><dd className="text-muted-foreground">{v}</dd></div>
              ))}
            </dl>
          </details>
        </Section>

        <Section title="Website and social">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {["Website visitors", "Instagram", "Facebook", "LinkedIn", "TikTok"].map((l) => (
              <Stat key={l} label={l} value="-" hint="Coming soon" />
            ))}
          </div>
        </Section>
      </div>
    </>
  );
};

export default AdminAnalytics;
