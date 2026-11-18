-- Undo NEEDS_RAFA_APPROVAL_service_uptime_alerts.sql
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'c8-service-health';
DROP FUNCTION IF EXISTS public.monitor_start_service_checks();
DELETE FROM public.sg_runtime_config WHERE key = 'monitor_cron_key';
DROP TABLE IF EXISTS public.monitor_service_events;
DROP TABLE IF EXISTS public.monitor_service_status;
