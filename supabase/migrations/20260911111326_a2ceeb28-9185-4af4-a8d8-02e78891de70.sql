ALTER TABLE public.conversation_tool_responses
  ADD COLUMN IF NOT EXISTS summary_sent_at timestamptz;