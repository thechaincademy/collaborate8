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
  social?: { buffer_ok: boolean; error?: string; organization_name: string | null; fetched_at: string; channels: Record<string, SocialChannel> };
  youtube?: { ok: boolean; error?: string; channel_id: string | null; title: string | null; handle: string; subscribers: number | null; total_views: number | null; video_count: number | null; recent_videos: { title: string; published_at: string; url: string; views: number | null; likes: number | null; comments: number | null }[]; fetched_at: string };
  clarity?: { ok: boolean; error?: string; stale?: boolean; days: number; fetched_at: string; sessions: number | null; pages_per_session: number | null; scroll_depth_pct: number | null; dead_click_pct: number | null; rage_click_pct: number | null; quickback_pct: number | null; excessive_scroll_pct: number | null; top_pages: { url: string; sessions: number }[] };
  google?: GoogleData;
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

interface SocialChannel {
  connected: boolean; disconnected: boolean; name: string | null; error?: string;
  last7: SocialMetrics; last30: SocialMetrics;
  daily: { date: string; impressions: number | null; reach: number | null; engagements: number | null }[];
  top_posts: { text: string; sent_at: string; link: string | null; impressions: number | null; reach: number | null; engagements: number | null }[];
  followers: null; followers_available: false;
}
interface SocialMetrics {
  posts: number | null; reach: number | null; impressions: number | null;
  reactions: number | null; comments: number | null; shares: number | null; engagement_rate: number | null;
}
const SocialCard = ({ title, channel, error }: { title: string; channel?: SocialChannel; error?: string }) => {
  const [period, setPeriod] = useState<"last7" | "last30">("last7");
  const metrics = channel?.[period];
  const format = (n: number | null | undefined) => n == null ? "Not reported" : n.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  const hasImpressions = channel?.daily.some((d) => d.impressions !== null);
  const message = channel?.error ?? error;
  return (
    <Card className="min-w-0">
      <CardHeader className="p-4 pb-2"><CardTitle className="text-base">{title}</CardTitle>
        {channel?.name && <p className="break-words text-xs text-muted-foreground">{channel.name}</p>}
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        {message && <p className="break-words text-xs text-destructive">{message}</p>}
        {channel?.disconnected && <p className="text-sm text-muted-foreground">Reconnect this channel in Buffer</p>}
        {!channel?.connected && !message && <p className="text-sm text-muted-foreground">Not connected in Buffer</p>}
        {channel?.connected && <>
          <div className="flex gap-2">
            <Button size="sm" variant={period === "last7" ? "default" : "outline"} onClick={() => setPeriod("last7")}>7 days</Button>
            <Button size="sm" variant={period === "last30" ? "default" : "outline"} onClick={() => setPeriod("last30")}>30 days</Button>
          </div>
          {!metrics?.posts ? <p className="text-sm text-muted-foreground">No posts yet</p> : <dl className="grid grid-cols-2 gap-3 text-sm">
            {([['Posts', metrics?.posts], ['Reach', metrics?.reach], ['Impressions', metrics?.impressions], ['Reactions', metrics?.reactions], ['Comments', metrics?.comments], ['Shares', metrics?.shares]] as const).map(([label, n]) => (
              <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums">{format(n)}</dd></div>
            ))}
            <div className="col-span-2"><dt className="text-xs text-muted-foreground">Engagement rate</dt><dd className="font-medium">{metrics?.engagement_rate == null ? "Not reported" : `${format(metrics.engagement_rate)}%`}</dd></div>
          </dl>}
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Daily {hasImpressions ? "impressions" : "reach"}, last 30 days</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={channel.daily.map((d) => ({ ...d, label: fmtDay(d.date) }))}>
                  <XAxis dataKey="label" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                  <YAxis fontSize={10} width={32} allowDecimals={false} />
                  <Tooltip />
                  <Line dataKey={hasImpressions ? "impressions" : "reach"} name={hasImpressions ? "Impressions" : "Reach"} stroke="hsl(var(--primary))" dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Top posts</p>
            {!channel.top_posts.length && <p className="text-xs text-muted-foreground">No sent posts in the last 30 days</p>}
            {channel.top_posts.map((post, i) => <div key={`${post.sent_at}-${i}`} className="border-t pt-2 text-sm">
              {post.link ? <a href={post.link} target="_blank" rel="noopener noreferrer" className="break-words underline">{post.text || "View post"}</a> : <p className="break-words">{post.text || "Post"}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(post.sent_at).toLocaleDateString("en-GB")} - {format(post.engagements)} engagements</p>
            </div>)}
          </div>
        </>}
        <p className="text-xs text-muted-foreground">Followers: not available from Buffer</p>
        <p className="text-xs text-muted-foreground">Data from Buffer, updated daily</p>
      </CardContent>
    </Card>
  );
};

const fmtN = (n: number | null | undefined, suffix = "") => n == null ? "Not reported" : `${n.toLocaleString("en-GB", { maximumFractionDigits: 1 })}${suffix}`;
const Row = ({ label, value }: { label: string; value: string }) => <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums">{value}</dd></div>;

const YouTubeCard = ({ yt }: { yt?: Analytics["youtube"] }) => (
  <Card className="min-w-0">
    <CardHeader className="p-4 pb-2"><CardTitle className="text-base">YouTube</CardTitle>
      {yt?.title && <p className="break-words text-xs text-muted-foreground">{yt.title} ({yt.handle})</p>}
    </CardHeader>
    <CardContent className="space-y-4 p-4 pt-0">
      {yt?.error && <p className="break-words text-xs text-destructive">{yt.error}</p>}
      {yt?.ok && <>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <Row label="Subscribers" value={yt.subscribers == null ? "Hidden" : fmtN(yt.subscribers)} />
          <Row label="Total views" value={fmtN(yt.total_views)} />
          <Row label="Videos" value={fmtN(yt.video_count)} />
        </dl>
        <div className="space-y-3">
          <p className="text-sm font-medium">Recent videos</p>
          {!yt.recent_videos.length && <p className="text-xs text-muted-foreground">No videos yet</p>}
          {yt.recent_videos.map((v) => <div key={v.url} className="border-t pt-2 text-sm">
            <a href={v.url} target="_blank" rel="noopener noreferrer" className="break-words underline">{v.title || "View video"}</a>
            <p className="mt-1 text-xs text-muted-foreground">{v.published_at ? new Date(v.published_at).toLocaleDateString("en-GB") : ""} - {fmtN(v.views)} views, {fmtN(v.likes)} likes, {fmtN(v.comments)} comments</p>
          </div>)}
        </div>
      </>}
      <p className="text-xs text-muted-foreground">From YouTube, refreshes every 15 minutes</p>
    </CardContent>
  </Card>
);

const ClarityCard = ({ c }: { c?: Analytics["clarity"] }) => (
  <Card className="min-w-0">
    <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Website behaviour (Clarity)</CardTitle></CardHeader>
    <CardContent className="space-y-4 p-4 pt-0">
      {c?.error && <p className="break-words text-xs text-destructive">{c.error}{c.stale ? " Showing the last saved numbers." : ""}</p>}
      {(c?.ok || c?.stale) && <>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Row label="Sessions" value={fmtN(c.sessions)} />
          <Row label="Pages per session" value={fmtN(c.pages_per_session)} />
          <Row label="Scroll depth" value={fmtN(c.scroll_depth_pct, "%")} />
          <Row label="Dead clicks" value={fmtN(c.dead_click_pct, "%")} />
          <Row label="Rage clicks" value={fmtN(c.rage_click_pct, "%")} />
          <Row label="Quick backs" value={fmtN(c.quickback_pct, "%")} />
          <Row label="Excessive scrolling" value={fmtN(c.excessive_scroll_pct, "%")} />
        </dl>
        <div className="space-y-2">
          <p className="text-sm font-medium">Top pages</p>
          {!c.top_pages.length && <p className="text-xs text-muted-foreground">Not reported</p>}
          {c.top_pages.map((p) => <div key={p.url} className="flex justify-between gap-3 border-t pt-2 text-sm"><span className="min-w-0 break-all">{p.url}</span><span className="tabular-nums">{p.sessions.toLocaleString("en-GB")}</span></div>)}
        </div>
      </>}
      <p className="text-xs text-muted-foreground">Last 3 days, from Microsoft Clarity, refreshes every 3 hours</p>
    </CardContent>
  </Card>
);

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

type GErr = { ok: false; error: string; waiting_approval?: boolean };
type GaTotals = { total_users: number; new_users: number; sessions: number; engagement_rate: number | null; conversions: number | null };
type Ga4 = { ok: true; last_7d: GaTotals; last_30d: GaTotals; daily: { date: string; active_users: number; sessions: number }[]; top_channels: { value: string; count: number }[]; top_sources: { value: string; count: number }[]; top_pages: { value: string; count: number }[] };
type ScRow = { value: string; clicks: number; impressions: number; ctr: number; position: number };
type Sc = { ok: true; totals: { clicks: number; impressions: number; ctr: number; position: number | null }; daily: { date: string; clicks: number; impressions: number }[]; top_queries: ScRow[]; top_pages: ScRow[] };
type Bp = { ok: true; title: string | null; totals_30d: { impressions: number; website_clicks: number; calls: number; direction_requests: number }; daily_impressions: { date: string; impressions: number }[] };
interface GoogleData { connected: boolean; account_email: string | null; scopes: string | null; error?: string; ga4: Ga4 | GErr | null; search_console: Sc | GErr | null; business_profile: Bp | GErr | null }

const GCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="min-w-0"><CardHeader className="p-4 pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-4 p-4 pt-0">{children}</CardContent></Card>
);
const GState = ({ g, src: raw }: { g?: GoogleData; src: GErr | { ok: true } | null | undefined }) => {
  const src = raw as (GErr & { ok: boolean }) | null | undefined;
  if (!g?.connected) return <p className="text-sm text-muted-foreground">Connect Google to see this</p>;
  if (g.error) return <p className="break-words text-xs text-destructive">{g.error}</p>;
  if (src && !src.ok && src.waiting_approval) return <><p className="text-sm text-muted-foreground">Waiting for Google API approval</p><p className="break-words text-xs text-muted-foreground">{src.error}</p></>;
  if (src && !src.ok) return <p className="break-words text-xs text-destructive">{src.error}</p>;
  if (!src) return <p className="text-sm text-muted-foreground">No data</p>;
  return null;
};
const MiniList = ({ title, items }: { title: string; items: { value: string; count: string }[] }) => (
  <div><p className="mb-1 text-sm font-medium">{title}</p>
    {!items.length && <p className="text-xs text-muted-foreground">None yet</p>}
    {items.map((it) => <div key={it.value} className="flex justify-between gap-2 border-t py-1 text-xs"><span className="min-w-0 break-all">{it.value}</span><span className="tabular-nums">{it.count}</span></div>)}
  </div>
);
const MiniLine = ({ data, lines }: { data: Record<string, unknown>[]; lines: { key: string; color: string }[] }) => (
  <div className="h-32"><ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
      <Tooltip />
      {lines.map((l) => <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} dot={false} strokeWidth={2} />)}
    </LineChart>
  </ResponsiveContainer></div>
);
const pctStr = (n: number | null | undefined) => n == null ? "Not reported" : `${(n * 100).toFixed(1)}%`;

const Ga4Card = ({ g }: { g?: GoogleData }) => {
  const s = g?.ga4;
  const ok = g?.connected && !g.error && s?.ok ? (s as Ga4) : null;
  return <GCard title="Website visitors (GA4)">
    <GState g={g} src={s} />
    {ok && <>
      {(["last_7d", "last_30d"] as const).map((k) => <div key={k}><p className="mb-1 text-xs font-medium">{k === "last_7d" ? "Last 7 days" : "Last 30 days"}</p>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <Row label="Users" value={fmtN(ok[k].total_users)} /><Row label="New users" value={fmtN(ok[k].new_users)} /><Row label="Sessions" value={fmtN(ok[k].sessions)} />
          <Row label="Engagement" value={pctStr(ok[k].engagement_rate)} /><Row label="Key events" value={fmtN(ok[k].conversions)} />
        </dl></div>)}
      <div><p className="mb-1 text-sm font-medium">Daily sessions, last 30 days</p>
        <MiniLine data={ok.daily.map((d) => ({ label: fmtDay(d.date), sessions: d.sessions }))} lines={[{ key: "sessions", color: "hsl(var(--primary))" }]} /></div>
      <MiniList title="Top channels" items={ok.top_channels.map((x) => ({ value: x.value, count: fmtN(x.count) }))} />
      <MiniList title="Top pages" items={ok.top_pages.map((x) => ({ value: x.value, count: fmtN(x.count) }))} />
    </>}
  </GCard>;
};

const ScCard = ({ g }: { g?: GoogleData }) => {
  const s = g?.search_console;
  const ok = g?.connected && !g.error && s?.ok ? (s as Sc) : null;
  return <GCard title="Search Console">
    <GState g={g} src={s} />
    {ok && <>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Row label="Clicks" value={fmtN(ok.totals.clicks)} /><Row label="Impressions" value={fmtN(ok.totals.impressions)} />
        <Row label="CTR" value={pctStr(ok.totals.ctr)} /><Row label="Position" value={ok.totals.position == null ? "Not reported" : ok.totals.position.toFixed(1)} />
      </dl>
      <div><p className="mb-1 text-sm font-medium">Daily clicks and impressions, last 28 days</p>
        <MiniLine data={ok.daily.map((d) => ({ label: fmtDay(d.date), clicks: d.clicks, impressions: d.impressions }))} lines={[{ key: "clicks", color: "hsl(var(--primary))" }, { key: "impressions", color: "hsl(var(--muted-foreground))" }]} /></div>
      <MiniList title="Top queries" items={ok.top_queries.map((x) => ({ value: x.value, count: `${fmtN(x.clicks)} clicks` }))} />
      <MiniList title="Top pages" items={ok.top_pages.map((x) => ({ value: x.value.replace(/^https?:\/\/[^/]+/, "") || "/", count: `${fmtN(x.clicks)} clicks` }))} />
    </>}
  </GCard>;
};

const BpCard = ({ g }: { g?: GoogleData }) => {
  const s = g?.business_profile;
  const ok = g?.connected && !g.error && s?.ok ? (s as Bp) : null;
  return <GCard title="Business Profile">
    <GState g={g} src={s} />
    {ok && <>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Row label="Impressions" value={fmtN(ok.totals_30d.impressions)} /><Row label="Website clicks" value={fmtN(ok.totals_30d.website_clicks)} />
        <Row label="Calls" value={fmtN(ok.totals_30d.calls)} /><Row label="Directions" value={fmtN(ok.totals_30d.direction_requests)} />
      </dl>
      <div><p className="mb-1 text-sm font-medium">Daily impressions, last 30 days</p>
        <MiniLine data={ok.daily_impressions.map((d) => ({ label: fmtDay(d.date), impressions: d.impressions }))} lines={[{ key: "impressions", color: "hsl(var(--primary))" }]} /></div>
    </>}
  </GCard>;
};

const AdminAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"week" | "day">("week");
  const [range, setRange] = useState<"last_7d" | "last_30d">("last_7d");
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const g = p.get("google");
    if (!g) return;
    if (g === "connected") setBanner({ ok: true, text: "Google connected." });
    else setBanner({ ok: false, text: `Google connection failed (${p.get("reason") ?? "unknown"}).` });
    p.delete("google"); p.delete("reason");
    const qs = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
  }, []);

  const connectGoogle = async () => {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("google-oauth-start");
    if (error || !data?.url) {
      let msg = "Could not start Google connection.";
      try { const b = await (error as { context?: Response })?.context?.json(); if (b?.error) msg = b.error; } catch { /* keep default */ }
      setBanner({ ok: false, text: msg });
      setConnecting(false);
      return;
    }
    window.location.href = data.url;
  };

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
        {banner && <p className={`mt-4 rounded-md border p-3 text-sm ${banner.ok ? "" : "text-destructive"}`}>{banner.text}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {data?.google?.connected && <p className="break-all text-sm text-muted-foreground">Connected as {data.google.account_email ?? "unknown account"}</p>}
          <Button size="sm" variant="outline" onClick={connectGoogle} disabled={connecting}>
            {connecting ? "Opening Google..." : data?.google?.connected ? "Reconnect Google" : "Connect Google"}
          </Button>
        </div>

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
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            {[["instagram", "Instagram"], ["linkedin", "LinkedIn"], ["tiktok", "TikTok"]].map(([key, label]) => (
              <SocialCard key={key} title={label} channel={data?.social?.channels[key]} error={!data?.social?.channels[key]?.connected ? data?.social?.error : undefined} />
            ))}
            <YouTubeCard yt={data?.youtube} />
            <ClarityCard c={data?.clarity} />
            <Ga4Card g={data?.google} />
            <ScCard g={data?.google} />
            <BpCard g={data?.google} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {["Hotjar", "Facebook"].map((l) => (
              <Stat key={l} label={l} value="-" hint="Coming soon" />
            ))}
          </div>
        </Section>
      </div>
    </>
  );
};

export default AdminAnalytics;
