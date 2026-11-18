// Admin-only System health for /admin/monitoring, plus the 5-minute uptime run.
//
// Two callers:
//  1. A signed-in admin (browser): runs light checks and returns service status,
//     recent failures, cron runs, alert history and which setup secrets are set.
//  2. pg_cron (header x-monitor-key, value kept server-side in sg_runtime_config):
//     runs the same checks, records state, and emails "Service down" once when a
//     service goes down and "Service recovered" once when it comes back.
//
// Output is counts, function names, HTTP status codes and timestamps only. No
// secret values, message text, emails, phone numbers or bank data, ever.
import postgres from "npm:postgres@3.4.5";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import { runServiceChecks, setupStatus, utcStamp, type ServiceCheck } from "../_shared/system-health.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
import { serviceAlertSubject } from "../_shared/transactional-email-templates/service-status-alert.tsx";
import { safeReason } from "../_shared/safeguarding-notify.ts";
import { splitList } from "../_shared/safeguarding-rules.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const FAILS_BEFORE_DOWN = 2; // two checks in a row (about 5 to 10 minutes) before a "Service down" email
const ALERTING = new Set(["down", "problem"]);

type Admin = ReturnType<typeof createSupabaseAdmin>;

async function runtimeConfig(admin: Admin, keys: string[]): Promise<Record<string, string>> {
  const { data } = await admin.from("sg_runtime_config").select("key, value").in("key", keys);
  return Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
}

function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

let checkCache: { at: number; checks: ServiceCheck[] } | null = null;
async function checksCached(maxAgeMs: number) {
  if (checkCache && Date.now() - checkCache.at < maxAgeMs) return checkCache.checks;
  const checks = await runServiceChecks();
  checkCache = { at: Date.now(), checks };
  return checks;
}

// ---------- read-only database queries (fixed SQL, no user input) ----------
async function readDatabase() {
  const url = Deno.env.get("SUPABASE_DB_URL");
  if (!url) return { error: "Database connection not available" };
  const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 5, connect_timeout: 10 });
  try {
    return await sql.begin("read only", async (tx) => {
      const cron = await tx`
        select j.jobname, j.schedule, j.active,
          (select max(d.end_time) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'succeeded') as last_success,
          (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed') as last_failure,
          (select count(*)::int from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed' and d.start_time > now() - interval '24 hours') as failed_24h,
          (select count(*)::int from cron.job_run_details d where d.jobid = j.jobid and d.start_time > now() - interval '24 hours') as runs_24h,
          (select d.status from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1) as last_status
        from cron.job j order by j.jobname`;
      const dbCalls = await tx`
        select count(*)::int as total,
          count(*) filter (where status_code is null or status_code >= 400)::int as failed
        from net._http_response where created > now() - interval '24 hours'`;
      const dbCallFailures = await tx`
        select created as at, status_code, coalesce(timed_out, false) as timed_out
        from net._http_response
        where created > now() - interval '24 hours' and (status_code is null or status_code >= 400)
        order by created desc limit 15`;
      const healthFailures = await tx`
        select checked_at as at, http_status from public.monitor_health_checks
        where not ok and checked_at > now() - interval '24 hours' order by checked_at desc limit 10`;
      const deliveryFailures = await tx`
        select created_at as at, kind, channel, recipient_role, status from public.sg_alert_deliveries
        where status in ('failed', 'dropped') and created_at > now() - interval '7 days' order by created_at desc limit 10`;
      const hasEvents = (await tx`select to_regclass('public.monitor_service_events') is not null as ok`)[0].ok;
      const alertHistory = hasEvents
        ? await tx`select occurred_at as at, service_label as service, event, response_ms, http_status, down_since, email_status
            from public.monitor_service_events order by occurred_at desc limit 20`
        : null;
      const googleConnected = (await tx`select exists(select 1 from public.google_oauth_tokens where provider = 'google') as ok`)[0].ok;
      return {
        cron_jobs: cron,
        db_calls_24h: dbCalls[0],
        db_call_failures: dbCallFailures,
        health_check_failures: healthFailures,
        delivery_failures: deliveryFailures,
        alert_history: alertHistory,
        alerting_installed: hasEvents,
        google_connected: googleConnected,
      };
    });
  } catch {
    return { error: "Database read failed" };
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

// ---------- Supabase logs (optional, needs a server-only logs token) ----------
async function readLogs() {
  const token = Deno.env.get("SUPABASE_LOGS_API_TOKEN");
  if (!token) return { available: false, reason: "Needs SUPABASE_LOGS_API_TOKEN" };
  const ref = new URL(Deno.env.get("SUPABASE_URL") ?? "https://x.supabase.co").hostname.split(".")[0];
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 3600 * 1000);
  const q = async (sqlText: string) => {
    const u = new URL(`https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/logs`);
    u.searchParams.set("sql", sqlText);
    u.searchParams.set("iso_timestamp_start", start.toISOString());
    u.searchParams.set("iso_timestamp_end", end.toISOString());
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.error) throw new Error(`logs ${r.status}`);
    return (body.result ?? []) as Record<string, unknown>[];
  };
  const slug = (path: unknown) => String(path ?? "").replace(/^\/functions\/v1\//, "").split(/[/?]/)[0].replace(/[^a-z0-9-]/gi, "").slice(0, 60);
  try {
    const [byFn, recent, pg] = await Promise.all([
      q(`select log_attributes['request.pathname'] as path, log_attributes['response.status_code'] as status, count() as n, max(timestamp) as last_at
         from logs where source = 'function_edge_logs' and toInt32OrZero(log_attributes['response.status_code']) >= 400
         group by path, status order by n desc limit 30`),
      q(`select timestamp, log_attributes['request.pathname'] as path, log_attributes['request.method'] as method, log_attributes['response.status_code'] as status
         from logs where source = 'function_edge_logs' and toInt32OrZero(log_attributes['response.status_code']) >= 400
         order by timestamp desc limit 20`),
      q(`select log_attributes['parsed.error_severity'] as severity, count() as n, max(timestamp) as last_at
         from logs where source = 'postgres_logs' and log_attributes['parsed.error_severity'] in ('ERROR', 'FATAL', 'PANIC')
         group by severity`),
    ]);
    return {
      available: true,
      function_errors_by_name: byFn.map((r) => ({ function: slug(r.path), status: Number(r.status), count: Number(r.n), last_at: r.last_at })),
      recent_function_errors: recent.map((r) => ({ at: r.timestamp, function: slug(r.path), method: String(r.method ?? "").slice(0, 7), status: Number(r.status) })),
      database_errors: pg.map((r) => ({ severity: String(r.severity), count: Number(r.n), last_at: r.last_at })),
    };
  } catch {
    return { available: false, reason: "Logs could not be read right now" };
  }
}

// ---------- alerting (cron only) ----------
async function sendServiceEmail(admin: Admin, input: { event: "down" | "recovered"; check: ServiceCheck; downSince: string | null; test: boolean; recipients: string[] }) {
  const subject = serviceAlertSubject(input.event, input.test);
  if (input.recipients.length === 0) {
    await admin.from("sg_alert_deliveries").insert({ kind: `service_${input.event}`, test_account: input.test, channel: "email", recipient_role: "none", status: "dropped", reason: input.test ? "missing_qa_email" : "missing_dsl_email" });
    return "dropped";
  }
  let sent = 0;
  for (const to of input.recipients) {
    let status: "sent" | "failed" = "failed";
    let reason: string | null = null;
    try {
      const r = await sendTemplateEmail("service_status_alert", to, {
        templateData: {
          event: input.event, test: input.test, service: input.check.label, problem: input.check.detail,
          checkedAt: utcStamp(new Date()), responseMs: input.check.response_ms, downSince: input.downSince ? utcStamp(input.downSince) : null,
        },
        idempotencyKey: `svc-${input.check.key}-${input.event}-${input.downSince ?? "x"}:${to}`,
      });
      if (r.sent) { status = "sent"; sent++; } else reason = "recipient_suppressed";
    } catch (e) {
      reason = safeReason((e as Error).message);
    }
    const at = to.lastIndexOf("@");
    await admin.from("sg_alert_deliveries").insert({
      kind: `service_${input.event}`, test_account: input.test, channel: "email", recipient_role: input.test ? "qa" : "dsl",
      recipient_domain: at > 0 ? to.slice(at + 1).toLowerCase() : null, subject_test_prefix: subject.startsWith("[TEST] "), status, reason,
    });
  }
  return sent === input.recipients.length ? "sent" : sent > 0 ? "partly_sent" : "failed";
}

async function cronRun(admin: Admin) {
  const checks = await runServiceChecks();
  checkCache = { at: Date.now(), checks };
  const cfg = await runtimeConfig(admin, ["environment", "qa_alert_email", "dsl_alert_email"]);
  const test = (cfg.environment ?? "live") !== "live";
  const recipients = test
    ? splitList(Deno.env.get("QA_ALERT_EMAIL") || cfg.qa_alert_email)
    : splitList(Deno.env.get("DSL_ALERT_EMAIL") || cfg.dsl_alert_email);

  const { data: rows, error } = await admin.from("monitor_service_status").select("*");
  if (error) return { ok: false, reason: "state_table_missing", checks: checks.length };
  const prev = new Map((rows ?? []).map((r: any) => [r.service, r]));
  const now = new Date().toISOString();
  const transitions: string[] = [];

  for (const c of checks) {
    const p: any = prev.get(c.key) ?? { state: "up", consecutive_failures: 0, first_failed_at: null, down_since: null };
    const failing = c.alertable && ALERTING.has(c.status);
    const consecutive = failing ? (p.consecutive_failures ?? 0) + 1 : 0;
    const firstFailed = failing ? (p.first_failed_at ?? now) : null;
    await admin.from("monitor_service_status").upsert({
      service: c.key, label: c.label, last_status: c.status, last_checked_at: now, last_response_ms: c.response_ms,
      last_http_status: c.http_status, consecutive_failures: consecutive, first_failed_at: firstFailed,
      state: p.state ?? "up", down_since: p.down_since ?? null,
    }, { onConflict: "service" });

    if (failing && consecutive >= FAILS_BEFORE_DOWN && p.state !== "down") {
      // Claim the transition so a service that stays down only alerts once.
      const { data: claimed } = await admin.from("monitor_service_status").update({ state: "down", down_since: firstFailed })
        .eq("service", c.key).neq("state", "down").select("service");
      if (claimed?.length) {
        const { data: ev } = await admin.from("monitor_service_events").insert({
          service: c.key, service_label: c.label, event: "down", http_status: c.http_status, response_ms: c.response_ms, down_since: firstFailed, problem: c.detail,
        }).select("id").single();
        const email = await sendServiceEmail(admin, { event: "down", check: c, downSince: firstFailed, test, recipients });
        if (ev) await admin.from("monitor_service_events").update({ email_status: email }).eq("id", ev.id);
        transitions.push(`${c.key}:down`);
      }
    } else if (!failing && p.state === "down") {
      const { data: claimed } = await admin.from("monitor_service_status").update({ state: "up", down_since: null })
        .eq("service", c.key).eq("state", "down").select("service");
      if (claimed?.length) {
        const { data: ev } = await admin.from("monitor_service_events").insert({
          service: c.key, service_label: c.label, event: "recovered", http_status: c.http_status, response_ms: c.response_ms, down_since: p.down_since,
        }).select("id").single();
        const email = await sendServiceEmail(admin, { event: "recovered", check: c, downSince: p.down_since, test, recipients });
        if (ev) await admin.from("monitor_service_events").update({ email_status: email }).eq("id", ev.id);
        transitions.push(`${c.key}:recovered`);
      }
    }
  }
  return { ok: true, checks: checks.length, transitions };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createSupabaseAdmin();

  const monitorKey = req.headers.get("x-monitor-key");
  if (monitorKey !== null) {
    const cfg = await runtimeConfig(admin, ["monitor_cron_key"]).catch(() => ({} as Record<string, string>));
    if (!sameSecret(monitorKey, cfg.monitor_cron_key ?? "")) return json({ error: "Forbidden" }, 403);
    try {
      return json(await cronRun(admin));
    } catch {
      console.error("[admin-system-health] cron run failed");
      return json({ ok: false }, 500);
    }
  }

  let caller;
  try { caller = await getUserFromRequest(req); } catch { return json({ error: "Not signed in" }, 401); }
  const [{ data: isAdmin }, { data: hasRole }] = await Promise.all([
    admin.rpc("is_admin", { _user_id: caller.id }),
    admin.rpc("has_role", { _user_id: caller.id, _role: "admin" }),
  ]);
  if (!isAdmin && !hasRole) return json({ error: "Forbidden" }, 403);

  const [checks, db, logs] = await Promise.all([checksCached(60_000), readDatabase(), readLogs()]);
  return json({
    generated_at: new Date().toISOString(),
    services: checks,
    database: db,
    logs,
    setup: setupStatus(),
  });
});
