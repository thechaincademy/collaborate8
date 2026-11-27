import { useCallback, useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";

export type ServiceStatus = "up" | "problem" | "down" | "not_configured";
export interface ServiceCheck { key: string; label: string; status: ServiceStatus; http_status: number | null; response_ms: number | null; detail: string | null; alertable: boolean }
export interface CronJob { jobname: string; schedule: string; active: boolean; last_success: string | null; last_failure: string | null; failed_24h: number; runs_24h: number; last_status: string | null }
export interface SystemHealth {
  generated_at: string;
  services: ServiceCheck[];
  database: {
    error?: string;
    cron_jobs?: CronJob[];
    db_calls_24h?: { total: number; failed: number };
    db_call_failures?: { at: string; status_code: number | null; timed_out: boolean }[];
    health_check_failures?: { at: string; http_status: number | null }[];
    delivery_failures?: { at: string; kind: string; channel: string; recipient_role: string; status: string }[];
    alert_history?: { at: string; service: string; event: "down" | "recovered"; response_ms: number | null; http_status: number | null; down_since: string | null; email_status: string | null }[] | null;
    alerting_installed?: boolean;
    google_connected?: boolean;
  };
  logs: {
    available: boolean;
    reason?: string;
    function_errors_by_name?: { function: string; status: number; count: number; last_at: string }[];
    recent_function_errors?: { at: string; function: string; method: string; status: number }[];
    database_errors?: { severity: string; count: number; last_at: string }[];
  };
  setup: { group: string; secrets: { name: string; set: boolean }[] }[];
}

export function useSystemHealth(enabled: boolean) {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-system-health", { method: "POST", body: {} });
    if (error) setError("Could not load system health.");
    else { setError(null); setData(data as SystemHealth); }
    setLoading(false);
  }, []);
  useEffect(() => { if (enabled) void load(); }, [enabled, load]);
  return { data, error, loading, load };
}

/** Log timestamps can come without a zone; they are UTC. */
export const ukTime = (iso?: string | null) => {
  if (!iso) return "Never";
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso.replace(" ", "T")}Z`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d) + " UK";
};
