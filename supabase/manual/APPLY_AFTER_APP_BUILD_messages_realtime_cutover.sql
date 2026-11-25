-- APPLY ONLY AFTER the app build that reads public.messages_caller
-- and subscribes to the private topic sg-family:{parent_low}:{parent_high} is live.
-- Do not include this file in supabase db push until Jian confirms that build.
-- Status 18 Nov 2026: applied on the collabor8-uk TEST project only (Jian's test build uses
-- messages_caller and the private channel). Still a manual step for live: run it only after the
-- app and web builds that read messages_caller are released to real parents.
-- supabase db push applies only supabase/migrations. Run this file by hand:
--   supabase db query --linked -f supabase/manual/APPLY_AFTER_APP_BUILD_messages_realtime_cutover.sql

ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;

-- A column-level REVOKE has no effect while the table-level SELECT grant exists,
-- so drop the table grant and grant back only the shared columns.
-- Private fields (original_body, tone_score, used_suggestion, read_at) are read via messages_caller.
REVOKE SELECT ON public.messages FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, sender_id, recipient_id, body, created_at, attachment_path, attachment_name, pending_first_message_id)
  ON public.messages TO authenticated;
