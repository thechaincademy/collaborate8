ALTER TABLE public.expense_requests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'expense',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS note text;

CREATE OR REPLACE FUNCTION public.get_coparent_last_active()
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT max(created_at) FROM public.usage_events
  WHERE user_id = public.get_coparent_id(auth.uid()) AND auth.uid() IS NOT NULL
$$;
GRANT EXECUTE ON FUNCTION public.get_coparent_last_active() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_expense_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'split_request' THEN
      SELECT COALESCE(NULLIF(trim(first_name),''), 'Your co-parent') INTO v_name FROM public.profiles WHERE id = NEW.user_id;
      PERFORM public.create_notification(public.get_coparent_id(NEW.user_id), 'expense',
        'Shared expense request',
        COALESCE(v_name,'Your co-parent') || ' has sent you a shared expense request: ' || NEW.description || ' - £' || to_char(NEW.amount, 'FM999999990.00') || '. Are you happy to split this?',
        '/dashboard?tab=expenses');
    ELSE
      PERFORM public.create_notification(public.get_coparent_id(NEW.user_id), 'expense',
        'New expense needs your approval',
        'Your co-parent added "' || NEW.description || '" for £' || to_char(NEW.amount, 'FM999999990.00') || '.',
        '/dashboard?tab=expenses');
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected','agreed') THEN
    PERFORM public.create_notification(NEW.user_id, 'expense',
      CASE WHEN NEW.status = 'rejected' THEN 'Expense declined' WHEN NEW.status = 'agreed' THEN 'Expense split agreed' ELSE 'Expense approved' END,
      'Your co-parent ' || CASE WHEN NEW.status = 'rejected' THEN 'declined' WHEN NEW.status = 'agreed' THEN 'agreed to split' ELSE 'approved' END || ' "' || NEW.description || '".',
      '/dashboard?tab=' || CASE WHEN NEW.status = 'rejected' AND NEW.kind = 'split_request' THEN 'chat' ELSE 'expenses' END);
  END IF;
  RETURN NEW;
END; $function$;