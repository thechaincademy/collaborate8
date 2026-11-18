-- APPLY ONLY AFTER the app build that reads public.messages_caller
-- and subscribes to the private topic sg-family:{parent_low}:{parent_high} is live.
-- Do not include this file in supabase db push until Jian confirms that build.
-- supabase db push applies only supabase/migrations. Run this file by hand:
--   supabase db query --linked -f supabase/manual/APPLY_AFTER_APP_BUILD_messages_realtime_cutover.sql

ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;

REVOKE SELECT (read_at, original_body, tone_score) ON public.messages FROM PUBLIC, anon, authenticated;
