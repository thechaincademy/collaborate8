-- Admin monitoring shows system health only: uptime, errors, scheduled jobs and alert
-- delivery counts and statuses. Concern and paused-family counts moved out: they are
-- safeguarding-lead data (see 20261118121000_safeguarding_dsl_only_access.sql).

CREATE OR REPLACE FUNCTION public.admin_monitoring_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  out jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'generated_at', now(),
    'environment', COALESCE(public.monitor_config('environment'), 'live'),
    'last_health_check', (
      SELECT jsonb_build_object('checked_at', checked_at, 'ok', ok, 'http_status', http_status, 'detail', detail)
      FROM public.monitor_health_checks ORDER BY checked_at DESC LIMIT 1),
    'health_24h', (
      SELECT jsonb_build_object('total', count(*), 'failed', count(*) FILTER (WHERE NOT ok))
      FROM public.monitor_health_checks WHERE checked_at > now() - interval '24 hours'),
    'alert_deliveries_7d', (
      SELECT jsonb_build_object(
        'sent_test', count(*) FILTER (WHERE status = 'sent' AND test_account),
        'sent_real', count(*) FILTER (WHERE status = 'sent' AND NOT test_account),
        'failed_test', count(*) FILTER (WHERE status IN ('failed', 'dropped') AND test_account),
        'failed_real', count(*) FILTER (WHERE status IN ('failed', 'dropped') AND NOT test_account),
        'skipped', count(*) FILTER (WHERE status = 'skipped'))
      FROM public.sg_alert_deliveries WHERE created_at > now() - interval '7 days'),
    'recent_deliveries', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.created_at DESC), '[]'::jsonb) FROM (
        SELECT created_at, kind, test_account, channel, recipient_role, subject_test_prefix, status, reason
        FROM public.sg_alert_deliveries ORDER BY created_at DESC LIMIT 10) d),
    'alerts_not_dispatched_7d', (
      SELECT count(*) FROM public.safeguarding_audit_log
      WHERE action = 'alert_skipped' AND created_at > now() - interval '7 days'),
    'safeguarding_global_on', public.sg_global_enabled(),
    'scheduled_jobs_24h', (
      SELECT jsonb_build_object('runs', count(*), 'failed', count(*) FILTER (WHERE status = 'failed'))
      FROM cron.job_run_details WHERE start_time > now() - interval '24 hours'),
    'edge_calls_from_db_6h', (
      SELECT jsonb_build_object('total', count(*), 'errors', count(*) FILTER (WHERE status_code IS NULL OR status_code >= 400))
      FROM net._http_response WHERE created > now() - interval '6 hours'),
    'last_backup', (
      SELECT jsonb_build_object('backup_at', backup_at, 'source', source)
      FROM public.monitor_backups ORDER BY backup_at DESC LIMIT 1)
  ) INTO out;
  RETURN out;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_monitoring_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_monitoring_summary() TO authenticated;
