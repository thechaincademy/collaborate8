CREATE TABLE public.coparent_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  sort_code text NOT NULL,
  account_number text NOT NULL,
  payment_reference text,
  amount numeric,
  frequency text NOT NULL DEFAULT 'monthly',
  day_of_month integer,
  day_of_week text,
  reminders_enabled boolean NOT NULL DEFAULT true,
  last_reminder_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coparent_bank_accounts TO authenticated;
GRANT ALL ON public.coparent_bank_accounts TO service_role;
ALTER TABLE public.coparent_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own co-parent bank details"
ON public.coparent_bank_accounts FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_coparent_bank_accounts_updated_at
BEFORE UPDATE ON public.coparent_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.manual_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paid_on date NOT NULL DEFAULT current_date,
  reference text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_payments TO authenticated;
GRANT ALL ON public.manual_payments TO service_role;
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own manual payment records"
ON public.manual_payments FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_manual_payments_updated_at
BEFORE UPDATE ON public.manual_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_manual_payments_user_paid_on ON public.manual_payments (user_id, paid_on DESC);

SELECT cron.schedule(
  'manual-payment-reminders',
  '0 8 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://eycpkzbjylzzynkfggis.supabase.co/functions/v1/send-manual-payment-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $cron$
);