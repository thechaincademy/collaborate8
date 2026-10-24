ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_user_id_fkey,
  ADD CONSTRAINT audit_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.payments ALTER COLUMN payer_id DROP NOT NULL, ALTER COLUMN payee_id DROP NOT NULL;
ALTER TABLE public.payments DROP CONSTRAINT payments_payer_id_fkey,
  ADD CONSTRAINT payments_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT payments_payee_id_fkey,
  ADD CONSTRAINT payments_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_related_expense_id_fkey,
  ADD CONSTRAINT payments_related_expense_id_fkey FOREIGN KEY (related_expense_id) REFERENCES public.expense_requests(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_related_arrangement_id_fkey,
  ADD CONSTRAINT payments_related_arrangement_id_fkey FOREIGN KEY (related_arrangement_id) REFERENCES public.recurring_payments(id) ON DELETE SET NULL;

ALTER TABLE public.payment_records ALTER COLUMN payer_id DROP NOT NULL, ALTER COLUMN receiver_id DROP NOT NULL;
ALTER TABLE public.payment_records DROP CONSTRAINT payment_records_payer_id_fkey,
  ADD CONSTRAINT payment_records_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payment_records DROP CONSTRAINT payment_records_receiver_id_fkey,
  ADD CONSTRAINT payment_records_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payment_records DROP CONSTRAINT IF EXISTS payment_records_expense_id_fkey,
  ADD CONSTRAINT payment_records_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expense_requests(id) ON DELETE SET NULL;
ALTER TABLE public.payment_records DROP CONSTRAINT IF EXISTS payment_records_arrangement_id_fkey,
  ADD CONSTRAINT payment_records_arrangement_id_fkey FOREIGN KEY (arrangement_id) REFERENCES public.recurring_payments(id) ON DELETE SET NULL;

ALTER TABLE public.expense_requests DROP CONSTRAINT expense_requests_decided_by_fkey,
  ADD CONSTRAINT expense_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.recurring_payments DROP CONSTRAINT recurring_payments_receiver_id_fkey,
  ADD CONSTRAINT recurring_payments_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles DROP CONSTRAINT profiles_coparent_id_fkey,
  ADD CONSTRAINT profiles_coparent_id_fkey FOREIGN KEY (coparent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL, ALTER COLUMN recipient_id DROP NOT NULL;
ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey,
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.messages DROP CONSTRAINT messages_recipient_id_fkey,
  ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.decision_threads ALTER COLUMN creator_id DROP NOT NULL, ALTER COLUMN coparent_id DROP NOT NULL;
ALTER TABLE public.thread_events ALTER COLUMN actor_id DROP NOT NULL;

CREATE TABLE public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX deletion_requests_email_idx ON public.deletion_requests (lower(email), created_at);
GRANT ALL ON public.deletion_requests TO service_role;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.purge_deleted_account_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.messages WHERE sender_id IS NULL AND recipient_id IS NULL;
  DELETE FROM public.thread_events e USING public.decision_threads t
    WHERE e.thread_id = t.id AND t.creator_id IS NULL AND t.coparent_id IS NULL;
  DELETE FROM public.decision_threads WHERE creator_id IS NULL AND coparent_id IS NULL;
  DELETE FROM public.payment_records WHERE payer_id IS NULL AND receiver_id IS NULL;
  DELETE FROM public.payments WHERE payer_id IS NULL AND payee_id IS NULL;
  DELETE FROM public.audit_events WHERE user_id IS NULL AND created_at < now() - interval '30 days';
  UPDATE public.deletion_requests SET status = 'expired' WHERE status = 'pending' AND expires_at < now();
  DELETE FROM public.deletion_requests WHERE expires_at < now() - interval '7 days';
END $$;
REVOKE EXECUTE ON FUNCTION public.purge_deleted_account_data() FROM PUBLIC, anon, authenticated;