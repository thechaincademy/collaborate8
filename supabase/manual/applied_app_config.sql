-- Collabor8 admin-editable platform settings (everything on /admin/setup).
-- Applied to London (byrwtxdalhsmvktuzoya) on 18 November 2026 with Rafa's yes.
-- Rollback: applied_app_config_ROLLBACK.sql
--
-- Lets an admin set, change or remove a setting from the admin Setup page instead of in
-- Supabase. Secret values (API keys, private keys, service account files) are stored
-- encrypted in Supabase Vault. Plain settings (alert emails, sender address, region,
-- app ids) are stored as normal text. Only the server (service role) can read or change
-- any of it; browsers never get a secret back. A value set here takes priority over the
-- matching Supabase secret; removing it falls back to that secret again.
-- Which names can be set, and their format, is checked by the admin-config edge function.

CREATE TABLE IF NOT EXISTS public.app_config (
  name text PRIMARY KEY CHECK (name ~ '^[A-Z][A-Z0-9_]{1,63}$' AND name !~ '^SUPABASE_'),
  is_secret boolean NOT NULL,
  plain_value text CHECK (plain_value IS NULL OR length(plain_value) <= 2000),
  vault_secret_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CHECK ((is_secret AND vault_secret_id IS NOT NULL AND plain_value IS NULL)
      OR (NOT is_secret AND plain_value IS NOT NULL AND vault_secret_id IS NULL))
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_config TO service_role;

-- Set or change one setting (server only).
CREATE OR REPLACE FUNCTION public.app_config_set(_name text, _value text, _is_secret boolean, _by uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  old_sid uuid;
  sid uuid;
  sname text := 'c8_config_' || lower(_name);
BEGIN
  IF _value IS NULL OR length(_value) = 0 OR length(_value) > 20000 THEN RAISE EXCEPTION 'bad value'; END IF;
  IF NOT _is_secret AND length(_value) > 2000 THEN RAISE EXCEPTION 'bad value'; END IF;
  SELECT vault_secret_id INTO old_sid FROM public.app_config WHERE name = _name;
  IF _is_secret THEN
    IF old_sid IS NOT NULL AND EXISTS (SELECT 1 FROM vault.secrets WHERE id = old_sid) THEN
      PERFORM vault.update_secret(old_sid, _value);
      sid := old_sid;
    ELSE
      DELETE FROM vault.secrets WHERE name = sname;
      sid := vault.create_secret(_value, sname, 'Collabor8 setting ' || _name);
    END IF;
    INSERT INTO public.app_config (name, is_secret, plain_value, vault_secret_id, updated_at, updated_by)
    VALUES (_name, true, NULL, sid, now(), _by)
    ON CONFLICT (name) DO UPDATE SET is_secret = true, plain_value = NULL, vault_secret_id = EXCLUDED.vault_secret_id,
      updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
  ELSE
    INSERT INTO public.app_config (name, is_secret, plain_value, vault_secret_id, updated_at, updated_by)
    VALUES (_name, false, _value, NULL, now(), _by)
    ON CONFLICT (name) DO UPDATE SET is_secret = false, plain_value = EXCLUDED.plain_value, vault_secret_id = NULL,
      updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
    IF old_sid IS NOT NULL THEN DELETE FROM vault.secrets WHERE id = old_sid; END IF;
  END IF;
END;
$$;

-- Remove one setting, so the Supabase secret (if any) is used again (server only).
CREATE OR REPLACE FUNCTION public.app_config_remove(_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE sid uuid;
BEGIN
  SELECT vault_secret_id INTO sid FROM public.app_config WHERE name = _name;
  DELETE FROM public.app_config WHERE name = _name;
  IF sid IS NOT NULL THEN DELETE FROM vault.secrets WHERE id = sid; END IF;
END;
$$;

-- All values, for edge functions to read their settings (server only).
CREATE OR REPLACE FUNCTION public.app_config_values()
RETURNS TABLE (name text, value text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
  SELECT c.name, CASE WHEN c.is_secret THEN d.decrypted_secret ELSE c.plain_value END
  FROM public.app_config c
  LEFT JOIN vault.decrypted_secrets d ON d.id = c.vault_secret_id
$$;

-- What is set, by whom and when. Secret values are never included.
CREATE OR REPLACE FUNCTION public.app_config_status()
RETURNS TABLE (name text, is_secret boolean, plain_value text, updated_at timestamptz, updated_by_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT c.name, c.is_secret, CASE WHEN c.is_secret THEN NULL ELSE c.plain_value END, c.updated_at, u.email::text
  FROM public.app_config c
  LEFT JOIN auth.users u ON u.id = c.updated_by
  ORDER BY c.name
$$;

REVOKE ALL ON FUNCTION public.app_config_set(text, text, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_config_remove(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_config_values() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_config_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_config_set(text, text, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.app_config_remove(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.app_config_values() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_config_status() TO service_role;
