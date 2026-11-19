-- Rollback for NEEDS_RAFA_APPROVAL_access_requests.sql (London only).
-- FIRST switch the hook off, or every new sign-up will fail once the function is gone:
--   curl -X PATCH "https://api.supabase.com/v1/projects/byrwtxdalhsmvktuzoya/config/auth" \
--     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "User-Agent: curl/8.5.0" \
--     -H "Content-Type: application/json" -d '{"hook_before_user_created_enabled": false}'
-- Then run this. It deletes every stored request.
BEGIN;
DROP FUNCTION IF EXISTS public.c8_before_user_created(jsonb);
DROP FUNCTION IF EXISTS public.access_request_submit(text, text, text, text);
DROP TABLE IF EXISTS public.access_requests;
COMMIT;
