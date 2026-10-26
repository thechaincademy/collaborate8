import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TabRow {
  name: string;
  clicks: number;
  users: number;
}

interface Summary {
  since: string;
  days: number;
  total_users: number;
  new_users: number;
  active_users: number;
  total_events: number;
  linked_pairs: number;
  payments_count: number;
  payments_total: number;
  expenses_count: number;
  tabs: TabRow[];
  daily: { day: string; events: number; users: number }[];
  features?: { name: string; events: number; users: number }[];
  signup_funnel?: { started_anon: number; completed: number; invited_or_linked: number; first_action: number };
}

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);

const ALLOWED = ["rafa@collaborate8.com", "jade@collaborate8.com"];

const AdminDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [days, setDays] = useState("7");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("is_admin", { _user_id: user.id }).then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    supabase
      .rpc("admin_usage_summary", { _days: Number(days) })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setSummary(data as unknown as Summary);
        setLoading(false);
      });
  }, [isAdmin, days]);

  const sendReportNow = async () => {
    setSendingReport(true);
    const { error } = await supabase.functions.invoke("weekly-admin-report");
    setSendingReport(false);
    if (error) toast.error("Could not send the report.");
    else toast.success("Report emailed to both founders.");
  };

  if (authLoading || (user && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md md:max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="text-sm text-muted-foreground">
          This dashboard is restricted to the Collabor8 founders.
        </p>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
    );
  }

  const showAnalytics =
    ALLOWED.includes((user.email ?? "").toLowerCase()) && isAdmin === true;

  const maxClicks = Math.max(1, ...(summary?.tabs ?? []).map((t) => t.clicks));

  return (
    <>
      <Helmet>
        <title>Founder dashboard - Collabor8</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Founder dashboard</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="3650">All time</SelectItem>
              </SelectContent>
            </Select>
            {showAnalytics && (
              <Button asChild variant="outline">
                <Link to="/admin/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="New sign ups" value={summary?.new_users ?? 0} />
              <Stat label="Total users" value={summary?.total_users ?? 0} />
              <Stat label="Active users" value={summary?.active_users ?? 0} />
              <Stat label="Linked co-parents" value={summary?.linked_pairs ?? 0} />
              <Stat
                label="Payments"
                value={`${summary?.payments_count ?? 0} (£${Number(
                  summary?.payments_total ?? 0
                ).toFixed(2)})`}
              />
              <Stat label="Expenses raised" value={summary?.expenses_count ?? 0} />
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Tabs opened</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(summary?.tabs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  summary!.tabs.map((t) => (
                    <div key={t.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{t.name}</span>
                        <span className="text-muted-foreground">
                          {t.clicks} clicks - {t.users} users
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(t.clicks / maxClicks) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Features used</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(summary?.features ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  summary!.features!.map((f) => (
                    <div key={f.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium capitalize">{f.name.replace(/_/g, " ")}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {f.events} events - {f.users} users
                      </span>
                    </div>
                  ))
                )}
                {summary?.signup_funnel && (
                  <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                    Sign-up funnel: {summary.signup_funnel.started_anon} started - {summary.signup_funnel.completed} completed - {summary.signup_funnel.invited_or_linked} invited or linked - {summary.signup_funnel.first_action} took a first action (visitors who accepted analytics cookies, test accounts excluded)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Daily activity</CardTitle>
              </CardHeader>
              <CardContent>
                {(summary?.daily ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    {summary!.daily.map((d) => (
                      <div key={d.day} className="flex justify-between">
                        <span className="text-muted-foreground">{d.day}</span>
                        <span>
                          {d.events} events - {d.users} users
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">
                A summary email goes out automatically every Friday at 2pm.
              </p>
              <Button onClick={sendReportNow} disabled={sendingReport}>
                {sendingReport ? "Sending..." : "Send now"}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default AdminDashboard;
