CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notification preferences" ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Distinguish "needs acknowledgement" requests
CREATE OR REPLACE FUNCTION public.apply_thread_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.decision_threads; other uuid; ttl text; msg text; typ text;
BEGIN
  SELECT * INTO t FROM public.decision_threads WHERE id = NEW.thread_id;
  other := CASE WHEN NEW.actor_id = t.creator_id THEN t.coparent_id ELSE t.creator_id END;
  typ := 'thread_' || NEW.kind;
  IF NEW.kind = 'confirm' THEN
    UPDATE decision_threads SET status='confirmed', final_outcome=coalesce(current_proposal, original_request), next_action=NULL, updated_at=now() WHERE id=t.id;
    ttl := 'Agreement confirmed';
  ELSIF NEW.kind = 'propose' THEN
    UPDATE decision_threads SET status='proposed', current_proposal=NEW.body, final_outcome=NULL, next_action='Reply to the proposed change', updated_at=now() WHERE id=t.id;
    ttl := 'Change proposed';
  ELSIF NEW.kind = 'info' THEN
    UPDATE decision_threads SET status='awaiting', next_action='Share more information', updated_at=now() WHERE id=t.id;
    ttl := 'More information requested';
  ELSIF NEW.kind = 'decline' THEN
    UPDATE decision_threads SET status='open', next_action='Suggest another option', updated_at=now() WHERE id=t.id;
    ttl := 'Request declined';
  ELSIF NEW.kind = 'ack' THEN
    UPDATE decision_threads SET acknowledged_at=coalesce(acknowledged_at, now()), updated_at=now() WHERE id=t.id;
    ttl := 'Message acknowledged';
  ELSIF NEW.kind = 'resolve' THEN
    UPDATE decision_threads SET status='resolved', resolved_at=now(), next_action=NULL, updated_at=now() WHERE id=t.id;
    ttl := 'Thread resolved';
  ELSIF NEW.kind = 'reopen' THEN
    UPDATE decision_threads SET status='open', resolved_at=NULL, updated_at=now() WHERE id=t.id;
    ttl := 'Thread reopened';
  ELSIF NEW.kind IN ('message','attach') THEN
    UPDATE decision_threads SET status = CASE WHEN status IN ('open','awaiting') THEN 'awaiting' ELSE status END, updated_at=now() WHERE id=t.id;
    ttl := 'New message';
  ELSIF NEW.kind = 'created' THEN
    IF t.require_ack THEN typ := 'thread_ack_required'; ttl := 'Needs your acknowledgement';
    ELSE ttl := 'New decision request'; END IF;
  END IF;
  IF ttl IS NOT NULL THEN
    msg := t.title || coalesce(': ' || left(NEW.body, 120), '');
    PERFORM public.create_notification(other, typ, ttl, msg, '/dashboard?tab=chat&thread=' || t.id, 'thread_ev_' || NEW.id);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_thread_event() FROM PUBLIC, anon, authenticated;

-- Deadline + exchange reminders, run hourly
CREATE OR REPLACE FUNCTION public.create_thread_deadline_notifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; u uuid;
BEGIN
  FOR r IN SELECT * FROM decision_threads WHERE deadline IS NOT NULL AND status NOT IN ('confirmed','resolved') LOOP
    FOREACH u IN ARRAY ARRAY[r.creator_id, r.coparent_id] LOOP
      IF r.deadline < now() THEN
        PERFORM create_notification(u, 'thread_deadline_missed', 'Reply-by time passed',
          r.title || ' - no agreement was reached by ' || to_char(r.deadline AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI') || '.',
          '/dashboard?tab=chat&thread=' || r.id, 'dl_missed_' || r.id || '_' || u);
      ELSIF r.deadline < now() + interval '24 hours' THEN
        PERFORM create_notification(u, 'thread_deadline_soon', 'Reply-by time coming up',
          r.title || ' - reply by ' || to_char(r.deadline AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI') || '.',
          '/dashboard?tab=chat&thread=' || r.id, 'dl_soon_' || r.id || '_' || u || '_' || r.deadline);
      END IF;
      n := n + 1;
    END LOOP;
  END LOOP;
  FOR r IN SELECT * FROM decision_threads WHERE category = 'schedule' AND deadline BETWEEN now() AND now() + interval '24 hours' AND status = 'confirmed' LOOP
    FOREACH u IN ARRAY ARRAY[r.creator_id, r.coparent_id] LOOP
      PERFORM create_notification(u, 'calendar_reminder', 'Coming up tomorrow',
        r.title || ' - ' || to_char(r.deadline AT TIME ZONE 'Europe/London', 'Dy DD Mon HH24:MI') || '.',
        '/dashboard?tab=chat&thread=' || r.id, 'cal_' || r.id || '_' || u || '_' || r.deadline);
    END LOOP;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_thread_deadline_notifications() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('thread-deadline-reminders', '5 * * * *', $cron$ SELECT public.create_thread_deadline_notifications(); $cron$);