CREATE OR REPLACE FUNCTION public.send_welcome_email(_email text, _name text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tok text;
  greeting text := CASE WHEN COALESCE(NULLIF(_name, ''), '') = '' THEN 'Hi there' ELSE 'Hi ' || _name END;
  body_html text;
  body_text text;
BEGIN
  IF _email IS NULL OR _email = '' THEN
    RETURN;
  END IF;

  SELECT token INTO tok FROM public.email_unsubscribe_tokens WHERE email = _email LIMIT 1;
  IF tok IS NULL THEN
    tok := replace(gen_random_uuid()::text, '-', '');
    BEGIN
      INSERT INTO public.email_unsubscribe_tokens (email, token) VALUES (_email, tok);
    EXCEPTION WHEN OTHERS THEN
      SELECT token INTO tok FROM public.email_unsubscribe_tokens WHERE email = _email LIMIT 1;
    END;
  END IF;

  body_html := '<!doctype html><html><body style="margin:0;background:#FAF8F3;font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px">'
    || '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">'
    || '<h1 style="margin:0 0 16px;font-size:22px">Welcome to Collabor8</h1>'
    || '<p style="margin:0 0 14px;line-height:1.6">' || greeting || ',</p>'
    || '<p style="margin:0 0 14px;line-height:1.6">We are Jade and Rafa, the founders of Collabor8. Thank you for joining us - we built this after seeing how stressful money can be between separated parents, and we would love to make it simpler for you.</p>'
    || '<p style="margin:0 0 10px;line-height:1.6">Here is what you can do inside the app:</p>'
    || '<ul style="margin:0 0 14px;padding-left:20px;line-height:1.7">'
    || '<li><strong>Link with your co-parent</strong> using your unique invite code.</li>'
    || '<li><strong>Set up child maintenance payments</strong> - choose the amount, how often, and the first payment date.</li>'
    || '<li><strong>Share and track expenses</strong> with receipts, so nothing is disputed later.</li>'
    || '<li><strong>See a clear statement</strong> of activity over 3, 6 or 12 months, and download it whenever you need it.</li>'
    || '<li><strong>Chat</strong> with a supportive tool that helps keep conversations constructive.</li>'
    || '<li><strong>Guides and tools</strong>, including a child maintenance calculator based on the standard UK rules.</li>'
    || '</ul>'
    || '<p style="margin:0 0 14px;line-height:1.6">If you get stuck or just want to talk something through, reply to this email or write to us directly at '
    || '<a href="mailto:jade@collaborate8.com" style="color:#D4A017">jade@collaborate8.com</a> or '
    || '<a href="mailto:rafa@collaborate8.com" style="color:#D4A017">rafa@collaborate8.com</a>. A real person will answer.</p>'
    || '<p style="margin:0 0 4px;line-height:1.6">Warm wishes,</p>'
    || '<p style="margin:0;line-height:1.6"><strong>Jade &amp; Rafa</strong><br/>Founders, Collabor8</p>'
    || '</div></body></html>';

  body_text := greeting || ',' || chr(10) || chr(10)
    || 'We are Jade and Rafa, the founders of Collabor8. Thank you for joining us - we built this after seeing how stressful money can be between separated parents.' || chr(10) || chr(10)
    || 'Inside the app you can:' || chr(10)
    || '- Link with your co-parent using your unique invite code' || chr(10)
    || '- Set up child maintenance payments (amount, frequency, first payment date)' || chr(10)
    || '- Share and track expenses with receipts' || chr(10)
    || '- See and download a statement of activity over 3, 6 or 12 months' || chr(10)
    || '- Use a chat tool that helps keep conversations constructive' || chr(10)
    || '- Read our guides and use the child maintenance calculator' || chr(10) || chr(10)
    || 'Need help? Email jade@collaborate8.com or rafa@collaborate8.com - a real person will answer.' || chr(10) || chr(10)
    || 'Warm wishes,' || chr(10) || 'Jade & Rafa, Founders, Collabor8';

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', gen_random_uuid()::text,
    'idempotency_key', 'welcome:' || _email || ':' || to_char(now(), 'YYYYMMDDHH24MISSMS'),
    'to', _email,
    'from', 'Jade & Rafa at Collabor8 <notifications@notify.collaborate8.com>',
    'sender_domain', 'notify.collaborate8.com',
    'subject', 'Welcome to Collabor8 - here is how we can help',
    'html', body_html,
    'text', body_text,
    'purpose', 'transactional',
    'label', 'user_welcome',
    'unsubscribe_token', tok,
    'queued_at', now()
  ));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.send_welcome_email(text, text) FROM anon, authenticated, PUBLIC;