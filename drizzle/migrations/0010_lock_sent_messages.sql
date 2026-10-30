CREATE OR REPLACE FUNCTION public.lock_sent_message_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'read_at') THEN
    RAISE EXCEPTION 'Sent messages cannot be changed';
  END IF;
  IF NEW.read_at IS DISTINCT FROM OLD.read_at AND (OLD.read_at IS NOT NULL OR NEW.read_at IS NULL) THEN
    RAISE EXCEPTION 'read_at can only be set once';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER messages_lock_sent_columns
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.lock_sent_message_columns();