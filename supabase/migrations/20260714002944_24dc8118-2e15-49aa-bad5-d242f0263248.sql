DO $$
DECLARE
  target_ids uuid[] := ARRAY[
    'e3e342c3-19ab-4f37-b578-3d53207d020a'::uuid,
    '7a50bf88-5fc6-4e61-89a7-4e7d9ab1b4d3'::uuid,
    'b4696d36-4b3c-4fce-bc4d-ac44c7398ee3'::uuid,
    '0a9d2997-8267-424d-868e-7e96442748f3'::uuid
  ];
BEGIN
  UPDATE public.profiles SET coparent_id = NULL WHERE coparent_id = ANY(target_ids);
  DELETE FROM public.payments WHERE payer_id = ANY(target_ids) OR payee_id = ANY(target_ids);
  DELETE FROM public.recurring_payments WHERE receiver_id = ANY(target_ids);
  DELETE FROM public.audit_events WHERE user_id = ANY(target_ids);
  DELETE FROM public.messages WHERE sender_id = ANY(target_ids) OR recipient_id = ANY(target_ids);
  DELETE FROM public.expense_requests WHERE user_id = ANY(target_ids);
  DELETE FROM public.invitations WHERE inviter_id = ANY(target_ids);
  DELETE FROM auth.users WHERE id = ANY(target_ids);
END $$;