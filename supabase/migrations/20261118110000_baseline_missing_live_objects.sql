-- Baseline: objects that exist on the old live Collabor8 database but were never
-- committed as migrations (created via the Lovable UI), plus live drift
-- (FK delete rules, nullability, defaults, grants, function ACLs).
-- Generated from a read-only structure export of the live database on 18 Nov 2026
-- (pg_catalog / information_schema / pg_policies only, no rows read).
-- Ordered before 20261118120000_safeguarding.sql, which re-applies its own
-- versions of create_notification and protect_is_test_account on top.
-- Idempotent: safe to run on a fresh database built from earlier migrations,
-- on a database that already has some of these objects, or on live itself.
-- Not included (per project): cron jobs (need the project URL and keys, see
-- supabase/uk-move/cron_jobs.template.sql) and dispatch_notification_email
-- (only the hardcoded project URL differs).

CREATE EXTENSION IF NOT EXISTS pgmq;

-- Tables that exist on live but were never committed as migrations
CREATE SEQUENCE IF NOT EXISTS public.admin_signup_exclusions_id_seq;
CREATE TABLE IF NOT EXISTS public.admin_signup_exclusions (
  id bigint DEFAULT nextval('admin_signup_exclusions_id_seq'::regclass) NOT NULL,
  kind text NOT NULL,
  value text NOT NULL,
  reason text NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.admin_signup_exclusions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  user_id uuid,
  token_hash text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL
);
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  message_id text,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id integer DEFAULT 1 NOT NULL,
  retry_after_until timestamp with time zone,
  batch_size integer DEFAULT 10 NOT NULL,
  send_delay_ms integer DEFAULT 200 NOT NULL,
  auth_email_ttl_minutes integer DEFAULT 15 NOT NULL,
  transactional_email_ttl_minutes integer DEFAULT 60 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  token text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  used_at timestamp with time zone
);
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  provider text DEFAULT 'google'::text NOT NULL,
  refresh_token text NOT NULL,
  scopes text,
  account_email text,
  connected_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.message_tone_private (
  message_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  original_body text,
  tone_score numeric,
  used_suggestion boolean,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.message_tone_private ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  store text NOT NULL,
  product_id text NOT NULL,
  original_transaction_id text,
  purchase_token text,
  latest_transaction_id text,
  status text NOT NULL,
  expires_at timestamp with time zone,
  auto_renew boolean,
  environment text,
  last_verified_at timestamp with time zone,
  last_notification_type text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER SEQUENCE public.admin_signup_exclusions_id_seq OWNED BY public.admin_signup_exclusions.id;
-- Columns added on live outside migrations
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS institution_id text;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS institution_name text;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS consent_token text;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS consent_status text DEFAULT 'pending'::text NOT NULL;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS account_id text;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS sort_code text;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS account_number_masked text;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS provider text DEFAULT 'stripe'::text NOT NULL;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS provider_account_id text;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'pending'::text NOT NULL;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS capabilities jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS payouts_enabled boolean DEFAULT false;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS charges_enabled boolean DEFAULT false;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS source text DEFAULT 'payment'::text NOT NULL;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS provider_session_id text;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS currency text DEFAULT 'gbp'::text;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS granted_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone;
ALTER TABLE public.conversation_tool_access ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean;
ALTER TABLE public.conversation_tool_responses ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.conversation_tool_responses ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.conversation_tool_responses ADD COLUMN IF NOT EXISTS answers jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.conversation_tool_responses ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.conversation_tool_responses ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
ALTER TABLE public.conversation_tool_responses ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.conversation_tool_responses ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.conversation_tool_responses ADD COLUMN IF NOT EXISTS summary_sent_at timestamp with time zone;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS holder_name text;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS sort_code text;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'monthly'::text NOT NULL;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS day_of_month integer;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS day_of_week text;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS reminders_enabled boolean DEFAULT true NOT NULL;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamp with time zone;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.coparent_bank_accounts ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS creator_id uuid;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS coparent_id uuid;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS category text DEFAULT 'other'::text NOT NULL;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal'::text NOT NULL;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS deadline timestamp with time zone;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS children _text DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS require_ack boolean DEFAULT false NOT NULL;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS status text DEFAULT 'awaiting'::text NOT NULL;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS original_request text;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS current_proposal text;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS final_outcome text;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS acknowledged_at timestamp with time zone;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.decision_threads ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text NOT NULL;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS decided_by uuid;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS decided_at timestamp with time zone;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS provider_invoice_item_id text;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS apply_note text;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS kind text DEFAULT 'expense'::text NOT NULL;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.expense_requests ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS inviter_id uuid;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS invite_code text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS invitee_email text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text NOT NULL;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS paid_on date DEFAULT CURRENT_DATE NOT NULL;
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id uuid;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id uuid;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS original_body text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS tone_score numeric;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS used_suggestion boolean DEFAULT false NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_path text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pending_first_message_id uuid;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS prefs jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS arrangement_id uuid;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS payer_id uuid;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS receiver_id uuid;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS period text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'maintenance'::text NOT NULL;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS expense_id uuid;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS amount_usdc numeric;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS amount_gbp_reference numeric;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS payer_wallet text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS receiver_wallet text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS reference_hash text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS salt text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS tx_signature text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS network text DEFAULT 'devnet'::text NOT NULL;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text NOT NULL;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS verification_error text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payer_id uuid;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payee_id uuid;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP'::text NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payment_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_consent_token text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS related_expense_id uuid;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS related_arrangement_id uuid;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider text DEFAULT 'manual'::text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_charge_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_transfer_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payout_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS dispute_status text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payout_delay_until timestamp with time zone;
ALTER TABLE public.pending_first_messages ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.pending_first_messages ADD COLUMN IF NOT EXISTS sender_id uuid;
ALTER TABLE public.pending_first_messages ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.pending_first_messages ADD COLUMN IF NOT EXISTS recipient_email text;
ALTER TABLE public.pending_first_messages ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;
ALTER TABLE public.pending_first_messages ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'managing'::text NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coparent_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test_account boolean DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamp with time zone;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS endpoint text;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS p256dh text;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS auth text;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS frequency text;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS day_of_month integer;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS day_of_week text;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS provider text DEFAULT 'manual'::text;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS provider_subscription_id text;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS provider_price_id text;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS provider_customer_id text;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS next_due_date timestamp with time zone;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS receiver_id uuid;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS thread_id uuid;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS actor_id uuid;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS expense_id uuid;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS attachment_path text;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.thread_events ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS tab text;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS anonymous_id uuid;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;

-- admin_signup_exclusions.id: live uses a sequence default, not identity
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_signup_exclusions' AND column_name='id' AND is_identity='YES') THEN
    ALTER TABLE public.admin_signup_exclusions ALTER COLUMN id DROP IDENTITY IF EXISTS;
  END IF;
END $$;
CREATE SEQUENCE IF NOT EXISTS public.admin_signup_exclusions_id_seq OWNED BY public.admin_signup_exclusions.id;
ALTER TABLE public.admin_signup_exclusions ALTER COLUMN id SET DEFAULT nextval('public.admin_signup_exclusions_id_seq'::regclass);
SELECT setval('public.admin_signup_exclusions_id_seq', GREATEST(COALESCE((SELECT max(id) FROM public.admin_signup_exclusions), 0), 1), (SELECT count(*) > 0 FROM public.admin_signup_exclusions));

-- usage_events_reportable depends on usage_events.anonymous_id; recreated below
DROP VIEW IF EXISTS public.usage_events_reportable;

-- Columns
ALTER TABLE public.admin_signup_exclusions ADD COLUMN IF NOT EXISTS id bigint DEFAULT nextval('admin_signup_exclusions_id_seq'::regclass) NOT NULL;
ALTER TABLE public.admin_signup_exclusions ADD COLUMN IF NOT EXISTS kind text NOT NULL;
ALTER TABLE public.admin_signup_exclusions ADD COLUMN IF NOT EXISTS value text NOT NULL;
ALTER TABLE public.admin_signup_exclusions ADD COLUMN IF NOT EXISTS reason text NOT NULL;
ALTER TABLE public.admin_signup_exclusions ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.admin_signup_exclusions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS key text NOT NULL;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS value text NOT NULL;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.decision_threads ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE public.decision_threads ALTER COLUMN coparent_id DROP NOT NULL;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS email text NOT NULL;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS token_hash text NOT NULL;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text NOT NULL;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL;
ALTER TABLE public.device_push_tokens ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.device_push_tokens ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;
ALTER TABLE public.device_push_tokens ADD COLUMN IF NOT EXISTS token text NOT NULL;
ALTER TABLE public.device_push_tokens ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.device_push_tokens ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.device_push_tokens ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS template_name text NOT NULL;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS recipient_email text NOT NULL;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS status text NOT NULL;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS id integer DEFAULT 1 NOT NULL;
ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS retry_after_until timestamp with time zone;
ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS batch_size integer DEFAULT 10 NOT NULL;
ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS send_delay_ms integer DEFAULT 200 NOT NULL;
ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS auth_email_ttl_minutes integer DEFAULT 15 NOT NULL;
ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS transactional_email_ttl_minutes integer DEFAULT 60 NOT NULL;
ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.email_unsubscribe_tokens ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.email_unsubscribe_tokens ADD COLUMN IF NOT EXISTS token text NOT NULL;
ALTER TABLE public.email_unsubscribe_tokens ADD COLUMN IF NOT EXISTS email text NOT NULL;
ALTER TABLE public.email_unsubscribe_tokens ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.email_unsubscribe_tokens ADD COLUMN IF NOT EXISTS used_at timestamp with time zone;
ALTER TABLE public.google_oauth_tokens ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.google_oauth_tokens ADD COLUMN IF NOT EXISTS provider text DEFAULT 'google'::text NOT NULL;
ALTER TABLE public.google_oauth_tokens ADD COLUMN IF NOT EXISTS refresh_token text NOT NULL;
ALTER TABLE public.google_oauth_tokens ADD COLUMN IF NOT EXISTS scopes text;
ALTER TABLE public.google_oauth_tokens ADD COLUMN IF NOT EXISTS account_email text;
ALTER TABLE public.google_oauth_tokens ADD COLUMN IF NOT EXISTS connected_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.google_oauth_tokens ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.message_tone_private ADD COLUMN IF NOT EXISTS message_id uuid NOT NULL;
ALTER TABLE public.message_tone_private ADD COLUMN IF NOT EXISTS sender_id uuid NOT NULL;
ALTER TABLE public.message_tone_private ADD COLUMN IF NOT EXISTS original_body text;
ALTER TABLE public.message_tone_private ADD COLUMN IF NOT EXISTS tone_score numeric;
ALTER TABLE public.message_tone_private ADD COLUMN IF NOT EXISTS used_suggestion boolean;
ALTER TABLE public.message_tone_private ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN recipient_id DROP NOT NULL;
ALTER TABLE public.payment_records ALTER COLUMN payer_id DROP NOT NULL;
ALTER TABLE public.payment_records ALTER COLUMN receiver_id DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN payer_id DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN payee_id DROP NOT NULL;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS store text NOT NULL;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS product_id text NOT NULL;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS original_transaction_id text;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS purchase_token text;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS latest_transaction_id text;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS status text NOT NULL;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS auto_renew boolean;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS environment text;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS last_notification_type text;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.store_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.suppressed_emails ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.suppressed_emails ADD COLUMN IF NOT EXISTS email text NOT NULL;
ALTER TABLE public.suppressed_emails ADD COLUMN IF NOT EXISTS reason text NOT NULL;
ALTER TABLE public.suppressed_emails ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.suppressed_emails ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.thread_events ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.usage_events ALTER COLUMN anonymous_id TYPE uuid USING (CASE WHEN anonymous_id::text ~* '^[0-9a-f-]{36}$' THEN anonymous_id::text::uuid END);

-- Constraints (live definitions; FK delete rules match live)
ALTER TABLE public.admin_signup_exclusions DROP CONSTRAINT IF EXISTS admin_signup_exclusions_pkey;
ALTER TABLE public.admin_signup_exclusions ADD CONSTRAINT admin_signup_exclusions_pkey PRIMARY KEY (id);
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);
ALTER TABLE public.deletion_requests DROP CONSTRAINT IF EXISTS deletion_requests_pkey;
ALTER TABLE public.deletion_requests ADD CONSTRAINT deletion_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.device_push_tokens DROP CONSTRAINT IF EXISTS device_push_tokens_pkey;
ALTER TABLE public.device_push_tokens ADD CONSTRAINT device_push_tokens_pkey PRIMARY KEY (id);
ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_pkey;
ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_pkey PRIMARY KEY (id);
ALTER TABLE public.email_send_state DROP CONSTRAINT IF EXISTS email_send_state_pkey;
ALTER TABLE public.email_send_state ADD CONSTRAINT email_send_state_pkey PRIMARY KEY (id);
ALTER TABLE public.email_unsubscribe_tokens DROP CONSTRAINT IF EXISTS email_unsubscribe_tokens_pkey;
ALTER TABLE public.email_unsubscribe_tokens ADD CONSTRAINT email_unsubscribe_tokens_pkey PRIMARY KEY (id);
ALTER TABLE public.google_oauth_tokens DROP CONSTRAINT IF EXISTS google_oauth_tokens_pkey;
ALTER TABLE public.google_oauth_tokens ADD CONSTRAINT google_oauth_tokens_pkey PRIMARY KEY (id);
ALTER TABLE public.message_tone_private DROP CONSTRAINT IF EXISTS message_tone_private_pkey;
ALTER TABLE public.message_tone_private ADD CONSTRAINT message_tone_private_pkey PRIMARY KEY (message_id);
ALTER TABLE public.store_subscriptions DROP CONSTRAINT IF EXISTS store_subscriptions_pkey;
ALTER TABLE public.store_subscriptions ADD CONSTRAINT store_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.suppressed_emails DROP CONSTRAINT IF EXISTS suppressed_emails_pkey;
ALTER TABLE public.suppressed_emails ADD CONSTRAINT suppressed_emails_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_signup_exclusions DROP CONSTRAINT IF EXISTS admin_signup_exclusions_kind_value_key;
ALTER TABLE public.admin_signup_exclusions ADD CONSTRAINT admin_signup_exclusions_kind_value_key UNIQUE (kind, value);
ALTER TABLE public.deletion_requests DROP CONSTRAINT IF EXISTS deletion_requests_token_hash_key;
ALTER TABLE public.deletion_requests ADD CONSTRAINT deletion_requests_token_hash_key UNIQUE (token_hash);
ALTER TABLE public.device_push_tokens DROP CONSTRAINT IF EXISTS device_push_tokens_token_key;
ALTER TABLE public.device_push_tokens ADD CONSTRAINT device_push_tokens_token_key UNIQUE (token);
ALTER TABLE public.email_unsubscribe_tokens DROP CONSTRAINT IF EXISTS email_unsubscribe_tokens_email_key;
ALTER TABLE public.email_unsubscribe_tokens ADD CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email);
ALTER TABLE public.email_unsubscribe_tokens DROP CONSTRAINT IF EXISTS email_unsubscribe_tokens_token_key;
ALTER TABLE public.email_unsubscribe_tokens ADD CONSTRAINT email_unsubscribe_tokens_token_key UNIQUE (token);
ALTER TABLE public.google_oauth_tokens DROP CONSTRAINT IF EXISTS google_oauth_tokens_provider_key;
ALTER TABLE public.google_oauth_tokens ADD CONSTRAINT google_oauth_tokens_provider_key UNIQUE (provider);
ALTER TABLE public.suppressed_emails DROP CONSTRAINT IF EXISTS suppressed_emails_email_key;
ALTER TABLE public.suppressed_emails ADD CONSTRAINT suppressed_emails_email_key UNIQUE (email);
ALTER TABLE public.admin_signup_exclusions DROP CONSTRAINT IF EXISTS admin_signup_exclusions_kind_check;
ALTER TABLE public.admin_signup_exclusions ADD CONSTRAINT admin_signup_exclusions_kind_check CHECK ((kind = ANY (ARRAY['domain'::text, 'email'::text, 'local_prefix'::text, 'alias_base'::text])));
ALTER TABLE public.device_push_tokens DROP CONSTRAINT IF EXISTS device_push_tokens_platform_check;
ALTER TABLE public.device_push_tokens ADD CONSTRAINT device_push_tokens_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])));
ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'suppressed'::text, 'failed'::text, 'bounced'::text, 'complained'::text, 'dlq'::text])));
ALTER TABLE public.email_send_state DROP CONSTRAINT IF EXISTS email_send_state_id_check;
ALTER TABLE public.email_send_state ADD CONSTRAINT email_send_state_id_check CHECK ((id = 1));
ALTER TABLE public.store_subscriptions DROP CONSTRAINT IF EXISTS store_subscriptions_environment_check;
ALTER TABLE public.store_subscriptions ADD CONSTRAINT store_subscriptions_environment_check CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));
ALTER TABLE public.store_subscriptions DROP CONSTRAINT IF EXISTS store_subscriptions_identifier_chk;
ALTER TABLE public.store_subscriptions ADD CONSTRAINT store_subscriptions_identifier_chk CHECK ((((store = 'apple'::text) AND (original_transaction_id IS NOT NULL)) OR ((store = 'google'::text) AND (purchase_token IS NOT NULL))));
ALTER TABLE public.store_subscriptions DROP CONSTRAINT IF EXISTS store_subscriptions_status_check;
ALTER TABLE public.store_subscriptions ADD CONSTRAINT store_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'grace_period'::text, 'billing_retry'::text, 'on_hold'::text, 'paused'::text, 'cancelled'::text, 'expired'::text, 'refunded'::text, 'revoked'::text, 'pending'::text])));
ALTER TABLE public.store_subscriptions DROP CONSTRAINT IF EXISTS store_subscriptions_store_check;
ALTER TABLE public.store_subscriptions ADD CONSTRAINT store_subscriptions_store_check CHECK ((store = ANY (ARRAY['apple'::text, 'google'::text])));
ALTER TABLE public.suppressed_emails DROP CONSTRAINT IF EXISTS suppressed_emails_reason_check;
ALTER TABLE public.suppressed_emails ADD CONSTRAINT suppressed_emails_reason_check CHECK ((reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text])));
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_actor_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_actor_check CHECK (((user_id IS NOT NULL) OR (anonymous_id IS NOT NULL)));
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_event_type_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_event_type_check CHECK ((event_type = ANY (ARRAY['tab_click'::text, 'signup_started'::text, 'signup_completed'::text, 'login'::text, 'expense_added'::text, 'expense_approved'::text, 'expense_rejected'::text, 'chat_message_sent'::text, 'document_uploaded'::text, 'payment_started'::text, 'payment_completed'::text, 'chatbot_opened'::text, 'chatbot_message_sent'::text, 'coparent_invite_sent'::text, 'coparent_linked'::text, 'decision_created'::text, 'benefits_viewed'::text, 'calculator_used'::text])));
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_metadata_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_metadata_check CHECK (((metadata IS NULL) OR ((jsonb_typeof(metadata) = 'object'::text) AND (pg_column_size(metadata) <= 1024))));
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_path_len_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_path_len_check CHECK (((path IS NULL) OR (char_length(path) <= 120)));
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_tab_len_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_tab_len_check CHECK (((tab IS NULL) OR (char_length(tab) <= 40)));
ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_user_id_fkey;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.device_push_tokens DROP CONSTRAINT IF EXISTS device_push_tokens_user_id_fkey;
ALTER TABLE public.device_push_tokens ADD CONSTRAINT device_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.expense_requests DROP CONSTRAINT IF EXISTS expense_requests_decided_by_fkey;
ALTER TABLE public.expense_requests ADD CONSTRAINT expense_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.message_tone_private DROP CONSTRAINT IF EXISTS message_tone_private_message_id_fkey;
ALTER TABLE public.message_tone_private ADD CONSTRAINT message_tone_private_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.payment_records DROP CONSTRAINT IF EXISTS payment_records_payer_id_fkey;
ALTER TABLE public.payment_records ADD CONSTRAINT payment_records_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payment_records DROP CONSTRAINT IF EXISTS payment_records_receiver_id_fkey;
ALTER TABLE public.payment_records ADD CONSTRAINT payment_records_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payee_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payer_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_related_arrangement_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_related_arrangement_id_fkey FOREIGN KEY (related_arrangement_id) REFERENCES recurring_payments(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_related_expense_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_related_expense_id_fkey FOREIGN KEY (related_expense_id) REFERENCES expense_requests(id) ON DELETE SET NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_coparent_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_coparent_id_fkey FOREIGN KEY (coparent_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.recurring_payments DROP CONSTRAINT IF EXISTS recurring_payments_receiver_id_fkey;
ALTER TABLE public.recurring_payments ADD CONSTRAINT recurring_payments_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.store_subscriptions DROP CONSTRAINT IF EXISTS store_subscriptions_user_id_fkey;
ALTER TABLE public.store_subscriptions ADD CONSTRAINT store_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS deletion_requests_email_idx ON public.deletion_requests USING btree (lower(email), created_at);
CREATE INDEX IF NOT EXISTS device_push_tokens_user_id_idx ON public.device_push_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log USING btree (message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token);
CREATE UNIQUE INDEX IF NOT EXISTS messages_pending_first_message_id_unique ON public.messages USING btree (pending_first_message_id) WHERE (pending_first_message_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS profiles_is_test_account_idx ON public.profiles USING btree (id) WHERE is_test_account;
CREATE UNIQUE INDEX IF NOT EXISTS store_subscriptions_apple_otid_key ON public.store_subscriptions USING btree (store, original_transaction_id) WHERE (store = 'apple'::text);
CREATE UNIQUE INDEX IF NOT EXISTS store_subscriptions_google_token_key ON public.store_subscriptions USING btree (store, purchase_token) WHERE (store = 'google'::text);
CREATE INDEX IF NOT EXISTS store_subscriptions_user_id_idx ON public.store_subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails USING btree (email);
CREATE INDEX IF NOT EXISTS usage_events_anon_idx ON public.usage_events USING btree (anonymous_id) WHERE (anonymous_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS usage_events_type_created_idx ON public.usage_events USING btree (event_type, created_at DESC);

-- Functions (live bodies) and EXECUTE privileges
DROP FUNCTION IF EXISTS public.admin_real_signups(_from timestamp with time zone, _to timestamp with time zone);  -- return type changed (bigint -> integer)
CREATE OR REPLACE FUNCTION public.admin_real_signups(_from timestamp with time zone, _to timestamp with time zone DEFAULT now())
 RETURNS TABLE(real_parent_signups integer, confirmed integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT count(*)::int, count(*) FILTER (WHERE email_confirmed)::int
  FROM public.admin_signup_classification()
  WHERE exclusion_reason IS NULL
    AND created_at >= coalesce(_from, '-infinity') AND created_at < coalesce(_to, 'infinity');
$function$;
REVOKE ALL ON FUNCTION public.admin_real_signups(_from timestamp with time zone, _to timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_real_signups(_from timestamp with time zone, _to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_real_signups(_from timestamp with time zone, _to timestamp with time zone) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_signup_classification()
 RETURNS TABLE(user_id uuid, created_at timestamp with time zone, created_day_uk date, week_start_uk date, email_confirmed boolean, exclusion_reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  WITH u AS (
    SELECT au.id, au.created_at, au.email_confirmed_at, au.deleted_at, au.is_anonymous,
           lower(trim(au.email)) AS email,
           split_part(lower(trim(au.email)),'@',2) AS domain,
           split_part(lower(trim(au.email)),'@',1) AS local,
           regexp_replace(lower(trim(au.email)), '\+[^@]*@', '@') AS base_email,
           p.is_test_account
    FROM auth.users au LEFT JOIN public.profiles p ON p.id = au.id
  ), m AS (
    SELECT u.*, (SELECT x.reason FROM public.admin_signup_exclusions x WHERE
                  (x.kind='domain'       AND (u.domain = x.value OR u.domain LIKE '%.'||x.value))
               OR (x.kind='email'        AND u.email = x.value)
               OR (x.kind='alias_base'   AND u.base_email = x.value)
               OR (x.kind='local_prefix' AND u.local LIKE x.value||'%')
               ORDER BY x.id LIMIT 1) AS list_reason
    FROM u
  )
  SELECT m.id, m.created_at,
         (m.created_at AT TIME ZONE 'Europe/London')::date,
         date_trunc('week', m.created_at AT TIME ZONE 'Europe/London')::date,   -- Monday, UK time
         m.email_confirmed_at IS NOT NULL,
         CASE
           WHEN coalesce(m.is_test_account,false)               THEN 'flagged_test'
           WHEN m.list_reason IS NOT NULL                       THEN m.list_reason
           WHEN m.email ~ '(^|[.+_-])test([.+_-]|@)'             THEN 'qa_agent'   -- whole-token "test" in local part only
           WHEN m.email IS NULL
             OR m.email !~ '^[^@\s]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' THEN 'invalid'  -- e.g. no TLD
           WHEN m.domain ~ '(^|\.)(example\.(com|org|net)|example|test|invalid|localhost)$'
                                                                THEN 'invalid'    -- RFC 2606/6761 reserved
           WHEN m.deleted_at IS NOT NULL OR m.is_anonymous      THEN 'invalid'
           WHEN EXISTS (SELECT 1 FROM public.suppressed_emails s WHERE lower(s.email) = m.email
                        AND s.reason ILIKE ANY (ARRAY['%bounce%','%invalid%','%complain%']))
                                                                THEN 'bounced'
           ELSE NULL                                            -- real parent sign-up
         END
  FROM m
  WHERE auth.uid() IS NULL OR public.is_admin(auth.uid());     -- service_role/cron or admins only
$function$;
REVOKE ALL ON FUNCTION public.admin_signup_classification() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_signup_classification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_signup_classification() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_signup_summary(_weeks integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH t AS (SELECT (now() AT TIME ZONE 'Europe/London')::date AS today,
                    date_trunc('week', now() AT TIME ZONE 'Europe/London')::date AS this_wk),
  c AS (SELECT * FROM public.admin_signup_classification() WHERE exclusion_reason IS NULL),
  w AS (SELECT generate_series(t.this_wk - 7*(greatest(_weeks,1)-1), t.this_wk, interval '7 days')::date wk FROM t)
  SELECT jsonb_build_object(
    'timezone', 'Europe/London',
    'generated_at', now(),
    'last_7_full_days', (SELECT jsonb_build_object('from_uk', t.today-7, 'to_uk_exclusive', t.today,
        'label', 'Last 7 full days (' || to_char(t.today-7,'Dy DD Mon') || ' to ' || to_char(t.today-1,'Dy DD Mon') || ', UK)',
        'real_parent_signups', count(c.user_id), 'confirmed', count(c.user_id) FILTER (WHERE c.email_confirmed))
      FROM t LEFT JOIN c ON c.created_day_uk >= t.today-7 AND c.created_day_uk < t.today GROUP BY t.today),
    'this_week_so_far', (SELECT jsonb_build_object('week_start_uk', t.this_wk,
        'label', 'Week starting ' || to_char(t.this_wk,'Dy DD Mon') || ' (so far)', 'is_partial', true,
        'real_parent_signups', count(c.user_id), 'confirmed', count(c.user_id) FILTER (WHERE c.email_confirmed))
      FROM t LEFT JOIN c ON c.week_start_uk = t.this_wk GROUP BY t.this_wk),
    'weekly', (SELECT jsonb_agg(jsonb_build_object('week_start_uk', w.wk,
        'label', 'Week starting ' || to_char(w.wk,'Dy DD Mon') || CASE WHEN w.wk = t.this_wk THEN ' (so far)' ELSE '' END,
        'is_partial', w.wk = t.this_wk,
        'real_parent_signups', (SELECT count(*) FROM c WHERE c.week_start_uk = w.wk),
        'confirmed', (SELECT count(*) FROM c WHERE c.week_start_uk = w.wk AND c.email_confirmed)) ORDER BY w.wk)
      FROM w, t),
    'total', (SELECT jsonb_build_object('real_parent_signups', count(*), 'confirmed', count(*) FILTER (WHERE email_confirmed)) FROM c),
    'excluded', (SELECT jsonb_object_agg(r, n) FROM (SELECT exclusion_reason r, count(*) n
                 FROM public.admin_signup_classification() WHERE exclusion_reason IS NOT NULL GROUP BY 1) e)
  );
$function$;
REVOKE ALL ON FUNCTION public.admin_signup_summary(_weeks integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_signup_summary(_weeks integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_signup_summary(_weeks integer) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_usage_summary(_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_since timestamptz := now() - make_interval(days => GREATEST(_days, 1));
  -- Sign-ups use full UK days: the _days complete days before today (Europe/London)
  v_today date := (now() AT TIME ZONE 'Europe/London')::date;
  v_su_from timestamptz := ((v_today - GREATEST(_days, 1))::timestamp AT TIME ZONE 'Europe/London');
  v_su_to   timestamptz := (v_today::timestamp AT TIME ZONE 'Europe/London');
  v_new record;
  v_tot record;
  v_signups jsonb;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT * INTO v_new FROM public.admin_real_signups(v_su_from, v_su_to);
  SELECT * INTO v_tot FROM public.admin_real_signups(NULL, NULL);
  v_signups := public.admin_signup_summary(8);

  SELECT jsonb_build_object(
    'since', v_since,
    'days', GREATEST(_days, 1),
    'total_users', v_tot.real_parent_signups,
    'total_users_confirmed', v_tot.confirmed,
    'new_users', v_new.real_parent_signups,
    'new_users_confirmed', v_new.confirmed,
    'new_users_label', 'Last ' || GREATEST(_days, 1) || ' full days (' || to_char(v_today - GREATEST(_days, 1), 'Dy DD Mon') || ' to ' || to_char(v_today - 1, 'Dy DD Mon') || ', UK)',
    'signups', v_signups,
    'active_users', (SELECT count(DISTINCT user_id) FROM public.usage_events_reportable WHERE created_at >= v_since AND user_id IS NOT NULL),
    'total_events', (SELECT count(*) FROM public.usage_events_reportable WHERE created_at >= v_since),
    'linked_pairs', (SELECT count(*) FROM public.profiles WHERE coparent_id IS NOT NULL AND NOT is_test_account),
    'payments_count', (SELECT count(*) FROM public.payments y WHERE y.created_at >= v_since
                         AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = y.payer_id AND p.is_test_account)),
    'payments_total', (SELECT COALESCE(sum(amount), 0) FROM public.payments y WHERE y.created_at >= v_since AND y.status IN ('succeeded','completed','paid')
                         AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = y.payer_id AND p.is_test_account)),
    'expenses_count', (SELECT count(*) FROM public.expense_requests x WHERE x.created_at >= v_since
                         AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = x.user_id AND p.is_test_account)),
    'tabs', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT COALESCE(tab, path, event_type) AS name, count(*) AS clicks, count(DISTINCT user_id) AS users
        FROM public.usage_events_reportable
        WHERE created_at >= v_since AND event_type = 'tab_click'
        GROUP BY 1 ORDER BY count(*) DESC LIMIT 25
      ) t
    ),
    'features', (
      SELECT COALESCE(jsonb_agg(f), '[]'::jsonb) FROM (
        SELECT event_type AS name, count(*) AS events,
               count(DISTINCT COALESCE(user_id::text, 'anon:' || anonymous_id::text)) AS users
        FROM public.usage_events_reportable
        WHERE created_at >= v_since AND event_type <> 'tab_click'
        GROUP BY 1 ORDER BY count(*) DESC
      ) f
    ),
    'signup_funnel', (
      WITH completed AS (
        SELECT DISTINCT user_id FROM public.usage_events_reportable
        WHERE event_type = 'signup_completed' AND created_at >= v_since AND user_id IS NOT NULL
      )
      SELECT jsonb_build_object(
        'started_anon', (SELECT count(DISTINCT anonymous_id) FROM public.usage_events_reportable
                          WHERE event_type = 'signup_started' AND created_at >= v_since),
        'completed', (SELECT count(*) FROM completed),
        'invited_or_linked', (SELECT count(DISTINCT e.user_id) FROM public.usage_events_reportable e
                               JOIN completed c USING (user_id)
                               WHERE e.event_type IN ('coparent_invite_sent', 'coparent_linked')),
        'first_action', (SELECT count(DISTINCT e.user_id) FROM public.usage_events_reportable e
                          JOIN completed c USING (user_id)
                          WHERE e.event_type IN ('expense_added', 'chat_message_sent', 'document_uploaded',
                                                 'decision_created', 'payment_started'))
      )
    ),
    'daily', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d->>'day'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
                                  'events', count(*), 'users', count(DISTINCT user_id)) AS d
        FROM public.usage_events_reportable
        WHERE created_at >= v_since
        GROUP BY date_trunc('day', created_at)
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_usage_summary(_days integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_usage_summary(_days integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_usage_summary(_days integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_usage_summary(_days integer) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_pending_first_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.pending_first_messages;
BEGIN
  IF NEW.pending_first_message_id IS NOT NULL THEN
    SELECT * INTO p FROM public.pending_first_messages
      WHERE id = NEW.pending_first_message_id FOR UPDATE;
    IF NOT FOUND OR p.sender_id <> NEW.sender_id THEN
      RAISE EXCEPTION 'Invalid pending message';
    END IF;
  ELSE
    SELECT * INTO p FROM public.pending_first_messages
      WHERE sender_id = NEW.sender_id AND body = NEW.body AND created_at = NEW.created_at
      ORDER BY created_at LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RETURN NEW; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles a JOIN public.profiles b ON b.id = a.coparent_id
    WHERE a.id = p.sender_id AND b.id = NEW.recipient_id AND b.coparent_id = a.id) THEN
    RAISE EXCEPTION 'Co-parent link is not complete';
  END IF;
  IF p.delivered_at IS NOT NULL THEN RETURN NULL; END IF;
  NEW.pending_first_message_id := p.id;
  NEW.created_at := p.created_at;
  NEW.body := p.body;
  UPDATE public.pending_first_messages SET delivered_at = now() WHERE id = p.id;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.claim_pending_first_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_first_message() TO service_role;

CREATE OR REPLACE FUNCTION public.create_notification(_user uuid, _type text, _title text, _message text, _link text, _dedupe text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id, type, title, message, link, dedupe_key)
  VALUES (_user, _type, _title, _message, _link, _dedupe)
  ON CONFLICT (dedupe_key) DO NOTHING;
END; $function$;
REVOKE ALL ON FUNCTION public.create_notification(_user uuid, _type text, _title text, _message text, _link text, _dedupe text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(_user uuid, _type text, _title text, _message text, _link text, _dedupe text) TO service_role;

CREATE OR REPLACE FUNCTION public.deliver_pending_messages_on_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.pending_first_messages;
BEGIN
  IF NEW.coparent_id IS NULL OR NEW.coparent_id IS NOT DISTINCT FROM OLD.coparent_id THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.coparent_id AND coparent_id = NEW.id) THEN RETURN NEW; END IF;
  FOR p IN SELECT * FROM public.pending_first_messages
    WHERE sender_id IN (NEW.id, NEW.coparent_id) AND delivered_at IS NULL
    ORDER BY id FOR UPDATE
  LOOP
    INSERT INTO public.messages(sender_id, recipient_id, body, created_at, pending_first_message_id)
      VALUES(p.sender_id, CASE WHEN p.sender_id = NEW.id THEN NEW.coparent_id ELSE NEW.id END,
        p.body, p.created_at, p.id)
      ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.deliver_pending_messages_on_link() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deliver_pending_messages_on_link() TO service_role;

CREATE OR REPLACE FUNCTION public.has_premium_access(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT uid = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversation_tool_access a
    WHERE a.user_id = uid AND CASE
      WHEN NULLIF(a.subscription_status, '') IS NOT NULL THEN
        a.subscription_status IN ('active', 'trialing') OR a.current_period_end > now()
      ELSE a.expires_at IS NULL OR a.expires_at > now()
    END
  );
$function$;
REVOKE ALL ON FUNCTION public.has_premium_access(uid uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_premium_access(uid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_premium_access(uid uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.lock_sent_message_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'read_at') THEN
    RAISE EXCEPTION 'Sent messages cannot be changed';
  END IF;
  IF NEW.read_at IS DISTINCT FROM OLD.read_at AND (OLD.read_at IS NOT NULL OR NEW.read_at IS NULL) THEN
    RAISE EXCEPTION 'read_at can only be set once';
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.lock_sent_message_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_sent_message_columns() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_sent_message_columns() TO anon;
GRANT EXECUTE ON FUNCTION public.lock_sent_message_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_sent_message_columns() TO service_role;

CREATE OR REPLACE FUNCTION public.move_message_tone_private()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sender_id IS NOT NULL AND (NEW.original_body IS NOT NULL OR NEW.tone_score IS NOT NULL OR NEW.used_suggestion IS TRUE) THEN
    INSERT INTO public.message_tone_private(message_id, sender_id, original_body, tone_score, used_suggestion)
    VALUES (NEW.id, NEW.sender_id, NEW.original_body, NEW.tone_score, NEW.used_suggestion)
    ON CONFLICT (message_id) DO NOTHING;
  END IF;
  NEW.original_body := NULL;
  NEW.tone_score := NULL;
  NEW.used_suggestion := false;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.move_message_tone_private() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.move_message_tone_private() TO service_role;

CREATE OR REPLACE FUNCTION public.protect_is_test_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_test_account := false;
    ELSE
      NEW.is_test_account := OLD.is_test_account;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.protect_is_test_account() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_is_test_account() TO service_role;

CREATE OR REPLACE FUNCTION public.purge_deleted_account_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$;
REVOKE ALL ON FUNCTION public.purge_deleted_account_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_deleted_account_data() TO service_role;

CREATE OR REPLACE FUNCTION public.sanitize_usage_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[] := ARRAY[
    'tab','flow','method','source','surface','kind','category','priority',
    'product','interval','amount_bucket','file_type','has_receipt',
    'has_deadline','require_ack','used_suggestion','rewritten','pending',
    'options_count','action'
  ];
  k text;
  v jsonb;
  clean jsonb := '{}'::jsonb;
BEGIN
  NEW.created_at := now();

  IF NEW.path IS NOT NULL THEN
    NEW.path := left(split_part(split_part(NEW.path, '?', 1), '#', 1), 120);
  END IF;

  IF NEW.metadata IS NOT NULL THEN
    IF jsonb_typeof(NEW.metadata) <> 'object' THEN
      NEW.metadata := NULL;
    ELSE
      FOR k, v IN SELECT key, value FROM jsonb_each(NEW.metadata) LOOP
        IF k = ANY (allowed) AND (
             jsonb_typeof(v) = 'boolean'
          OR (jsonb_typeof(v) = 'number' AND k = 'options_count')
          OR (jsonb_typeof(v) = 'string'
              AND char_length(v #>> '{}') <= 40
              AND position('@' IN (v #>> '{}')) = 0)
        ) THEN
          clean := clean || jsonb_build_object(k, v);
        END IF;
      END LOOP;
      NEW.metadata := NULLIF(clean, '{}'::jsonb);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.sanitize_usage_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_usage_event() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sanitize_usage_event() TO anon;
GRANT EXECUTE ON FUNCTION public.sanitize_usage_event() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_usage_event() TO service_role;

-- View
CREATE OR REPLACE VIEW public.usage_events_reportable WITH (security_invoker=true) AS
 WITH test_users AS (
         SELECT profiles.id
           FROM profiles
          WHERE profiles.is_test_account
        ), test_anon AS (
         SELECT DISTINCT e.anonymous_id
           FROM (usage_events e
             JOIN test_users t ON ((t.id = e.user_id)))
          WHERE (e.anonymous_id IS NOT NULL)
        )
 SELECT id,
    user_id,
    event_type,
    tab,
    path,
    metadata,
    created_at,
    anonymous_id
   FROM usage_events ue
  WHERE (((user_id IS NULL) OR ((NOT (EXISTS ( SELECT 1
           FROM test_users t
          WHERE (t.id = ue.user_id)))) AND (NOT is_admin(user_id)))) AND ((anonymous_id IS NULL) OR (NOT (EXISTS ( SELECT 1
           FROM test_anon a
          WHERE (a.anonymous_id = ue.anonymous_id))))));

-- Triggers
DROP TRIGGER IF EXISTS device_push_tokens_updated_at ON public.device_push_tokens;
CREATE TRIGGER device_push_tokens_updated_at BEFORE UPDATE ON public.device_push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS claim_pending_first_message ON public.messages;
CREATE TRIGGER claim_pending_first_message BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION claim_pending_first_message();
DROP TRIGGER IF EXISTS messages_lock_sent_columns ON public.messages;
CREATE TRIGGER messages_lock_sent_columns BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION lock_sent_message_columns();
DROP TRIGGER IF EXISTS zz_messages_move_tone_private ON public.messages;
CREATE TRIGGER zz_messages_move_tone_private BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION move_message_tone_private();
DROP TRIGGER IF EXISTS deliver_pending_messages_on_link ON public.profiles;
CREATE TRIGGER deliver_pending_messages_on_link AFTER UPDATE OF coparent_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION deliver_pending_messages_on_link();
DROP TRIGGER IF EXISTS profiles_protect_is_test_account ON public.profiles;
CREATE TRIGGER profiles_protect_is_test_account BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_is_test_account();
DROP TRIGGER IF EXISTS update_store_subscriptions_updated_at ON public.store_subscriptions;
CREATE TRIGGER update_store_subscriptions_updated_at BEFORE UPDATE ON public.store_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS usage_events_sanitize ON public.usage_events;
CREATE TRIGGER usage_events_sanitize BEFORE INSERT ON public.usage_events FOR EACH ROW EXECUTE FUNCTION sanitize_usage_event();

-- RLS policies
DROP POLICY IF EXISTS "Admins manage signup exclusions" ON public.admin_signup_exclusions;
CREATE POLICY "Admins manage signup exclusions" ON public.admin_signup_exclusions AS PERMISSIVE FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Co-parent can view bank connections" ON public.bank_connections;
CREATE POLICY "Co-parent can view bank connections" ON public.bank_connections AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = get_coparent_id(auth.uid())));
DROP POLICY IF EXISTS "Users delete own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users delete own device tokens" ON public.device_push_tokens AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
DROP POLICY IF EXISTS "Users insert own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users insert own device tokens" ON public.device_push_tokens AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
DROP POLICY IF EXISTS "Users select own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users select own device tokens" ON public.device_push_tokens AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
DROP POLICY IF EXISTS "Users update own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users update own device tokens" ON public.device_push_tokens AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
CREATE POLICY "Service role can insert send log" ON public.email_send_log AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
CREATE POLICY "Service role can read send log" ON public.email_send_log AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role can update send log" ON public.email_send_log AS PERMISSIVE FOR UPDATE TO public USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state" ON public.email_send_state AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR UPDATE TO public USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Senders can read their own tone data" ON public.message_tone_private;
CREATE POLICY "Senders can read their own tone data" ON public.message_tone_private AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = sender_id));
DROP POLICY IF EXISTS "Users can view their own store subscriptions" ON public.store_subscriptions;
CREATE POLICY "Users can view their own store subscriptions" ON public.store_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Users can record their own usage events" ON public.usage_events;
CREATE POLICY "Users can record their own usage events" ON public.usage_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
DROP POLICY IF EXISTS "Visitors can record pre-signup events" ON public.usage_events;
CREATE POLICY "Visitors can record pre-signup events" ON public.usage_events AS PERMISSIVE FOR INSERT TO anon WITH CHECK (((user_id IS NULL) AND (anonymous_id IS NOT NULL) AND (event_type = ANY (ARRAY['signup_started'::text, 'signup_completed'::text, 'calculator_used'::text]))));
DROP POLICY IF EXISTS "Chat attachments require premium insert" ON storage.objects;
CREATE POLICY "Chat attachments require premium insert" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id <> 'chat-attachments'::text) OR (((storage.foldername(name))[1] = (auth.uid())::text) AND has_premium_access(auth.uid()))));
-- not on live (reconstruction guess)
DROP POLICY IF EXISTS "Co-parent can view bank connections when safeguarding is off" ON public.bank_connections;

-- Table privileges (live is tighter than Supabase defaults on these)
REVOKE ALL ON public.admin_signup_exclusions FROM anon, authenticated;
REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.app_settings TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.app_settings TO authenticated;
REVOKE ALL ON public.deletion_requests FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.deletion_requests TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.deletion_requests TO authenticated;
REVOKE ALL ON public.device_push_tokens FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.device_push_tokens TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.device_push_tokens TO authenticated;
REVOKE ALL ON public.email_send_log FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.email_send_log TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.email_send_log TO authenticated;
REVOKE ALL ON public.email_send_state FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.email_send_state TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.email_send_state TO authenticated;
REVOKE ALL ON public.email_unsubscribe_tokens FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.email_unsubscribe_tokens TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.email_unsubscribe_tokens TO authenticated;
REVOKE ALL ON public.google_oauth_tokens FROM anon, authenticated;
REVOKE ALL ON public.message_tone_private FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.message_tone_private TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.message_tone_private TO authenticated;
REVOKE ALL ON public.store_subscriptions FROM anon, authenticated;
GRANT REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.store_subscriptions TO authenticated;
REVOKE ALL ON public.suppressed_emails FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.suppressed_emails TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.suppressed_emails TO authenticated;
REVOKE ALL ON public.usage_events FROM anon, authenticated;
GRANT INSERT ON public.usage_events TO anon;
GRANT INSERT, SELECT ON public.usage_events TO authenticated;
REVOKE ALL ON public.usage_events_reportable FROM anon, authenticated;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('chat-attachments', 'chat-attachments', false, 10485760, NULL) ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('receipts', 'receipts', false, NULL, NULL) ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

