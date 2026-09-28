CREATE TABLE public.decision_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  coparent_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'normal',
  deadline timestamptz,
  children text[] NOT NULL DEFAULT '{}',
  require_ack boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'awaiting',
  original_request text NOT NULL,
  current_proposal text,
  final_outcome text,
  next_action text,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.decision_threads TO authenticated;
GRANT ALL ON public.decision_threads TO service_role;
ALTER TABLE public.decision_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view threads" ON public.decision_threads FOR SELECT TO authenticated
  USING (auth.uid() IN (creator_id, coparent_id));
CREATE POLICY "Parents create threads with linked coparent" ON public.decision_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id AND coparent_id = public.get_coparent_id(auth.uid()));

CREATE TABLE public.thread_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.decision_threads(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  kind text NOT NULL,
  body text,
  expense_id uuid,
  attachment_path text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX thread_events_thread_idx ON public.thread_events(thread_id, created_at);
GRANT SELECT, INSERT ON public.thread_events TO authenticated;
GRANT ALL ON public.thread_events TO service_role;
ALTER TABLE public.thread_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view events" ON public.thread_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decision_threads t WHERE t.id = thread_id AND auth.uid() IN (t.creator_id, t.coparent_id)));
CREATE POLICY "Participants add events" ON public.thread_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid()
    AND kind IN ('created','message','viewed','confirm','propose','info','decline','ack','resolve','reopen','attach')
    AND EXISTS (SELECT 1 FROM public.decision_threads t WHERE t.id = thread_id AND auth.uid() IN (t.creator_id, t.coparent_id)));

CREATE OR REPLACE FUNCTION public.apply_thread_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.decision_threads; other uuid; ttl text; msg text;
BEGIN
  SELECT * INTO t FROM public.decision_threads WHERE id = NEW.thread_id;
  other := CASE WHEN NEW.actor_id = t.creator_id THEN t.coparent_id ELSE t.creator_id END;
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
    ttl := CASE WHEN t.require_ack THEN 'Needs your acknowledgement' ELSE 'New decision request' END;
  END IF;
  IF ttl IS NOT NULL THEN
    msg := t.title || coalesce(': ' || left(NEW.body, 120), '');
    PERFORM public.create_notification(other, 'thread_' || NEW.kind, ttl, msg, '/dashboard?tab=chat&thread=' || t.id, 'thread_ev_' || NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER thread_events_apply AFTER INSERT ON public.thread_events FOR EACH ROW EXECUTE FUNCTION public.apply_thread_event();

ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_threads;