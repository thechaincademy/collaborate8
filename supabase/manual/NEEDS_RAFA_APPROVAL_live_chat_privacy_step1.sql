-- NEEDS RAFA'S APPROVAL BEFORE IT RUNS ON LIVE. Not a migration; supabase db push does not run it.
--
-- Chat privacy fix for EVERY family on the current live database, step 1 of 3.
-- Additive only: it adds a read view, a private realtime channel and a sanitised broadcast.
-- It revokes nothing and removes no policy on public.messages, so today's apps keep working.
-- It is not gated by any safeguarding flag: the privacy fix applies to all families.
--
-- Step order (do not reorder):
--   1. This file (live database).
--   2. A store build (and the web build) that reads public.messages_caller and listens on the
--      private topic sg-family:{low}:{high} reaches parents.
--   3. supabase/manual/APPLY_AFTER_APP_BUILD_messages_realtime_cutover.sql: drops public.messages
--      from the realtime publication and revokes direct reads of the private columns.
--      Running step 3 before step 2 breaks chat in older apps.
--
-- Safe to run more than once. Verified on the collabor8-uk test project (18 Nov 2026).
-- Needs public.message_tone_private and public.get_coparent_id (both exist on live).

-- 1. Caller-scoped read view. Each parent sees only their own private fields:
--    the sender sees their own original text, tone score and whether they used a suggestion;
--    the recipient sees read_at. The other parent gets NULL or false.
CREATE OR REPLACE VIEW public.messages_caller
WITH (security_invoker = false) AS
SELECT
  m.id,
  m.sender_id,
  m.recipient_id,
  m.body,
  m.created_at,
  m.attachment_path,
  m.attachment_name,
  CASE WHEN m.sender_id = auth.uid() THEN COALESCE(t.used_suggestion, m.used_suggestion) ELSE false END AS used_suggestion,
  m.pending_first_message_id,
  CASE WHEN m.sender_id = auth.uid() THEN COALESCE(t.original_body, m.original_body) ELSE NULL END AS original_body,
  CASE WHEN m.sender_id = auth.uid() THEN COALESCE(t.tone_score, m.tone_score) ELSE NULL END AS tone_score,
  CASE WHEN m.recipient_id = auth.uid() THEN m.read_at ELSE NULL END AS read_at
FROM public.messages m
LEFT JOIN public.message_tone_private t ON t.message_id = m.id AND t.sender_id = m.sender_id
WHERE m.sender_id = auth.uid() OR m.recipient_id = auth.uid();
REVOKE ALL ON public.messages_caller FROM PUBLIC, anon;
GRANT SELECT ON public.messages_caller TO authenticated, service_role;

-- 2. The caller's current family topic. Clients cannot pass the pair in.
--    A parent with no co-parent gets their own id twice.
CREATE OR REPLACE FUNCTION public.sg_caller_family_topic()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'sg-family:' || least(me, other) || ':' || greatest(me, other)
  FROM (
    SELECT
      lower(auth.uid()::text) AS me,
      lower(COALESCE(public.get_coparent_id(auth.uid()), auth.uid())::text) AS other
  ) ids
  WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.sg_caller_family_topic() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.sg_caller_family_topic() TO authenticated;

-- 3. Private realtime channel: a parent can receive broadcasts only on their own family topic.
--    SELECT only; with no INSERT policy no client can send a broadcast.
--    Public channels are not affected by RLS on realtime.messages.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'realtime') THEN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'realtime.messages'::regclass) THEN
      BEGIN
        EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'realtime.messages RLS could not be enabled by this role; enable it in the dashboard';
      END;
    END IF;
    EXECUTE 'GRANT SELECT ON realtime.messages TO authenticated';
    EXECUTE 'DROP POLICY IF EXISTS "sg family message broadcast" ON realtime.messages';
    EXECUTE $policy$
      CREATE POLICY "sg family message broadcast"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        realtime.messages.extension = 'broadcast'
        AND realtime.topic() = public.sg_caller_family_topic()
      )
    $policy$;
    IF EXISTS (
      SELECT 1
      FROM pg_policy pol
      JOIN pg_class cls ON cls.oid = pol.polrelid
      JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
      WHERE nsp.nspname = 'realtime' AND cls.relname = 'messages' AND pol.polcmd IN ('a', '*')
    ) THEN
      RAISE EXCEPTION 'realtime.messages has an INSERT policy; clients must not send broadcasts';
    END IF;
  END IF;
END $$;

-- 4. Sanitised broadcast for every new or changed message, to both parents' family topic.
--    The payload carries only shared fields: no original text, tone score, suggestion use or read_at.
CREATE OR REPLACE FUNCTION public.sg_broadcast_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  low uuid;
  high uuid;
  sender uuid;
  recipient uuid;
BEGIN
  sender := COALESCE(NEW.sender_id, OLD.sender_id);
  recipient := COALESCE(NEW.recipient_id, OLD.recipient_id);
  IF sender IS NULL OR recipient IS NULL THEN
    RETURN NULL;
  END IF;
  IF sender <= recipient THEN
    low := sender; high := recipient;
  ELSE
    low := recipient; high := sender;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'realtime' AND p.proname = 'send'
  ) THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'id', COALESCE(NEW.id, OLD.id),
        'sender_id', sender,
        'recipient_id', recipient,
        'body', NEW.body,
        'created_at', NEW.created_at,
        'attachment_path', NEW.attachment_path,
        'attachment_name', NEW.attachment_name,
        'pending_first_message_id', NEW.pending_first_message_id,
        'op', TG_OP
      ),
      'message',
      'sg-family:' || low::text || ':' || high::text,
      true
    );
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sg_broadcast_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sg_broadcast_message ON public.messages;
CREATE TRIGGER sg_broadcast_message
  AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sg_broadcast_message();
