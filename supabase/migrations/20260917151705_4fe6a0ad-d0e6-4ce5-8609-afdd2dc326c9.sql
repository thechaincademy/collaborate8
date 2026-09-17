CREATE TABLE public.payment_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arrangement_id uuid REFERENCES public.recurring_payments(id) ON DELETE SET NULL,
  payer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period text,
  payment_type text NOT NULL DEFAULT 'maintenance' CHECK (payment_type IN ('maintenance','expense')),
  expense_id uuid REFERENCES public.expense_requests(id) ON DELETE SET NULL,
  amount_usdc numeric NOT NULL,
  amount_gbp_reference numeric,
  payer_wallet text NOT NULL,
  receiver_wallet text NOT NULL,
  reference_hash text NOT NULL,
  salt text NOT NULL,
  tx_signature text UNIQUE,
  network text NOT NULL DEFAULT 'devnet',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','verified','failed')),
  verification_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  verified_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.payment_records TO authenticated;
GRANT ALL ON public.payment_records TO service_role;

ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their payment records"
ON public.payment_records FOR SELECT TO authenticated
USING (payer_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Payer can create payment records"
ON public.payment_records FOR INSERT TO authenticated
WITH CHECK (payer_id = auth.uid());

CREATE POLICY "Payer can update unverified payment records"
ON public.payment_records FOR UPDATE TO authenticated
USING (payer_id = auth.uid() AND status <> 'verified')
WITH CHECK (payer_id = auth.uid());

CREATE INDEX idx_payment_records_arrangement ON public.payment_records(arrangement_id);
CREATE INDEX idx_payment_records_payer ON public.payment_records(payer_id);
CREATE INDEX idx_payment_records_receiver ON public.payment_records(receiver_id);