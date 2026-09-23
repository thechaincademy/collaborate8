CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  dedupe_key text UNIQUE,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.create_notification(_user uuid, _type text, _title text, _message text, _link text, _dedupe text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id, type, title, message, link, dedupe_key)
  VALUES (_user, _type, _title, _message, _link, _dedupe)
  ON CONFLICT (dedupe_key) DO NOTHING;
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;

-- Email dispatch on new notification
CREATE OR REPLACE FUNCTION public.dispatch_notification_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://eycpkzbjylzzynkfggis.supabase.co/functions/v1/send-notification-email',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('notificationId', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;
CREATE TRIGGER notifications_dispatch_email AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification_email();

-- Expenses
CREATE OR REPLACE FUNCTION public.notify_expense_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(public.get_coparent_id(NEW.user_id), 'expense',
      'New expense needs your approval',
      'Your co-parent added "' || NEW.description || '" for £' || to_char(NEW.amount, 'FM999999990.00') || '.',
      '/dashboard?tab=expenses');
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    PERFORM public.create_notification(NEW.user_id, 'expense',
      CASE WHEN NEW.status = 'approved' THEN 'Expense approved' ELSE 'Expense declined' END,
      'Your co-parent ' || CASE WHEN NEW.status = 'approved' THEN 'approved' ELSE 'declined' END || ' "' || NEW.description || '".',
      '/dashboard?tab=expenses');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER expense_notify AFTER INSERT OR UPDATE ON public.expense_requests FOR EACH ROW EXECUTE FUNCTION public.notify_expense_change();

-- Maintenance payments (arrangements)
CREATE OR REPLACE FUNCTION public.notify_arrangement_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.amount IS NOT DISTINCT FROM OLD.amount AND NEW.frequency IS NOT DISTINCT FROM OLD.frequency
     AND NEW.day_of_month IS NOT DISTINCT FROM OLD.day_of_month AND NEW.day_of_week IS NOT DISTINCT FROM OLD.day_of_week
     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN
    RETURN NEW;
  END IF;
  PERFORM public.create_notification(COALESCE(NEW.receiver_id, public.get_coparent_id(NEW.user_id)), 'maintenance',
    CASE WHEN TG_OP = 'INSERT' THEN 'Maintenance payment set up'
         WHEN NOT NEW.is_active THEN 'Maintenance payment stopped'
         ELSE 'Maintenance payment changed' END,
    'Your co-parent ' || CASE WHEN TG_OP = 'INSERT' THEN 'set up' ELSE 'updated' END || ' a ' || NEW.frequency || ' payment of £' || to_char(NEW.amount, 'FM999999990.00') || '.',
    '/dashboard?tab=maintenance');
  RETURN NEW;
END; $$;
CREATE TRIGGER arrangement_notify AFTER INSERT OR UPDATE ON public.recurring_payments FOR EACH ROW EXECUTE FUNCTION public.notify_arrangement_change();

-- Payment / receiving method
CREATE OR REPLACE FUNCTION public.notify_payment_method_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'connected_accounts' AND TG_OP = 'UPDATE'
     AND NEW.payouts_enabled IS NOT DISTINCT FROM OLD.payouts_enabled
     AND NEW.charges_enabled IS NOT DISTINCT FROM OLD.charges_enabled
     AND NEW.onboarding_status IS NOT DISTINCT FROM OLD.onboarding_status THEN
    RETURN NEW;
  END IF;
  PERFORM public.create_notification(public.get_coparent_id(NEW.user_id), 'payment_method',
    'Payment details updated',
    CASE WHEN TG_TABLE_NAME = 'connected_accounts' THEN 'Your co-parent updated how they receive payments.'
         ELSE 'Your co-parent updated their payment details.' END,
    '/dashboard?tab=maintenance');
  RETURN NEW;
END; $$;
CREATE TRIGGER connected_accounts_notify AFTER INSERT OR UPDATE ON public.connected_accounts FOR EACH ROW EXECUTE FUNCTION public.notify_payment_method_change();
CREATE TRIGGER bank_connections_notify AFTER INSERT OR UPDATE ON public.bank_connections FOR EACH ROW EXECUTE FUNCTION public.notify_payment_method_change();

-- Chat messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_notification(NEW.recipient_id, 'message',
    'New message from your co-parent',
    left(COALESCE(NULLIF(NEW.body,''), 'Sent an attachment'), 120),
    '/dashboard?tab=chat');
  RETURN NEW;
END; $$;
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Payment due tomorrow (called daily)
CREATE OR REPLACE FUNCTION public.create_due_tomorrow_notifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; v_next date; v_tomorrow date := (now() AT TIME ZONE 'Europe/London')::date + 1;
BEGIN
  FOR r IN SELECT * FROM public.recurring_payments WHERE is_active AND next_due_date IS NOT NULL LOOP
    v_next := (r.next_due_date AT TIME ZONE 'Europe/London')::date;
    WHILE v_next < v_tomorrow LOOP
      v_next := CASE r.frequency WHEN 'daily' THEN v_next + 1 WHEN 'weekly' THEN v_next + 7 ELSE (v_next + interval '1 month')::date END;
    END LOOP;
    IF v_next = v_tomorrow AND r.frequency <> 'daily' THEN
      PERFORM public.create_notification(r.user_id, 'due', 'Maintenance payment due tomorrow',
        'Your payment of £' || to_char(r.amount, 'FM999999990.00') || ' is due tomorrow.', '/dashboard?tab=maintenance',
        'due-' || r.id || '-' || v_tomorrow || '-payer');
      PERFORM public.create_notification(COALESCE(r.receiver_id, public.get_coparent_id(r.user_id)), 'due', 'Maintenance payment due tomorrow',
        'A payment of £' || to_char(r.amount, 'FM999999990.00') || ' from your co-parent is due tomorrow.', '/dashboard?tab=maintenance',
        'due-' || r.id || '-' || v_tomorrow || '-receiver');
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_due_tomorrow_notifications() FROM PUBLIC, anon, authenticated;