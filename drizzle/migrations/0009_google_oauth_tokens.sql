CREATE TABLE public.google_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE DEFAULT 'google',
  refresh_token text NOT NULL,
  scopes text,
  account_email text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.google_oauth_tokens FROM anon, authenticated;
GRANT ALL ON public.google_oauth_tokens TO service_role;
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;