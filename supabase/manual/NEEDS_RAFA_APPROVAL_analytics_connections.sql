-- Collabor8 admin analytics connections (Buffer and Clarity tokens pasted on /admin/setup).
-- NOT APPLIED. Needs Rafa's own yes before it runs on any project.
-- Rollback: NEEDS_RAFA_APPROVAL_analytics_connections_ROLLBACK.sql
--
-- The token itself is kept encrypted in Supabase Vault. This table only holds which
-- providers are connected, a short account label, when and by whom. Only the server
-- (service role) can read or change any of it. Browsers never get the token back.
-- Google keeps using the existing google_oauth_tokens table (no change here).

CREATE TABLE IF NOT EXISTS public.analytics_connections (
  provider text PRIMARY KEY CHECK (provider IN ('buffer', 'clarity')),
  vault_secret_id uuid NOT NULL,
  account_label text CHECK (account_label IS NULL OR length(account_label) <= 120),
  connected_at timestamptz NOT NULL DEFAULT now(),
  connected_by uuid
);
ALTER TABLE public.analytics_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_connections FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.analytics_connections TO service_role;

-- Save or replace a provider token (server only).
CREATE OR REPLACE FUNCTION public.analytics_connection_save(_provider text, _token text, _label text, _by uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  sid uuid;
  sname text := 'c8_analytics_' || _provider;
BEGIN
  IF _provider NOT IN ('buffer', 'clarity') THEN RAISE EXCEPTION 'unknown provider'; END IF;
  IF _token IS NULL OR length(_token) < 10 OR length(_token) > 4000 THEN RAISE EXCEPTION 'bad token'; END IF;
  SELECT vault_secret_id INTO sid FROM public.analytics_connections WHERE provider = _provider;
  IF sid IS NOT NULL AND EXISTS (SELECT 1 FROM vault.secrets WHERE id = sid) THEN
    PERFORM vault.update_secret(sid, _token);
  ELSE
    DELETE FROM vault.secrets WHERE name = sname;
    sid := vault.create_secret(_token, sname, 'Collabor8 analytics token (' || _provider || ')');
  END IF;
  INSERT INTO public.analytics_connections (provider, vault_secret_id, account_label, connected_at, connected_by)
  VALUES (_provider, sid, left(_label, 120), now(), _by)
  ON CONFLICT (provider) DO UPDATE
    SET vault_secret_id = EXCLUDED.vault_secret_id, account_label = EXCLUDED.account_label,
        connected_at = EXCLUDED.connected_at, connected_by = EXCLUDED.connected_by;
END;
$$;

-- Read a provider token (server only, for admin-analytics).
CREATE OR REPLACE FUNCTION public.analytics_connection_token(_provider text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
  SELECT d.decrypted_secret
  FROM public.analytics_connections c
  JOIN vault.decrypted_secrets d ON d.id = c.vault_secret_id
  WHERE c.provider = _provider
$$;

-- Disconnect: remove the token and the row (server only).
CREATE OR REPLACE FUNCTION public.analytics_connection_remove(_provider text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE sid uuid;
BEGIN
  SELECT vault_secret_id INTO sid FROM public.analytics_connections WHERE provider = _provider;
  DELETE FROM public.analytics_connections WHERE provider = _provider;
  IF sid IS NOT NULL THEN DELETE FROM vault.secrets WHERE id = sid; END IF;
END;
$$;

-- Which providers are connected. No token values.
CREATE OR REPLACE FUNCTION public.analytics_connection_status()
RETURNS TABLE (provider text, account_label text, connected_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT provider, account_label, connected_at FROM public.analytics_connections ORDER BY provider
$$;

REVOKE ALL ON FUNCTION public.analytics_connection_save(text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_connection_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_connection_remove(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_connection_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_connection_save(text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_connection_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_connection_remove(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_connection_status() TO service_role;
