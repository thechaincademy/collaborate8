-- Safeguarding role separation and helper privileges (fixes from the London test run).
-- 1. Safeguarding-lead data needs the dsl role only. A plain admin (is_admin allowlist
--    or app_role 'admin') no longer qualifies: suitability answers, concern notes,
--    family pause flags, money guidance and security check flags, the safeguarding
--    audit log, role assignments, sg_dsl_overview and sg_dsl_set_pause.
-- 2. sg_global_enabled is no longer callable by parents. RLS policies that needed it
--    now call caller-scoped SECURITY DEFINER helpers that only answer about the caller.

CREATE OR REPLACE FUNCTION public.sg_is_dsl(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND public.has_role(_user_id, 'dsl');
$$;
REVOKE ALL ON FUNCTION public.sg_is_dsl(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sg_is_dsl(uuid) TO authenticated, service_role;

-- Every safeguarding policy and the sg_dsl_* RPCs call this helper.
CREATE OR REPLACE FUNCTION public.safeguarding_is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sg_is_dsl(_user_id);
$$;
REVOKE ALL ON FUNCTION public.safeguarding_is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.safeguarding_is_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Staff read family safeguarding" ON public.family_safeguarding;
DROP POLICY IF EXISTS "DSL reads family safeguarding" ON public.family_safeguarding;
CREATE POLICY "DSL reads family safeguarding" ON public.family_safeguarding
  FOR SELECT TO authenticated USING (public.sg_is_dsl(auth.uid()));

DROP POLICY IF EXISTS "Staff read suitability" ON public.safeguarding_suitability;
DROP POLICY IF EXISTS "DSL reads suitability" ON public.safeguarding_suitability;
CREATE POLICY "DSL reads suitability" ON public.safeguarding_suitability
  FOR SELECT TO authenticated USING (public.sg_is_dsl(auth.uid()));

DROP POLICY IF EXISTS "Staff read concerns" ON public.safeguarding_concerns;
DROP POLICY IF EXISTS "DSL reads concerns" ON public.safeguarding_concerns;
CREATE POLICY "DSL reads concerns" ON public.safeguarding_concerns
  FOR SELECT TO authenticated USING (public.sg_is_dsl(auth.uid()));

DROP POLICY IF EXISTS "Staff read safeguarding audit" ON public.safeguarding_audit_log;
DROP POLICY IF EXISTS "DSL reads safeguarding audit" ON public.safeguarding_audit_log;
CREATE POLICY "DSL reads safeguarding audit" ON public.safeguarding_audit_log
  FOR SELECT TO authenticated USING (public.sg_is_dsl(auth.uid()));

DROP POLICY IF EXISTS "Users read own safeguarding account" ON public.safeguarding_accounts;
CREATE POLICY "Users read own safeguarding account" ON public.safeguarding_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.sg_is_dsl(auth.uid()));

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.sg_is_dsl(auth.uid()));

-- Caller-scoped helpers for RLS (replace direct sg_global_enabled() calls).
CREATE OR REPLACE FUNCTION public.sg_caller_may_submit_suitability()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.sg_global_enabled()
     AND EXISTS (SELECT 1 FROM public.safeguarding_accounts a
                 WHERE a.user_id = auth.uid() AND a.safeguarding_enabled);
$$;
REVOKE ALL ON FUNCTION public.sg_caller_may_submit_suitability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sg_caller_may_submit_suitability() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sg_caller_sees_coparent_bank()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND NOT (
    public.sg_global_enabled()
    AND EXISTS (
      SELECT 1 FROM public.safeguarding_accounts a
      WHERE a.safeguarding_enabled
        AND a.user_id IN (auth.uid(), public.get_coparent_id(auth.uid()))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.sg_caller_sees_coparent_bank() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sg_caller_sees_coparent_bank() TO authenticated, service_role;

DROP POLICY IF EXISTS "Users write own suitability" ON public.safeguarding_suitability;
CREATE POLICY "Users write own suitability" ON public.safeguarding_suitability
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.sg_caller_may_submit_suitability());

DROP POLICY IF EXISTS "Co-parent can view bank connections when safeguarding is off" ON public.bank_connections;
CREATE POLICY "Co-parent can view bank connections when safeguarding is off"
  ON public.bank_connections FOR SELECT TO authenticated
  USING (user_id = public.get_coparent_id(auth.uid()) AND public.sg_caller_sees_coparent_bank());

REVOKE ALL ON FUNCTION public.sg_global_enabled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sg_global_enabled() TO service_role;

-- messages_caller: live moves the sender's tone data to message_tone_private on insert
-- (trigger zz_messages_move_tone_private), so read the sender's own values from there.
-- used_suggestion is the sender's private data too, so the other parent sees false.
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
GRANT SELECT ON public.messages_caller TO authenticated, service_role;

-- Sanitised broadcast (same as the live step 1 file): no suggestion use in the payload either.
-- for every new or changed message, to both parents' family topic.
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
