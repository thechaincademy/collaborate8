-- Safeguarding. Additive. Off for every account until an admin sets safeguarding_enabled.
-- Pair rules run only when at least one parent in the family has that flag.
-- Preview and live share this database, so a flag left false changes nothing for that family.
-- Collect and Pay is run by the Child Maintenance Service. This file does not route payments.

CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pgcrypto unavailable';
    END;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.bank_field_keys (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  key bytea NOT NULL
);
INSERT INTO private.bank_field_keys (id, key)
VALUES (1, extensions.gen_random_bytes(32))
ON CONFLICT (id) DO NOTHING;
REVOKE ALL ON TABLE private.bank_field_keys FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.encrypt_bank_text(plain text)
RETURNS bytea
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, extensions, public
AS $$
  SELECT CASE
    WHEN plain IS NULL OR plain = '' THEN NULL
    ELSE pgp_sym_encrypt(plain, encode((SELECT key FROM private.bank_field_keys WHERE id = 1), 'hex'))
  END;
$$;

CREATE OR REPLACE FUNCTION private.decrypt_bank_text(cipher bytea)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, extensions, public
AS $$
  SELECT CASE
    WHEN cipher IS NULL THEN NULL
    ELSE pgp_sym_decrypt(cipher, encode((SELECT key FROM private.bank_field_keys WHERE id = 1), 'hex'))
  END;
$$;
REVOKE ALL ON FUNCTION private.encrypt_bank_text(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.decrypt_bank_text(bytea) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('parent', 'dsl', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.safeguarding_is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'dsl')
      OR public.has_role(_user_id, 'admin')
      OR public.is_admin(_user_id);
$$;
REVOKE ALL ON FUNCTION public.safeguarding_is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.safeguarding_is_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.safeguarding_is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.assign_parent_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'parent')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_assign_parent_role ON public.profiles;
CREATE TRIGGER profiles_assign_parent_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_parent_role();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'parent'::public.app_role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- DSL by email. No hardcoded user id. Safe to re-run.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'dsl'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('rafa@collaborate8.com', 'jade@collaborate8.com')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_is_test_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_test_account := false;
    ELSE
      NEW.is_test_account := OLD.is_test_account;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_protect_is_test_account ON public.profiles;
CREATE TRIGGER profiles_protect_is_test_account
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_is_test_account();

-- Kept off the profiles row because a co-parent can read that row.
CREATE TABLE IF NOT EXISTS public.safeguarding_accounts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  safeguarding_enabled boolean NOT NULL DEFAULT false,
  money_guidance boolean NOT NULL DEFAULT false,
  security_check_offered boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.safeguarding_accounts TO authenticated;
GRANT ALL ON public.safeguarding_accounts TO service_role;
ALTER TABLE public.safeguarding_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own safeguarding account" ON public.safeguarding_accounts;
CREATE POLICY "Users read own safeguarding account" ON public.safeguarding_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.safeguarding_is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.family_safeguarding (
  parent_low uuid NOT NULL,
  parent_high uuid NOT NULL,
  paused_at timestamptz,
  PRIMARY KEY (parent_low, parent_high),
  CHECK (parent_low <= parent_high)
);
GRANT SELECT ON public.family_safeguarding TO authenticated;
GRANT ALL ON public.family_safeguarding TO service_role;
ALTER TABLE public.family_safeguarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read family safeguarding" ON public.family_safeguarding;
CREATE POLICY "Staff read family safeguarding" ON public.family_safeguarding
  FOR SELECT TO authenticated
  USING (public.safeguarding_is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.safeguarding_suitability (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  q1 text NOT NULL,
  q2 text NOT NULL,
  q3 text NOT NULL,
  q4 text NOT NULL,
  q5 text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safeguarding_suitability_q1 CHECK (q1 IN ('yes', 'no', 'unsure')),
  CONSTRAINT safeguarding_suitability_q2 CHECK (q2 IN ('yes', 'no', 'prefer_not')),
  CONSTRAINT safeguarding_suitability_q3 CHECK (q3 IN ('yes', 'no', 'unsure')),
  CONSTRAINT safeguarding_suitability_q4 CHECK (q4 IN ('yes', 'no', 'unsure')),
  CONSTRAINT safeguarding_suitability_q5 CHECK (q5 IN ('yes', 'no', 'prefer_not'))
);
GRANT INSERT, UPDATE ON public.safeguarding_suitability TO authenticated;
GRANT ALL ON public.safeguarding_suitability TO service_role;
ALTER TABLE public.safeguarding_suitability ENABLE ROW LEVEL SECURITY;
-- Parents may write their own row. Nobody except DSL and admin may read any row, including their own.
DROP POLICY IF EXISTS "Users write own suitability" ON public.safeguarding_suitability;
CREATE POLICY "Users write own suitability" ON public.safeguarding_suitability
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.safeguarding_accounts a
      WHERE a.user_id = auth.uid() AND a.safeguarding_enabled
    )
  );
DROP POLICY IF EXISTS "Users update own suitability" ON public.safeguarding_suitability;
CREATE POLICY "Users update own suitability" ON public.safeguarding_suitability
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Staff read suitability" ON public.safeguarding_suitability;
CREATE POLICY "Staff read suitability" ON public.safeguarding_suitability
  FOR SELECT TO authenticated
  USING (public.safeguarding_is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.safeguarding_concerns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('message', 'payment', 'expense', 'general')),
  target_id uuid,
  note text,
  parent_low uuid NOT NULL,
  parent_high uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.safeguarding_concerns TO authenticated;
GRANT ALL ON public.safeguarding_concerns TO service_role;
ALTER TABLE public.safeguarding_concerns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read concerns" ON public.safeguarding_concerns;
CREATE POLICY "Staff read concerns" ON public.safeguarding_concerns
  FOR SELECT TO authenticated
  USING (public.safeguarding_is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.quiet_mode (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.quiet_mode TO authenticated;
GRANT ALL ON public.quiet_mode TO service_role;
ALTER TABLE public.quiet_mode ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own quiet mode" ON public.quiet_mode;
CREATE POLICY "Users manage own quiet mode" ON public.quiet_mode
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.safeguarding_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.safeguarding_audit_log TO authenticated;
GRANT ALL ON public.safeguarding_audit_log TO service_role;
ALTER TABLE public.safeguarding_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read safeguarding audit" ON public.safeguarding_audit_log;
CREATE POLICY "Staff read safeguarding audit" ON public.safeguarding_audit_log
  FOR SELECT TO authenticated
  USING (public.safeguarding_is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.safeguarding_monitor_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_alert_at timestamptz
);
ALTER TABLE public.safeguarding_monitor_state ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.safeguarding_monitor_state TO service_role;

CREATE OR REPLACE FUNCTION public.safeguarding_audit(_action text, _target_type text, _target_id uuid, _metadata jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.safeguarding_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb) - 'body' - 'message' - 'text' - 'note');
END;
$$;
REVOKE ALL ON FUNCTION public.safeguarding_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sg_user_enabled(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.safeguarding_accounts
    WHERE user_id = _user AND safeguarding_enabled
  );
$$;

CREATE OR REPLACE FUNCTION public.sg_family_active(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sg_user_enabled(_user)
      OR public.sg_user_enabled(public.get_coparent_id(_user));
$$;

CREATE OR REPLACE FUNCTION public.sg_pair(_user uuid, OUT parent_low uuid, OUT parent_high uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other uuid;
BEGIN
  other := public.get_coparent_id(_user);
  IF other IS NULL OR other = _user THEN
    parent_low := _user;
    parent_high := _user;
  ELSIF _user < other THEN
    parent_low := _user;
    parent_high := other;
  ELSE
    parent_low := other;
    parent_high := _user;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sg_tools_paused(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_safeguarding f
    JOIN public.sg_pair(_user) p ON f.parent_low = p.parent_low AND f.parent_high = p.parent_high
    WHERE f.paused_at IS NOT NULL
      AND public.sg_family_active(_user)
  );
$$;

CREATE OR REPLACE FUNCTION public.sg_reference()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := 'C8-';
  i integer;
BEGIN
  FOR i IN 1..4 LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_safeguarding_alert(_low uuid, _high uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret text;
BEGIN
  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;
  IF secret IS NULL OR secret = '' THEN
    PERFORM public.safeguarding_audit('alert_skipped', 'family', NULL, jsonb_build_object('reason', 'missing_secret', 'kind', _kind));
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://eycpkzbjylzzynkfggis.supabase.co/functions/v1/safeguarding-alert',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := jsonb_build_object('kind', _kind, 'parent_low', _low, 'parent_high', _high)
  );
EXCEPTION WHEN OTHERS THEN
  PERFORM public.safeguarding_audit('alert_skipped', 'family', NULL, jsonb_build_object('reason', 'dispatch_failed', 'kind', _kind));
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_safeguarding_alert(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sg_pause_family(_low uuid, _high uuid, _alert boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already timestamptz;
BEGIN
  SELECT paused_at INTO already FROM public.family_safeguarding
  WHERE parent_low = _low AND parent_high = _high;
  INSERT INTO public.family_safeguarding (parent_low, parent_high, paused_at)
  VALUES (_low, _high, now())
  ON CONFLICT (parent_low, parent_high)
  DO UPDATE SET paused_at = COALESCE(public.family_safeguarding.paused_at, EXCLUDED.paused_at);
  IF _alert AND already IS NULL THEN
    PERFORM public.dispatch_safeguarding_alert(_low, _high, 'safety_flag');
    PERFORM public.safeguarding_audit('pause', 'family', NULL, jsonb_build_object('kind', 'safety_flag'));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.sg_pause_family(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sg_apply_suitability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pair record;
  pause boolean;
BEGIN
  IF NOT public.sg_user_enabled(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  pause := NEW.q1 = 'no' OR NEW.q2 = 'yes' OR NEW.q3 = 'yes';
  UPDATE public.safeguarding_accounts
  SET money_guidance = money_guidance OR NEW.q5 = 'yes',
      security_check_offered = security_check_offered OR NEW.q4 = 'yes',
      updated_at = now()
  WHERE user_id = NEW.user_id;
  IF pause THEN
    SELECT * INTO pair FROM public.sg_pair(NEW.user_id);
    PERFORM public.sg_pause_family(pair.parent_low, pair.parent_high, true);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS safeguarding_suitability_apply ON public.safeguarding_suitability;
CREATE TRIGGER safeguarding_suitability_apply
  AFTER INSERT OR UPDATE ON public.safeguarding_suitability
  FOR EACH ROW EXECUTE FUNCTION public.sg_apply_suitability();

CREATE OR REPLACE FUNCTION public.sg_family_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  enabled boolean := false;
  due boolean := false;
  quiet boolean := false;
  paused boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object(
      'shared_tools_paused', false,
      'suitability_check_due', false,
      'quiet_mode', false,
      'safeguarding_enabled', false
    );
  END IF;
  enabled := public.sg_user_enabled(uid);
  paused := public.sg_tools_paused(uid);
  due := enabled AND NOT EXISTS (
    SELECT 1 FROM public.safeguarding_suitability WHERE user_id = uid
  );
  quiet := enabled AND EXISTS (
    SELECT 1 FROM public.quiet_mode q WHERE q.user_id = uid AND q.enabled
  );
  RETURN jsonb_build_object(
    'shared_tools_paused', paused,
    'suitability_check_due', due,
    'quiet_mode', quiet,
    'safeguarding_enabled', enabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sg_submit_suitability(p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  q1 text := p_answers->>'q1';
  q2 text := p_answers->>'q2';
  q3 text := p_answers->>'q3';
  q4 text := p_answers->>'q4';
  q5 text := p_answers->>'q5';
BEGIN
  IF uid IS NULL OR NOT public.sg_user_enabled(uid) THEN
    RAISE EXCEPTION 'safeguarding_disabled';
  END IF;
  IF q1 NOT IN ('yes', 'no', 'unsure')
     OR q2 NOT IN ('yes', 'no', 'prefer_not')
     OR q3 NOT IN ('yes', 'no', 'unsure')
     OR q4 NOT IN ('yes', 'no', 'unsure')
     OR q5 NOT IN ('yes', 'no', 'prefer_not') THEN
    RAISE EXCEPTION 'invalid_answers';
  END IF;
  INSERT INTO public.safeguarding_suitability (user_id, q1, q2, q3, q4, q5)
  VALUES (uid, q1, q2, q3, q4, q5)
  ON CONFLICT (user_id) DO UPDATE
  SET q1 = EXCLUDED.q1, q2 = EXCLUDED.q2, q3 = EXCLUDED.q3, q4 = EXCLUDED.q4, q5 = EXCLUDED.q5, updated_at = now();
  RETURN jsonb_build_object('received', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.sg_report_concern(p_kind text, p_target_id uuid DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  pair record;
  ref text;
  seen boolean := false;
  note text;
  created timestamptz := now();
BEGIN
  IF uid IS NULL OR NOT public.sg_user_enabled(uid) THEN
    RAISE EXCEPTION 'safeguarding_disabled';
  END IF;
  IF p_kind NOT IN ('message', 'payment', 'expense', 'general') THEN
    RAISE EXCEPTION 'invalid_kind';
  END IF;
  note := left(btrim(COALESCE(p_note, '')), 2000);
  IF note = '' THEN note := NULL; END IF;
  IF p_kind = 'general' THEN
    p_target_id := NULL;
  ELSIF p_target_id IS NOT NULL THEN
    IF p_kind = 'message' THEN
      seen := EXISTS (SELECT 1 FROM public.messages m WHERE m.id = p_target_id AND (m.sender_id = uid OR m.recipient_id = uid));
    ELSIF p_kind = 'payment' THEN
      seen := EXISTS (SELECT 1 FROM public.payments p WHERE p.id = p_target_id AND (p.payer_id = uid OR p.payee_id = uid));
    ELSIF p_kind = 'expense' THEN
      seen := EXISTS (
        SELECT 1 FROM public.expense_requests e
        WHERE e.id = p_target_id AND (e.user_id = uid OR e.user_id = public.get_coparent_id(uid))
      );
    END IF;
    IF NOT seen THEN p_target_id := NULL; END IF;
  END IF;
  SELECT * INTO pair FROM public.sg_pair(uid);
  LOOP
    ref := public.sg_reference();
    BEGIN
      INSERT INTO public.safeguarding_concerns (reporter_id, reference, kind, target_id, note, parent_low, parent_high, created_at)
      VALUES (uid, ref, p_kind, p_target_id, note, pair.parent_low, pair.parent_high, created);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
  PERFORM public.sg_pause_family(pair.parent_low, pair.parent_high, true);
  PERFORM public.safeguarding_audit('concern', 'concern', NULL, jsonb_build_object('kind', p_kind, 'reference', ref));
  RETURN jsonb_build_object('reference', ref, 'received_at', created);
END;
$$;

CREATE OR REPLACE FUNCTION public.sg_set_quiet_mode(p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  on_flag boolean := COALESCE(p_on, false);
BEGIN
  IF uid IS NULL OR NOT public.sg_user_enabled(uid) THEN
    RETURN jsonb_build_object('quiet_mode', false);
  END IF;
  INSERT INTO public.quiet_mode (user_id, enabled)
  VALUES (uid, on_flag)
  ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();
  RETURN jsonb_build_object('quiet_mode', on_flag);
END;
$$;

CREATE OR REPLACE FUNCTION public.sg_dsl_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.safeguarding_is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'flags', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'parent_low', f.parent_low,
        'parent_high', f.parent_high,
        'paused_at', f.paused_at
      ) ORDER BY f.paused_at DESC NULLS LAST)
      FROM public.family_safeguarding f
      WHERE f.paused_at IS NOT NULL
    ), '[]'::jsonb),
    'concerns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'reference', c.reference,
        'kind', c.kind,
        'note', c.note,
        'parent_low', c.parent_low,
        'parent_high', c.parent_high,
        'created_at', c.created_at
      ) ORDER BY c.created_at DESC)
      FROM public.safeguarding_concerns c
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sg_dsl_set_pause(p_parent_low uuid, p_parent_high uuid, p_paused boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  low uuid;
  high uuid;
BEGIN
  IF NOT public.safeguarding_is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  IF p_parent_low IS NULL OR p_parent_high IS NULL THEN
    RAISE EXCEPTION 'invalid_pair';
  END IF;
  IF p_parent_low <= p_parent_high THEN
    low := p_parent_low; high := p_parent_high;
  ELSE
    low := p_parent_high; high := p_parent_low;
  END IF;
  IF p_paused THEN
    PERFORM public.sg_pause_family(low, high, true);
  ELSE
    UPDATE public.family_safeguarding SET paused_at = NULL
    WHERE parent_low = low AND parent_high = high;
    PERFORM public.safeguarding_audit('lift', 'family', NULL, '{}'::jsonb);
  END IF;
  RETURN jsonb_build_object('ok', true, 'paused', p_paused);
END;
$$;

CREATE OR REPLACE FUNCTION public.sg_admin_set_account(p_user_id uuid, p_safeguarding_enabled boolean, p_is_test_account boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  INSERT INTO public.safeguarding_accounts (user_id, safeguarding_enabled)
  VALUES (p_user_id, COALESCE(p_safeguarding_enabled, false))
  ON CONFLICT (user_id) DO UPDATE
  SET safeguarding_enabled = EXCLUDED.safeguarding_enabled, updated_at = now();
  UPDATE public.profiles SET is_test_account = COALESCE(p_is_test_account, false) WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.sg_user_enabled(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_family_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_pair(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_tools_paused(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_reference() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_family_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_submit_suitability(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_report_concern(text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_set_quiet_mode(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_dsl_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_dsl_set_pause(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sg_admin_set_account(uuid, boolean, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sg_user_enabled(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_family_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_tools_paused(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_family_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_submit_suitability(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_report_concern(text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_set_quiet_mode(boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_dsl_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_dsl_set_pause(uuid, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sg_admin_set_account(uuid, boolean, boolean) TO authenticated, service_role;

-- Pause writes only for a family that has the per-account switch on.
CREATE OR REPLACE FUNCTION public.sg_refuse_paused_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF public.sg_family_active(auth.uid()) AND public.sg_tools_paused(auth.uid()) THEN
    RAISE EXCEPTION 'sg_paused';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sg_a_pause_messages ON public.messages;
CREATE TRIGGER sg_a_pause_messages BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sg_refuse_paused_write();
DROP TRIGGER IF EXISTS sg_a_pause_expenses ON public.expense_requests;
CREATE TRIGGER sg_a_pause_expenses BEFORE INSERT OR UPDATE ON public.expense_requests
  FOR EACH ROW EXECUTE FUNCTION public.sg_refuse_paused_write();
DROP TRIGGER IF EXISTS sg_a_pause_payments ON public.payments;
CREATE TRIGGER sg_a_pause_payments BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sg_refuse_paused_write();
DROP TRIGGER IF EXISTS sg_a_pause_recurring ON public.recurring_payments;
CREATE TRIGGER sg_a_pause_recurring BEFORE INSERT OR UPDATE ON public.recurring_payments
  FOR EACH ROW EXECUTE FUNCTION public.sg_refuse_paused_write();
DROP TRIGGER IF EXISTS sg_a_pause_decisions ON public.decision_threads;
CREATE TRIGGER sg_a_pause_decisions BEFORE INSERT OR UPDATE ON public.decision_threads
  FOR EACH ROW EXECUTE FUNCTION public.sg_refuse_paused_write();
DROP TRIGGER IF EXISTS sg_a_pause_thread_events ON public.thread_events;
CREATE TRIGGER sg_a_pause_thread_events BEFORE INSERT OR UPDATE ON public.thread_events
  FOR EACH ROW EXECUTE FUNCTION public.sg_refuse_paused_write();

-- Message lock is safe for every account: the app only lets the receiver set read_at, and nobody deletes messages.
-- Account deletion runs as service role (auth.uid() is null) and can still remove rows.
CREATE OR REPLACE FUNCTION public.sg_lock_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF auth.uid() IS NULL THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'messages cannot be deleted';
  END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS DISTINCT FROM OLD.recipient_id THEN
      RAISE EXCEPTION 'messages cannot be changed';
    END IF;
    IF (to_jsonb(NEW) - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'read_at') THEN
      RAISE EXCEPTION 'messages cannot be changed';
    END IF;
    IF NEW.read_at IS DISTINCT FROM OLD.read_at AND (OLD.read_at IS NOT NULL OR NEW.read_at IS NULL) THEN
      RAISE EXCEPTION 'read_at can only be set once';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sg_lock_message ON public.messages;
CREATE TRIGGER sg_lock_message
  BEFORE UPDATE OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sg_lock_message();

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pending_first_message_id uuid;

CREATE OR REPLACE VIEW public.messages_caller
WITH (security_invoker = true) AS
SELECT
  m.id,
  m.sender_id,
  m.recipient_id,
  m.body,
  m.created_at,
  m.attachment_path,
  m.attachment_name,
  m.used_suggestion,
  m.pending_first_message_id,
  CASE WHEN m.sender_id = auth.uid() THEN m.original_body ELSE NULL END AS original_body,
  CASE WHEN m.sender_id = auth.uid() THEN m.tone_score ELSE NULL END AS tone_score,
  CASE WHEN m.recipient_id = auth.uid() THEN m.read_at ELSE NULL END AS read_at
FROM public.messages m;
GRANT SELECT ON public.messages_caller TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_notification(_user uuid, _type text, _title text, _message text, _link text, _dedupe text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  IF public.sg_user_enabled(_user) AND EXISTS (
    SELECT 1 FROM public.quiet_mode q WHERE q.user_id = _user AND q.enabled
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications(user_id, type, title, message, link, dedupe_key)
  VALUES (_user, _type, _title, _message, _link, _dedupe)
  ON CONFLICT (dedupe_key) DO NOTHING;
END;
$$;

DROP POLICY IF EXISTS "Co-parent can view bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Co-parent can view bank connections when safeguarding is off" ON public.bank_connections;
CREATE POLICY "Co-parent can view bank connections when safeguarding is off"
ON public.bank_connections FOR SELECT TO authenticated
USING (
  user_id = public.get_coparent_id(auth.uid())
  AND NOT public.sg_family_active(auth.uid())
);

ALTER TABLE public.coparent_bank_accounts
  ADD COLUMN IF NOT EXISTS sort_code_enc bytea,
  ADD COLUMN IF NOT EXISTS account_number_enc bytea;
ALTER TABLE public.bank_connections
  ADD COLUMN IF NOT EXISTS sort_code_enc bytea;

COMMENT ON COLUMN public.coparent_bank_accounts.account_number_enc IS
  'pgp_sym_encrypt copy. Plaintext stays so the published owner screens and payment reminders keep working.';

CREATE OR REPLACE FUNCTION public.encrypt_bank_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
BEGIN
  IF TG_TABLE_NAME = 'coparent_bank_accounts' THEN
    NEW.sort_code_enc := private.encrypt_bank_text(NEW.sort_code);
    NEW.account_number_enc := private.encrypt_bank_text(NEW.account_number);
  ELSIF TG_TABLE_NAME = 'bank_connections' THEN
    NEW.sort_code_enc := private.encrypt_bank_text(NEW.sort_code);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS coparent_bank_accounts_encrypt ON public.coparent_bank_accounts;
CREATE TRIGGER coparent_bank_accounts_encrypt
  BEFORE INSERT OR UPDATE ON public.coparent_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_bank_fields();
DROP TRIGGER IF EXISTS bank_connections_encrypt ON public.bank_connections;
CREATE TRIGGER bank_connections_encrypt
  BEFORE INSERT OR UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_bank_fields();

UPDATE public.coparent_bank_accounts SET sort_code = sort_code WHERE sort_code_enc IS NULL;
UPDATE public.bank_connections SET sort_code = sort_code WHERE sort_code IS NOT NULL AND sort_code_enc IS NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('safeguarding-records', 'safeguarding-records', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users read own safeguarding records" ON storage.objects;
CREATE POLICY "Users read own safeguarding records" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'safeguarding-records' AND (storage.foldername(name))[1] = auth.uid()::text);
