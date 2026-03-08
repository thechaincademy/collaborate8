
-- Bank connections table
CREATE TABLE public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  consent_token TEXT,
  consent_status TEXT NOT NULL DEFAULT 'pending',
  account_id TEXT,
  account_type TEXT,
  account_name TEXT,
  sort_code TEXT,
  account_number_masked TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  payer_id UUID NOT NULL REFERENCES public.profiles(id),
  payee_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_payment_id TEXT,
  provider_consent_token TEXT,
  related_expense_id UUID REFERENCES public.expense_requests(id),
  related_arrangement_id UUID REFERENCES public.recurring_payments(id),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit events table
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Bank connections RLS
CREATE POLICY "Users can manage own bank connections" ON public.bank_connections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Co-parent can view bank connections" ON public.bank_connections
  FOR SELECT TO authenticated
  USING (user_id = public.get_coparent_id(auth.uid()));

-- Payments RLS - both payer and payee can view
CREATE POLICY "Payer can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = payer_id);

CREATE POLICY "Payee can view received payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = payee_id);

CREATE POLICY "Authenticated users can insert payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Payer can update own payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = payer_id);

-- Audit events RLS
CREATE POLICY "Users can view own audit events" ON public.audit_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit events" ON public.audit_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update expense_requests RLS: co-parent can view
CREATE POLICY "Co-parent can view expenses" ON public.expense_requests
  FOR SELECT TO authenticated
  USING (user_id = public.get_coparent_id(auth.uid()));

-- Update recurring_payments RLS: co-parent can view
CREATE POLICY "Co-parent can view payments" ON public.recurring_payments
  FOR SELECT TO authenticated
  USING (user_id = public.get_coparent_id(auth.uid()));

-- Updated_at triggers for new tables
CREATE TRIGGER update_bank_connections_updated_at
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
