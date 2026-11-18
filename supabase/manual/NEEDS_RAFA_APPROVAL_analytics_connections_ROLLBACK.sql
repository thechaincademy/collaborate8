-- Undo NEEDS_RAFA_APPROVAL_analytics_connections.sql (also deletes any saved Buffer and Clarity tokens).
DELETE FROM vault.secrets WHERE id IN (SELECT vault_secret_id FROM public.analytics_connections);
DELETE FROM vault.secrets WHERE name IN ('c8_analytics_buffer', 'c8_analytics_clarity');
DROP FUNCTION IF EXISTS public.analytics_connection_status();
DROP FUNCTION IF EXISTS public.analytics_connection_remove(text);
DROP FUNCTION IF EXISTS public.analytics_connection_token(text);
DROP FUNCTION IF EXISTS public.analytics_connection_save(text, text, text, uuid);
DROP TABLE IF EXISTS public.analytics_connections;
