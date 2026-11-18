import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ukTime, useSystemHealth, type ServiceStatus } from "./useSystemHealth";

const STATUS: Record<ServiceStatus, { text: string; cls: string }> = {
  up: { text: "Up", cls: "bg-emerald-100 text-emerald-800" },
  problem: { text: "Problem", cls: "bg-amber-100 text-amber-900" },
  down: { text: "Down", cls: "bg-red-100 text-red-800" },
  not_configured: { text: "Not set up", cls: "bg-muted text-muted-foreground" },
};

const Badge = ({ status }: { status: ServiceStatus }) => (
  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", STATUS[status].cls)}>{STATUS[status].text}</span>
);

const Empty = ({ children }: { children: React.ReactNode }) => <li className="py-2 text-sm text-muted-foreground">{children}</li>;

const SystemHealthSection = () => {
  const { data, error, loading, load } = useSystemHealth(true);
  const db = data?.database;
  const logs = data?.logs;
  const counts = (data?.services ?? []).reduce<Record<string, number>>((m, s) => ({ ...m, [s.status]: (m[s.status] ?? 0) + 1 }), {});

  return (
    <section aria-labelledby="system-health" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
        <div>
          <h2 id="system-health" className="text-xl font-semibold">System health</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `Checked ${ukTime(data.generated_at)}. ${counts.up ?? 0} up, ${counts.problem ?? 0} with a problem, ${counts.down ?? 0} down, ${counts.not_configured ?? 0} not set up.` : loading ? "Checking services..." : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>{loading ? "Checking..." : "Check now"}</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Services</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <ul className="divide-y">
            {(data?.services ?? []).map((s) => (
              <li key={s.key} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {[s.detail, s.response_ms !== null ? `${s.response_ms} ms` : null, s.http_status !== null ? `HTTP ${s.http_status}` : null].filter(Boolean).join(" · ") || "OK"}
                  </p>
                </div>
                <Badge status={s.status} />
              </li>
            ))}
            {!data && !loading && <Empty>No results yet</Empty>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Uptime alerts</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 text-sm">
          {db && db.alerting_installed === false ? (
            <p className="text-muted-foreground">Uptime emails are not switched on yet. When they are, a "Service down" email goes out once when a service fails two checks in a row, and a "Service recovered" email when it is back.</p>
          ) : (
            <ul className="divide-y">
              {(db?.alert_history ?? []).map((a, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{ukTime(a.at)} · {a.service}</span>
                  <span className={a.event === "down" ? "text-destructive" : "text-emerald-700"}>
                    {a.event === "down" ? "Down" : "Recovered"}{a.email_status ? ` · email ${a.email_status.replace("_", " ")}` : ""}
                  </span>
                </li>
              ))}
              {(db?.alert_history ?? []).length === 0 && <Empty>No services have gone down</Empty>}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Scheduled jobs</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          {db?.error ? <p className="text-sm text-muted-foreground">{db.error}</p> : (
            <ul className="divide-y">
              {(db?.cron_jobs ?? []).map((j) => (
                <li key={j.jobname} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium break-all">{j.jobname}</p>
                    <p className="text-xs text-muted-foreground">Last success {ukTime(j.last_success)} · {j.runs_24h} runs in 24h{j.active ? "" : " · paused"}</p>
                  </div>
                  <span className={cn("text-xs font-semibold", j.failed_24h > 0 || j.last_status === "failed" ? "text-destructive" : "text-muted-foreground")}>
                    {j.failed_24h > 0 ? `${j.failed_24h} failed in 24h` : j.last_status ?? "not run yet"}
                  </span>
                </li>
              ))}
              {db && !db.error && (db.cron_jobs ?? []).length === 0 && <Empty>No scheduled jobs</Empty>}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Failures and logs (24 hours)</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 text-sm">
          <div>
            <p className="mb-1 font-medium">Function errors by name</p>
            {logs?.available ? (
              <ul className="divide-y">
                {(logs.function_errors_by_name ?? []).map((f, i) => (
                  <li key={i} className="flex justify-between gap-2 py-1.5"><span className="break-all">{f.function || "unknown"} · HTTP {f.status}</span><span className="shrink-0 text-muted-foreground">{f.count}x · last {ukTime(f.last_at)}</span></li>
                ))}
                {(logs.function_errors_by_name ?? []).length === 0 && <Empty>No function errors</Empty>}
              </ul>
            ) : (
              <p className="text-muted-foreground">Function and database logs are not connected yet ({logs?.reason ?? "checking"}). See <Link className="underline" to="/admin/setup">Setup</Link>.</p>
            )}
          </div>
          {logs?.available && (
            <>
              <div>
                <p className="mb-1 font-medium">Latest function errors</p>
                <ul className="divide-y">
                  {(logs.recent_function_errors ?? []).map((f, i) => (
                    <li key={i} className="flex justify-between gap-2 py-1.5"><span className="break-all">{f.function} · {f.method}</span><span className="shrink-0 text-muted-foreground">HTTP {f.status} · {ukTime(f.at)}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium">Database errors</p>
                <ul className="divide-y">
                  {(logs.database_errors ?? []).map((e, i) => (
                    <li key={i} className="flex justify-between gap-2 py-1.5"><span>{e.severity}</span><span className="text-muted-foreground">{e.count}x · last {ukTime(e.last_at)}</span></li>
                  ))}
                  {(logs.database_errors ?? []).length === 0 && <Empty>No database errors</Empty>}
                </ul>
              </div>
            </>
          )}
          <div>
            <p className="mb-1 font-medium">Calls made by the database</p>
            <p className="text-muted-foreground">{db?.db_calls_24h ? `${db.db_calls_24h.failed} of ${db.db_calls_24h.total} failed` : "Not available"}</p>
            <ul className="divide-y">
              {(db?.db_call_failures ?? []).slice(0, 8).map((f, i) => (
                <li key={i} className="flex justify-between gap-2 py-1.5"><span>{ukTime(f.at)}</span><span className="text-muted-foreground">{f.timed_out ? "Timed out" : f.status_code ? `HTTP ${f.status_code}` : "No response"}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium">Failed health checks</p>
            <ul className="divide-y">
              {(db?.health_check_failures ?? []).map((f, i) => (
                <li key={i} className="flex justify-between gap-2 py-1.5"><span>{ukTime(f.at)}</span><span className="text-muted-foreground">{f.http_status ? `HTTP ${f.http_status}` : "No response"}</span></li>
              ))}
              {db && !db.error && (db.health_check_failures ?? []).length === 0 && <Empty>None</Empty>}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium">Alert emails not delivered (7 days)</p>
            <ul className="divide-y">
              {(db?.delivery_failures ?? []).map((f, i) => (
                <li key={i} className="flex justify-between gap-2 py-1.5"><span>{ukTime(f.at)} · {f.kind.replace(/_/g, " ")}</span><span className="text-muted-foreground">{f.status} · to {f.recipient_role.toUpperCase()}</span></li>
              ))}
              {db && !db.error && (db.delivery_failures ?? []).length === 0 && <Empty>None</Empty>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default SystemHealthSection;
