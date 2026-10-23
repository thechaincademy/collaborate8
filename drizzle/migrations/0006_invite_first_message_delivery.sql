ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pending_first_message_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS messages_pending_first_message_id_unique
  ON public.messages (pending_first_message_id) WHERE pending_first_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_pending_first_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.pending_first_messages;
BEGIN
  IF NEW.pending_first_message_id IS NOT NULL THEN
    SELECT * INTO p FROM public.pending_first_messages
      WHERE id = NEW.pending_first_message_id FOR UPDATE;
    IF NOT FOUND OR p.sender_id <> NEW.sender_id THEN
      RAISE EXCEPTION 'Invalid pending message';
    END IF;
  ELSE
    SELECT * INTO p FROM public.pending_first_messages
      WHERE sender_id = NEW.sender_id AND body = NEW.body AND created_at = NEW.created_at
      ORDER BY created_at LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RETURN NEW; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles a JOIN public.profiles b ON b.id = a.coparent_id
    WHERE a.id = p.sender_id AND b.id = NEW.recipient_id AND b.coparent_id = a.id) THEN
    RAISE EXCEPTION 'Co-parent link is not complete';
  END IF;
  IF p.delivered_at IS NOT NULL THEN RETURN NULL; END IF;
  NEW.pending_first_message_id := p.id;
  NEW.created_at := p.created_at;
  NEW.body := p.body;
  UPDATE public.pending_first_messages SET delivered_at = now() WHERE id = p.id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.claim_pending_first_message() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS claim_pending_first_message ON public.messages;
CREATE TRIGGER claim_pending_first_message BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.claim_pending_first_message();

CREATE OR REPLACE FUNCTION public.deliver_pending_messages_on_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.pending_first_messages;
BEGIN
  IF NEW.coparent_id IS NULL OR NEW.coparent_id IS NOT DISTINCT FROM OLD.coparent_id THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.coparent_id AND coparent_id = NEW.id) THEN RETURN NEW; END IF;
  FOR p IN SELECT * FROM public.pending_first_messages
    WHERE sender_id IN (NEW.id, NEW.coparent_id) AND delivered_at IS NULL
    ORDER BY id FOR UPDATE
  LOOP
    INSERT INTO public.messages(sender_id, recipient_id, body, created_at, pending_first_message_id)
      VALUES(p.sender_id, CASE WHEN p.sender_id = NEW.id THEN NEW.coparent_id ELSE NEW.id END,
        p.body, p.created_at, p.id)
      ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.deliver_pending_messages_on_link() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS deliver_pending_messages_on_link ON public.profiles;
CREATE TRIGGER deliver_pending_messages_on_link AFTER UPDATE OF coparent_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.deliver_pending_messages_on_link();