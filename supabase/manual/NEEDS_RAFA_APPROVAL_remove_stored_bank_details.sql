-- NEEDS RAFA APPROVAL. DESTRUCTIVE. NOT APPLIED BY supabase db push.
-- Clears stored sort codes and account numbers (plaintext and any encrypted copies)
-- after the website and app no longer read them.
-- Run by hand only:
--   supabase db query --linked -f supabase/manual/NEEDS_RAFA_APPROVAL_remove_stored_bank_details.sql

ALTER TABLE public.bank_connections DISABLE TRIGGER bank_connections_notify;
ALTER TABLE public.bank_connections DISABLE TRIGGER update_bank_connections_updated_at;

ALTER TABLE public.coparent_bank_accounts ALTER COLUMN sort_code DROP NOT NULL;
ALTER TABLE public.coparent_bank_accounts ALTER COLUMN account_number DROP NOT NULL;

UPDATE public.coparent_bank_accounts
SET sort_code = NULL,
    account_number = NULL;

UPDATE public.bank_connections
SET sort_code = NULL,
    account_number_masked = NULL;

ALTER TABLE public.coparent_bank_accounts DROP COLUMN IF EXISTS sort_code_enc;
ALTER TABLE public.coparent_bank_accounts DROP COLUMN IF EXISTS account_number_enc;
ALTER TABLE public.bank_connections DROP COLUMN IF EXISTS sort_code_enc;

ALTER TABLE public.bank_connections ENABLE TRIGGER update_bank_connections_updated_at;
ALTER TABLE public.bank_connections ENABLE TRIGGER bank_connections_notify;
