
CREATE OR REPLACE FUNCTION public.accept_coparent_invitation(_invite_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter uuid;
  v_invite_id uuid;
  v_status text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, inviter_id, status
    INTO v_invite_id, v_inviter, v_status
  FROM public.invitations
  WHERE invite_code = upper(_invite_code);

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF v_inviter = v_uid THEN
    RAISE EXCEPTION 'You cannot accept your own invite';
  END IF;

  UPDATE public.profiles SET coparent_id = v_uid WHERE id = v_inviter;
  UPDATE public.profiles SET coparent_id = v_inviter WHERE id = v_uid;

  UPDATE public.invitations
     SET status = 'accepted',
         invitee_email = COALESCE(invitee_email, (SELECT email FROM auth.users WHERE id = v_uid))
   WHERE id = v_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_coparent_invitation(text) TO authenticated;

-- Backfill: any accepted invitation where the inviter's coparent_id is null but the invitee is known via email
UPDATE public.profiles p
   SET coparent_id = u.id
  FROM public.invitations i
  JOIN auth.users u ON lower(u.email) = lower(i.invitee_email)
 WHERE i.status = 'accepted'
   AND i.inviter_id = p.id
   AND p.coparent_id IS NULL;

UPDATE public.profiles p
   SET coparent_id = i.inviter_id
  FROM public.invitations i
  JOIN auth.users u ON lower(u.email) = lower(i.invitee_email)
 WHERE i.status = 'accepted'
   AND u.id = p.id
   AND p.coparent_id IS NULL;
