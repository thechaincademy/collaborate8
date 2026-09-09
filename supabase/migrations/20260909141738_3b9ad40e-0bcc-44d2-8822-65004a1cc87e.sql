CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.send_welcome_email(text, text);
DROP FUNCTION IF EXISTS public.notify_admins_new_signup(text, text, timestamptz);