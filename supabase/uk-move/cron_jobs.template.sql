-- Scheduled jobs on the live Collabor8 database (read from cron.job on 18 Nov 2026, keys redacted).
-- Not a migration: each project needs its own URL and key. Replace <PROJECT_REF>.
-- The Authorization bearer comes from vault secret email_queue_service_role_key.
-- The anon key for the apikey header comes from vault secret project_anon_key (create it first).
-- Note: on new projects the service key is not a JWT; edge functions called with it must be
-- deployed with verify_jwt = false and check the bearer themselves (see weekly-admin-report).

SELECT cron.unschedule(jobname) FROM cron.job
WHERE jobname IN ('weekly-admin-report','manual-payment-reminders','payment-due-reminders',
                  'thread-deadline-reminders','founder-welcome-email-hourly','purge-deleted-account-data');

SELECT cron.schedule('weekly-admin-report', '0 13 * * 5', $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/weekly-admin-report',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Cron', 'weekly-admin-report',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')),
    body := '{}'::jsonb);
$$);

SELECT cron.schedule('manual-payment-reminders', '0 8 * * *', $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-manual-payment-reminder',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')),
    body := '{}'::jsonb);
$$);

SELECT cron.schedule('payment-due-reminders', '0 8 * * *', $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/payment-due-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_anon_key')),
    body := '{}'::jsonb);
$$);

SELECT cron.schedule('thread-deadline-reminders', '5 * * * *', $$ SELECT public.create_thread_deadline_notifications(); $$);

SELECT cron.schedule('founder-welcome-email-hourly', '17 * * * *', $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/founder-welcome-email',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_anon_key')),
    body := '{}'::jsonb);
$$);

SELECT cron.schedule('purge-deleted-account-data', '23 3 * * *', $$ SELECT public.purge_deleted_account_data(); $$);
