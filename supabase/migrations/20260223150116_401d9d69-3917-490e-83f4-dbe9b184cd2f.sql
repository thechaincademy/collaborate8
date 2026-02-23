
-- Tighten the invitations update policy: only authenticated users can update
DROP POLICY "Authenticated users can update invitations" ON public.invitations;
CREATE POLICY "Authenticated users can update invitations"
  ON public.invitations FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
