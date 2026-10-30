CREATE TABLE public.message_tone_private (
  message_id uuid PRIMARY KEY REFERENCES public.messages(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  sender_id uuid NOT NULL,
  original_body text,
  tone_score numeric,
  used_suggestion boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.message_tone_private TO authenticated;
GRANT ALL ON public.message_tone_private TO service_role;
ALTER TABLE public.message_tone_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Senders can read their own tone data" ON public.message_tone_private
  FOR SELECT TO authenticated USING (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.move_message_tone_private()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.sender_id IS NOT NULL AND (NEW.original_body IS NOT NULL OR NEW.tone_score IS NOT NULL OR NEW.used_suggestion IS TRUE) THEN
    INSERT INTO public.message_tone_private(message_id, sender_id, original_body, tone_score, used_suggestion)
    VALUES (NEW.id, NEW.sender_id, NEW.original_body, NEW.tone_score, NEW.used_suggestion)
    ON CONFLICT (message_id) DO NOTHING;
  END IF;
  NEW.original_body := NULL;
  NEW.tone_score := NULL;
  NEW.used_suggestion := false;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.move_message_tone_private() FROM PUBLIC, anon, authenticated;

-- named zz_ so it runs after claim_pending_first_message (which may skip the row)
CREATE TRIGGER zz_messages_move_tone_private
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.move_message_tone_private();

INSERT INTO public.message_tone_private(message_id, sender_id, original_body, tone_score, used_suggestion, created_at)
SELECT id, sender_id, original_body, tone_score, used_suggestion, created_at FROM public.messages
WHERE sender_id IS NOT NULL AND (original_body IS NOT NULL OR tone_score IS NOT NULL OR used_suggestion)
ON CONFLICT (message_id) DO NOTHING;

ALTER TABLE public.messages DISABLE TRIGGER messages_lock_sent_columns;
UPDATE public.messages SET original_body = NULL, tone_score = NULL, used_suggestion = false
WHERE original_body IS NOT NULL OR tone_score IS NOT NULL OR used_suggestion;
ALTER TABLE public.messages ENABLE TRIGGER messages_lock_sent_columns;

COMMENT ON COLUMN public.messages.original_body IS 'DEPRECATED: moved to message_tone_private, always null';
COMMENT ON COLUMN public.messages.tone_score IS 'DEPRECATED: moved to message_tone_private, always null';
COMMENT ON COLUMN public.messages.used_suggestion IS 'DEPRECATED: moved to message_tone_private, always false';