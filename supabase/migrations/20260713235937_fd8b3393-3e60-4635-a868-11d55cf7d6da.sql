
DO $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM auth.users WHERE email ILIKE '%ericbarreto521%';
  IF v_ids IS NULL THEN RETURN; END IF;

  UPDATE public.profiles SET coparent_id = NULL WHERE coparent_id = ANY(v_ids);

  DELETE FROM public.payments
    WHERE payer_id = ANY(v_ids)
       OR payee_id = ANY(v_ids)
       OR related_arrangement_id IN (SELECT id FROM public.recurring_payments WHERE receiver_id = ANY(v_ids) OR user_id = ANY(v_ids))
       OR related_expense_id IN (SELECT id FROM public.expense_requests WHERE user_id = ANY(v_ids));

  DELETE FROM public.recurring_payments WHERE receiver_id = ANY(v_ids) OR user_id = ANY(v_ids);
  DELETE FROM public.expense_requests WHERE user_id = ANY(v_ids);
  DELETE FROM public.invitations WHERE inviter_id = ANY(v_ids);
  DELETE FROM public.audit_events WHERE user_id = ANY(v_ids);
  DELETE FROM public.connected_accounts WHERE user_id = ANY(v_ids);
  DELETE FROM public.bank_connections WHERE user_id = ANY(v_ids);
  DELETE FROM public.profiles WHERE id = ANY(v_ids);

  -- messages cascade via auth.users FK
  DELETE FROM auth.users WHERE id = ANY(v_ids);
END $$;
