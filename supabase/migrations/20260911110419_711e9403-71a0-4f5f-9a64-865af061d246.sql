CREATE TABLE public.conversation_tool_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_tool_responses TO authenticated;
GRANT ALL ON public.conversation_tool_responses TO service_role;
ALTER TABLE public.conversation_tool_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own conversation tool responses"
  ON public.conversation_tool_responses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_conversation_tool_responses_updated_at
  BEFORE UPDATE ON public.conversation_tool_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();