-- New real parent accounts get a safeguarding_accounts row with the flag on.
-- Sign-up creates auth.users, handle_new_user inserts public.profiles (id only,
-- so is_test_account defaults to false), then this trigger inserts the row.
-- Test accounts (is_test_account is true at insert) are skipped.
-- If a test flag is later turned off, the same function adds the row.
-- Existing rows are left as they are (ON CONFLICT DO NOTHING).
-- Idempotent. Does not change suitability answers or the global switch.

CREATE OR REPLACE FUNCTION public.sg_enable_account_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_test_account IS NOT TRUE THEN
    INSERT INTO public.safeguarding_accounts (user_id, safeguarding_enabled)
    VALUES (NEW.id, true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sg_enable_account_for_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sg_enable_account_for_profile() TO postgres, service_role;

DROP TRIGGER IF EXISTS profiles_enable_safeguarding ON public.profiles;
CREATE TRIGGER profiles_enable_safeguarding
  AFTER INSERT OR UPDATE OF is_test_account ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sg_enable_account_for_profile();
