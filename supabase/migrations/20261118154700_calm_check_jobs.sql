-- Short-lived Collabor8 calm check poll results.
-- Rafa approved this for the London test project collabor8-uk on 18 November 2026.
-- Do not apply it to the live project (eycpkzbjylzzynkfggis) without a separate yes.
-- Never store the parent's original draft or any other raw message text.

CREATE TABLE IF NOT EXISTS public.calm_check_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'done', 'failed')),
  needs_rewrite boolean,
  rewrite text,
  eta_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  CONSTRAINT calm_check_jobs_no_empty_status CHECK (length(status) > 0)
);

COMMENT ON TABLE public.calm_check_jobs IS
  'Short-lived calm check poll results. Never store the original draft here. Rows expire 10 minutes after creation.';
COMMENT ON COLUMN public.calm_check_jobs.rewrite IS
  'Optional calmer suggestion only. Never the parent original draft.';

CREATE OR REPLACE FUNCTION public.calm_check_jobs_set_expiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.expires_at := NEW.created_at + interval '10 minutes';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calm_check_jobs_set_expiry ON public.calm_check_jobs;
CREATE TRIGGER calm_check_jobs_set_expiry
  BEFORE INSERT OR UPDATE OF created_at ON public.calm_check_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.calm_check_jobs_set_expiry();

CREATE INDEX IF NOT EXISTS calm_check_jobs_user_id_idx ON public.calm_check_jobs (user_id);
CREATE INDEX IF NOT EXISTS calm_check_jobs_expires_at_idx ON public.calm_check_jobs (expires_at);

ALTER TABLE public.calm_check_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calm_check_jobs_select_own ON public.calm_check_jobs;
CREATE POLICY calm_check_jobs_select_own
  ON public.calm_check_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND expires_at > now());

-- Writes stay with the edge function using the service role. Parents only read their own row.

REVOKE ALL ON public.calm_check_jobs FROM anon;
GRANT SELECT ON public.calm_check_jobs TO authenticated;

CREATE OR REPLACE FUNCTION public.calm_check_jobs_cleanup()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.calm_check_jobs WHERE expires_at <= now();
$$;

REVOKE ALL ON FUNCTION public.calm_check_jobs_cleanup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calm_check_jobs_set_expiry() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'c8-calm-check-jobs-cleanup';
SELECT cron.schedule('c8-calm-check-jobs-cleanup', '* * * * *',
  $cron$ SELECT public.calm_check_jobs_cleanup(); $cron$);
