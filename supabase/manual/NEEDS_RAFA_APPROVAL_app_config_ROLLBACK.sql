-- Undo NEEDS_RAFA_APPROVAL_app_config.sql. Also deletes every setting saved from the admin;
-- functions then use the Supabase secrets only.
DO $$
BEGIN
  IF to_regclass('public.app_config') IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id IN (SELECT vault_secret_id FROM public.app_config WHERE vault_secret_id IS NOT NULL);
  END IF;
END $$;
DELETE FROM vault.secrets WHERE name LIKE 'c8\_config\_%';
DROP FUNCTION IF EXISTS public.app_config_status();
DROP FUNCTION IF EXISTS public.app_config_values();
DROP FUNCTION IF EXISTS public.app_config_remove(text);
DROP FUNCTION IF EXISTS public.app_config_set(text, text, boolean, uuid);
DROP TABLE IF EXISTS public.app_config;
