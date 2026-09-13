CREATE TABLE public.conversation_tool_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'payment',
  promo_code TEXT,
  provider_session_id TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'gbp',
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.conversation_tool_access TO authenticated;
GRANT ALL ON public.conversation_tool_access TO service_role;

ALTER TABLE public.conversation_tool_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation tool access"
ON public.conversation_tool_access FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all conversation tool access"
ON public.conversation_tool_access FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));