-- NOT A MIGRATION. Do not put this in supabase/migrations. Nobody has applied it.
-- Gives the Collabor8 safeguarding-lead role (app_role 'dsl') to named accounts.
-- Each block is optional and separate. Run only the blocks Rafa has said yes to,
-- one at a time, on the project she names. Every block is safe to re-run.
--
-- Read-only lookups on London (byrwtxdalhsmvktuzoya), 20 Nov 2026:
--   jade@collaborate8.com          42cd9e3e-be88-41e4-aefa-6f698ff4bff6  already holds dsl
--   rafa@collaborate8.com          7261b042-5fc8-4d8a-b3ad-d8e3d0fa560c  already holds dsl (and admin)
--   collaborate8-qa+uk3@agentmail.to c303a57c-892a-4512-b424-6c108c3720bb  no dsl role, is_test_account = true
-- So on London, blocks A and B change nothing today; block C is the only real change.
-- Check the ids again before running: replace each placeholder with the id you
-- confirmed. Each block refuses to run if the id does not match the email.
--
-- Who receives what once the switch is on:
--   Real families: every dsl holder whose email is not on the QA domain (Jade, Rafa).
--   Test families, or any alert while force_test_alerts = 'true':
--   collaborate8-qa@agentmail.to only, subject starts with [TEST], and only when a
--   QA test lead (block C) holds the role. Real leads never get test alerts.

-- ---------------------------------------------------------------------------
-- Block A (optional): Jade, safeguarding lead.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  jade_id uuid := '<JADE_USER_ID>';  -- London lookup: 42cd9e3e-be88-41e4-aefa-6f698ff4bff6
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = jade_id AND lower(email) = 'jade@collaborate8.com') THEN
    RAISE EXCEPTION 'Block A: id does not match jade@collaborate8.com';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (jade_id, 'dsl')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- Block B (optional): Rafa, backup safeguarding lead.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rafa_id uuid := '<RAFA_USER_ID>';  -- London lookup: 7261b042-5fc8-4d8a-b3ad-d8e3d0fa560c
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = rafa_id AND lower(email) = 'rafa@collaborate8.com') THEN
    RAISE EXCEPTION 'Block B: id does not match rafa@collaborate8.com';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (rafa_id, 'dsl')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- Block C (optional): QA test lead (uk3 QA login), so QA can check delivery on
-- the test site. Its alerts go only to collaborate8-qa@agentmail.to, marked [TEST].
-- Remove it again with block C-undo when testing is finished.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  qa_id uuid := '<UK3_QA_USER_ID>';  -- London lookup: c303a57c-892a-4512-b424-6c108c3720bb
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id = u.id
    WHERE u.id = qa_id
      AND lower(u.email) = 'collaborate8-qa+uk3@agentmail.to'
      AND p.is_test_account
  ) THEN
    RAISE EXCEPTION 'Block C: id is not the uk3 QA test account';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (qa_id, 'dsl')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- Block C-undo (optional): take the role back from the uk3 QA login.
-- DELETE FROM public.user_roles WHERE user_id = '<UK3_QA_USER_ID>' AND role = 'dsl';

-- Check afterwards (read-only):
-- SELECT r.user_id, u.email FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id WHERE r.role = 'dsl';
