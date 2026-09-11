CREATE TABLE public.pending_first_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body TEXT NOT NULL,
  recipient_email TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_first_messages TO authenticated;
GRANT ALL ON public.pending_first_messages TO service_role;
ALTER TABLE public.pending_first_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own pending message" ON public.pending_first_messages FOR ALL TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
CREATE INDEX idx_pending_first_messages_sender ON public.pending_first_messages(sender_id);