DO $$
DECLARE
  target_ids uuid[] := ARRAY[
    '80171566-c4f0-4271-9751-528340aa9085',
    'ed69bc7f-e942-4f12-b3c2-fc7596cfa2ce',
    '9215d8f9-4144-4214-a956-3f0085b11f82'
  ]::uuid[];
BEGIN
  UPDATE public.profiles SET coparent_id = NULL WHERE coparent_id = ANY(target_ids);

  DELETE FROM public.audit_events WHERE user_id = ANY(target_ids);
  DELETE FROM public.messages WHERE sender_id = ANY(target_ids) OR recipient_id = ANY(target_ids);
  DELETE FROM public.expense_requests WHERE user_id = ANY(target_ids);

  -- Payments first (they reference recurring_payments via related_arrangement_id, and payer_id)
  DELETE FROM public.payments
    WHERE payer_id = ANY(target_ids)
       OR related_arrangement_id IN (
         SELECT id FROM public.recurring_payments
         WHERE user_id = ANY(target_ids) OR receiver_id = ANY(target_ids)
       );

  DELETE FROM public.recurring_payments WHERE user_id = ANY(target_ids) OR receiver_id = ANY(target_ids);
  DELETE FROM public.invitations WHERE inviter_id = ANY(target_ids);
  DELETE FROM public.connected_accounts WHERE user_id = ANY(target_ids);
  DELETE FROM public.bank_connections WHERE user_id = ANY(target_ids);
  DELETE FROM public.profiles WHERE id = ANY(target_ids);

  DELETE FROM auth.users WHERE id = ANY(target_ids);
END $$;