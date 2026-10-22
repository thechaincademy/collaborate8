ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.app_settings IS 'Server-only settings (no client policies). founder_welcome_cutoff = go-live timestamp for the 24h founder welcome email.';