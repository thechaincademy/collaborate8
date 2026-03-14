-- Connected accounts for Stripe Connect (receiver onboarding)
CREATE TABLE public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  provider_account_id text NOT NULL,
  onboarding_status text NOT NULL DEFAULT 'pending',
  capabilities jsonb DEFAULT '{}',
  payouts_enabled boolean DEFAULT false,
  charges_enabled boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connected account"
  ON public.connected_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connected account"
  ON public.connected_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connected account"
  ON public.connected_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Co-parent can view connected account"
  ON public.connected_accounts FOR SELECT TO authenticated
  USING (user_id = get_coparent_id(auth.uid()));

ALTER TABLE public.recurring_payments
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS provider_price_id text,
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS next_due_date timestamptz,
  ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES public.profiles(id);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_charge_id text,
  ADD COLUMN IF NOT EXISTS provider_transfer_id text,
  ADD COLUMN IF NOT EXISTS provider_payout_id text,
  ADD COLUMN IF NOT EXISTS dispute_status text,
  ADD COLUMN IF NOT EXISTS payout_delay_until timestamptz;

CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;