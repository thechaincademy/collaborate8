CREATE OR REPLACE FUNCTION public.notify_admins_new_signup(_email text, _name text DEFAULT NULL, _signed_up_at timestamptz DEFAULT now())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_email text;
  tok text;
  subj text := 'New Collabor8 signup: ' || COALESCE(_email, 'unknown');
  body_html text;
  body_text text;
BEGIN
  body_html := '<!doctype html><html><body style="font-family:Arial,sans-serif;background:#FAF8F3;padding:24px;color:#111">'
    || '<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">'
    || '<h1 style="margin:0 0 12px;font-size:20px">New user signed up</h1>'
    || '<p style="margin:0 0 8px;color:#444"><strong>Email:</strong> ' || COALESCE(_email, '-') || '</p>'
    || '<p style="margin:0 0 8px;color:#444"><strong>Name:</strong> ' || COALESCE(NULLIF(_name, ''), '-') || '</p>'
    || '<p style="margin:0;color:#444"><strong>When:</strong> ' || to_char(_signed_up_at, 'DD Mon YYYY HH24:MI') || ' UTC</p>'
    || '</div><p style="text-align:center;color:#999;font-size:12px;margin-top:16px">- Collabor8</p></body></html>';

  body_text := 'New user signed up' || chr(10) || 'Email: ' || COALESCE(_email, '-')
    || chr(10) || 'Name: ' || COALESCE(NULLIF(_name, ''), '-')
    || chr(10) || 'When: ' || to_char(_signed_up_at, 'DD Mon YYYY HH24:MI') || ' UTC';

  FOREACH admin_email IN ARRAY ARRAY['jade@collaborate8.com', 'rafa@collaborate8.com'] LOOP
    SELECT token INTO tok FROM public.email_unsubscribe_tokens WHERE email = admin_email LIMIT 1;
    IF tok IS NULL THEN
      tok := replace(gen_random_uuid()::text, '-', '');
      BEGIN
        INSERT INTO public.email_unsubscribe_tokens (email, token) VALUES (admin_email, tok);
      EXCEPTION WHEN OTHERS THEN
        SELECT token INTO tok FROM public.email_unsubscribe_tokens WHERE email = admin_email LIMIT 1;
      END;
    END IF;

    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'message_id', gen_random_uuid()::text,
      'idempotency_key', 'new_signup:' || COALESCE(_email, 'unknown') || ':' || admin_email || ':' || to_char(_signed_up_at, 'YYYYMMDDHH24MISSMS'),
      'to', admin_email,
      'from', 'Collabor8 <notifications@notify.collaborate8.com>',
      'sender_domain', 'notify.collaborate8.com',
      'subject', subj,
      'html', body_html,
      'text', body_text,
      'purpose', 'transactional',
      'label', 'new_signup_admin_alert',
      'unsubscribe_token', tok,
      'queued_at', now()
    ));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);

  BEGIN
    PERFORM public.notify_admins_new_signup(
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'first_name'),
      COALESCE(NEW.created_at, now())
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin signup notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;