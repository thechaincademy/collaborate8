-- NEEDS RAFA APPROVAL. NOT APPLIED BY supabase db push.
-- Short-lived Collabor8 calm check job results, for polling when Vertex is busy.
-- Do not store the parent's original draft or any other raw message text.
-- Run by hand only, and only after Rafa says yes:
--   supabase db query --linked -f supabase/manual/NEEDS_RAFA_APPROVAL_calm_check_jobs.sql
--
-- Until this is applied, chat-rewrite keeps pending results in memory only.

CREATE TABLE IF NOT EXISTS public.calm_check_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'done', 'failed')),
  needs_rewrite boolean,
  rewrite text,
  eta_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT calm_check_jobs_no_empty_status CHECK (length(status) > 0)
);

COMMENT ON TABLE public.calm_check_jobs IS
  'Short-lived calm check poll results. Never store the original draft here.';
COMMENT ON COLUMN public.calm_check_jobs.rewrite IS
  'Optional calmer suggestion only. Never the parent original draft.';

CREATE INDEX IF NOT EXISTS calm_check_jobs_user_id_idx ON public.calm_check_jobs (user_id);
CREATE INDEX IF NOT EXISTS calm_check_jobs_expires_at_idx ON public.calm_check_jobs (expires_at);

ALTER TABLE public.calm_check_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY calm_check_jobs_select_own
  ON public.calm_check_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND expires_at > now());

-- Writes stay with the edge function using the service role. Parents only read their own row.

REVOKE ALL ON public.calm_check_jobs FROM anon;
GRANT SELECT ON public.calm_check_jobs TO authenticated;
