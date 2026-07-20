-- Drop permissive public policies on invitations
DROP POLICY IF EXISTS "Anyone can read invitation by code" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can update invitations" ON public.invitations;

-- Replace existing policies with stricter versions
DROP POLICY IF EXISTS "Users can read own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can update own invitations" ON public.invitations;

CREATE POLICY "Users can read own invitations" ON public.invitations
  FOR SELECT TO public
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can update own invitations" ON public.invitations
  FOR UPDATE TO public
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

-- Security definer lookup for anonymous invite code verification during signup
CREATE OR REPLACE FUNCTION public.get_invitation_by_code(_invite_code text)
RETURNS TABLE(id uuid, inviter_id uuid, status text, invitee_email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, inviter_id, status, invitee_email
  FROM public.invitations
  WHERE invite_code = upper(_invite_code)
  LIMIT 1;
$$;

-- Allow anonymous (signup) and authenticated users to call the lookup
GRANT EXECUTE ON FUNCTION public.get_invitation_by_code(text) TO anon, authenticated;
