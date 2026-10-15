-- =====================================================================
-- Collabor8 - Product Tracker row 7 (part 1 of 2): test-account flag
-- DRAFT - not applied. Run BEFORE 20261015180500_feature_usage_analytics.sql.
--
-- Adds profiles.is_test_account so QA's (and any future) test accounts can be
-- left out of usage reports, /admin and the weekly email.
-- This migration does NOT flag any account. An admin sets the flag separately
-- (see plan.md, "Flag QA's test account").
-- Safe to re-run.
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_test_account IS
  'True for internal test accounts (e.g. QA). Excluded from usage analytics and admin reports. Only admins or the SQL editor can change it.';

-- Users can update their own profile row (policy "Users can update own profile"
-- has no column limits), so stop them flipping this flag through the API.
-- Admins (is_admin) and server-side SQL (no auth.uid(), e.g. the SQL editor or
-- service role) can still change it.
CREATE OR REPLACE FUNCTION public.protect_is_test_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.protect_is_test_account() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_protect_is_test_account ON public.profiles;
CREATE TRIGGER profiles_protect_is_test_account
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_is_test_account();

CREATE INDEX IF NOT EXISTS profiles_is_test_account_idx
  ON public.profiles (id) WHERE is_test_account;