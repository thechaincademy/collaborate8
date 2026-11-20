-- Collabor8 safeguarding, server side: the switch and role-based alert routing.
-- Additive and idempotent. Safe to run more than once and on a throwaway copy.
-- Grants no roles and sends nothing. Who holds the dsl role is set separately
-- (see supabase/manual/safeguarding_lead_roles.sql, not a migration).
--
-- 1. Switch. app_settings.safeguarding_enabled is the one server-side switch.
--    It is created as 'false' when missing. An existing value is left as it is,
--    so running this file never turns the switch on or off by itself.
-- 2. Alerts. Report-a-concern and safety-flag alerts go to every user who holds
--    the dsl (safeguarding lead) role. There are no hardcoded email addresses.
--    While the switch is off, nothing is dispatched and nothing is sent.
-- 3. Alerts carry only the kind and a pointer to the review page. The request
--    body sent to the edge function has no message text, notes, bank details or
--    phone numbers, only the two family ids and a one-off event id.

-- 1. Switch (default off).
INSERT INTO public.app_settings (key, value)
VALUES ('safeguarding_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sg_global_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_settings
    WHERE key = 'safeguarding_enabled' AND value = 'true'
  );
$$;
REVOKE ALL ON FUNCTION public.sg_global_enabled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sg_global_enabled() TO service_role;

-- 2. Recipients: every holder of the dsl role. Server only.
-- Returns the sign-in email of each lead. The edge function decides which of
-- these are QA test leads (their alerts go to the QA inbox, marked [TEST]).
CREATE OR REPLACE FUNCTION public.sg_alert_recipients()
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT r.user_id, lower(u.email)::text
  FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.role = 'dsl'
    AND u.email IS NOT NULL
    AND u.email <> ''
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until < now());
$$;
REVOKE ALL ON FUNCTION public.sg_alert_recipients() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sg_alert_recipients() TO service_role;

-- Dispatch: checks the switch first, reads the project URL from server config
-- (no hardcoded project), and sends only ids and the kind.
CREATE OR REPLACE FUNCTION public.dispatch_safeguarding_alert(_low uuid, _high uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret text;
  base text;
BEGIN
  IF NOT public.sg_global_enabled() THEN
    PERFORM public.safeguarding_audit('alert_skipped', 'family', NULL, jsonb_build_object('reason', 'switch_off', 'kind', _kind));
    RETURN;
  END IF;
  IF _kind NOT IN ('concern', 'safety_flag') THEN
    PERFORM public.safeguarding_audit('alert_skipped', 'family', NULL, jsonb_build_object('reason', 'invalid_kind'));
    RETURN;
  END IF;
  IF to_regclass('public.sg_runtime_config') IS NOT NULL THEN
    EXECUTE 'SELECT value FROM public.sg_runtime_config WHERE key = $1' INTO base USING 'project_url';
  END IF;
  base := rtrim(COALESCE(base, ''), '/');
  IF base = '' THEN
    PERFORM public.safeguarding_audit('alert_skipped', 'family', NULL, jsonb_build_object('reason', 'missing_project_url', 'kind', _kind));
    RETURN;
  END IF;
  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;
  IF secret IS NULL OR secret = '' THEN
    PERFORM public.safeguarding_audit('alert_skipped', 'family', NULL, jsonb_build_object('reason', 'missing_secret', 'kind', _kind));
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := base || '/functions/v1/safeguarding-alert',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := jsonb_build_object(
      'kind', _kind,
      'parent_low', _low,
      'parent_high', _high,
      'event_id', gen_random_uuid()
    )
  );
  PERFORM public.safeguarding_audit('alert_dispatched', 'family', NULL, jsonb_build_object('kind', _kind));
EXCEPTION WHEN OTHERS THEN
  PERFORM public.safeguarding_audit('alert_skipped', 'family', NULL, jsonb_build_object('reason', 'dispatch_failed', 'kind', _kind));
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_safeguarding_alert(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_safeguarding_alert(uuid, uuid, text) TO service_role;
