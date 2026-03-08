
-- Fix the overly permissive bank_connections policy by splitting into specific operations
DROP POLICY IF EXISTS "Users can manage own bank connections" ON public.bank_connections;

CREATE POLICY "Users can select own bank connections" ON public.bank_connections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank connections" ON public.bank_connections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank connections" ON public.bank_connections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank connections" ON public.bank_connections
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
