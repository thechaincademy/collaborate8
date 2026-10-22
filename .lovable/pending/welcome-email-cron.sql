-- Run ONLY when switching the founder welcome email on (after the function is deployed).
-- 1) Go-live cutoff: only users created from this moment get the email (never retroactive).
INSERT INTO public.app_settings (key, value) VALUES ('founder_welcome_cutoff', now()::text)
ON CONFLICT (key) DO NOTHING;

-- 2) Hourly job at minute 17.
SELECT cron.schedule(
  'founder-welcome-email-hourly',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://eycpkzbjylzzynkfggis.supabase.co/functions/v1/founder-welcome-email',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3BremJqeWx6enlua2ZnZ2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTIyMzIsImV4cCI6MjA4NDQ4ODIzMn0.02hHEJSOhnPb2HiK311F4ObLI_fOedly0VNyoWQKP0Y"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
