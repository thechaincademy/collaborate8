import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import SystemHealthSection from "@/components/admin/SystemHealthSection";

interface Delivery {
  created_at: string;
  kind: string;
  test_account: boolean;
  channel: "email" | "sms";
  recipient_role: "qa" | "dsl" | "none";
  subject_test_prefix: boolean | null;
  status: "sent" | "failed" | "dropped" | "skipped";
  reason: string | null;
}

interface MonitoringSummary {
  generated_at: string;
  environment: string;
  last_health_check: { checked_at: string; ok: boolean; http_status: number | null; detail: Record<string, unknown> } | null;
  health_24h: { total: number; failed: number };
  alert_deliveries_7d: { sent_test: number; sent_real: number; failed_test: number; failed_real: number; skipped: number };
  recent_deliveries: Delivery[];
  alerts_not_dispatched_7d: number;
  safeguarding_global_on: boolean;
  scheduled_jobs_24h: { runs: number; failed: number };
  edge_calls_from_db_6h: { total: number; errors: number };
  last_backup: { backup_at: string; source: string } | null;
}

const ukTime = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(iso)) + " UK"
    : "Not yet";

const Stat = ({ label, value, warn = false }: { label: string; value: string | number; warn?: boolean }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-lg font-semibold ${warn ? "text-destructive" : ""}`}>{value}</p>
  </div>
);

const AdminMonitoring = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<MonitoringSummary | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: summary, error } = await supabase.rpc("admin_monitoring_summary" as never);
    if (error) {
      setDenied(true);
      setData(null);
    } else {
      setDenied(false);
      setData(summary as unknown as MonitoringSummary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [user, load]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (denied) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="text-sm text-muted-foreground">Monitoring is restricted to Collabor8 admins.</p>
      </div>
    );
  }

  const health = data?.last_health_check;
  const deliveries = data?.alert_deliveries_7d;

  return (
    <AdminLayout>
      <Helmet>
        <title>Monitoring - Collabor8</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Monitoring</h1>
            <p className="text-sm text-muted-foreground">
              {data?.environment === "test" ? "Test environment. Alerts go to QA with [TEST]." : "Live environment."} Updated {ukTime(data?.generated_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>
                      </div>
        </div>

        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Health check (every 5 minutes)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-4">
            <Stat label="Last result" value={health ? (health.ok ? "Healthy" : "Failing") : "Not yet"} warn={!!health && !health.ok} />
            <Stat label="Checked" value={ukTime(health?.checked_at)} />
            <Stat label="Checks in 24h" value={data?.health_24h.total ?? 0} />
            <Stat label="Failed in 24h" value={data?.health_24h.failed ?? 0} warn={(data?.health_24h.failed ?? 0) > 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Alert deliveries (7 days)</CardTitle></CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Sent (real)" value={deliveries?.sent_real ?? 0} />
              <Stat label="Failed (real)" value={deliveries?.failed_real ?? 0} warn={(deliveries?.failed_real ?? 0) > 0} />
              <Stat label="Sent (test)" value={deliveries?.sent_test ?? 0} />
              <Stat label="Failed (test)" value={deliveries?.failed_test ?? 0} warn={(deliveries?.failed_test ?? 0) > 0} />
            </div>
            <p className="text-xs text-muted-foreground">
              Not dispatched: {data?.alerts_not_dispatched_7d ?? 0}. Skipped (SMS for test accounts, out of hours rules): {deliveries?.skipped ?? 0}.
            </p>
            <ul className="divide-y text-sm">
              {(data?.recent_deliveries ?? []).map((d, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{ukTime(d.created_at)} · {d.kind.replace("_", " ")} · {d.channel}</span>
                  <span className={d.status === "sent" ? "" : "text-muted-foreground"}>
                    {d.status}{d.test_account ? " · test" : ""}{d.recipient_role !== "none" ? ` · to ${d.recipient_role.toUpperCase()}` : ""}
                  </span>
                </li>
              ))}
              {(data?.recent_deliveries ?? []).length === 0 && <li className="py-2 text-muted-foreground">No alerts yet</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Safeguarding</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-4">
            <Stat label="Feature switch" value={data?.safeguarding_global_on ? "On" : "Off"} />
          </CardContent>
          <p className="px-4 pb-4 text-xs text-muted-foreground">Flags, concerns and answers are only shown to the safeguarding lead.</p>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Jobs and functions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-4">
            <Stat label="Scheduled runs (24h)" value={data?.scheduled_jobs_24h.runs ?? 0} />
            <Stat label="Failed runs (24h)" value={data?.scheduled_jobs_24h.failed ?? 0} warn={(data?.scheduled_jobs_24h.failed ?? 0) > 0} />
            <Stat label="Function calls from database (6h)" value={data?.edge_calls_from_db_6h.total ?? 0} />
            <Stat label="Function errors (6h)" value={data?.edge_calls_from_db_6h.errors ?? 0} warn={(data?.edge_calls_from_db_6h.errors ?? 0) > 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Backups</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-sm">
            {data?.last_backup ? `Last backup ${ukTime(data.last_backup.backup_at)} (${data.last_backup.source})` : "Not set up yet. Daily backups come with the Supabase Pro plan."}
          </CardContent>
        </Card>

        {data && <SystemHealthSection />}
      </div>
    </AdminLayout>
  );
};

export default AdminMonitoring;
