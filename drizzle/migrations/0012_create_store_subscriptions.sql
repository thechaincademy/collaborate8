CREATE TABLE public.store_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store text NOT NULL CHECK (store IN ('apple','google')),
  product_id text NOT NULL,
  original_transaction_id text,
  purchase_token text,
  latest_transaction_id text,
  status text NOT NULL CHECK (status IN ('active','grace_period','billing_retry','on_hold','paused','cancelled','expired','refunded','revoked','pending')),
  expires_at timestamptz,
  auto_renew boolean,
  environment text CHECK (environment IN ('sandbox','production')),
  last_verified_at timestamptz,
  last_notification_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_subscriptions_identifier_chk CHECK (
    (store = 'apple' AND original_transaction_id IS NOT NULL) OR
    (store = 'google' AND purchase_token IS NOT NULL)
  )
);

CREATE UNIQUE INDEX store_subscriptions_apple_otid_key ON public.store_subscriptions (store, original_transaction_id) WHERE store = 'apple';
CREATE UNIQUE INDEX store_subscriptions_google_token_key ON public.store_subscriptions (store, purchase_token) WHERE store = 'google';
CREATE INDEX store_subscriptions_user_id_idx ON public.store_subscriptions (user_id);

GRANT SELECT ON public.store_subscriptions TO authenticated;
GRANT ALL ON public.store_subscriptions TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.store_subscriptions FROM anon, authenticated;
REVOKE ALL ON public.store_subscriptions FROM anon;

ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store subscriptions"
  ON public.store_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_store_subscriptions_updated_at
  BEFORE UPDATE ON public.store_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();