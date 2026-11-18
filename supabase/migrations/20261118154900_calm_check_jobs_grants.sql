-- Tighten grants on calm_check_jobs: parents may only SELECT their own row.
-- Writes stay with the service role. Safe to re-run.

REVOKE ALL ON TABLE public.calm_check_jobs FROM anon, authenticated;
GRANT SELECT ON TABLE public.calm_check_jobs TO authenticated;
