REVOKE EXECUTE ON FUNCTION public.dispatch_notification_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_expense_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_arrangement_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_payment_method_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_due_tomorrow_notifications() FROM PUBLIC, anon, authenticated;