CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  tab text,
  path text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX usage_events_created_at_idx ON public.usage_events (created_at DESC);
CREATE INDEX usage_events_tab_idx ON public.usage_events (tab);
CREATE INDEX usage_events_user_idx ON public.usage_events (user_id);

GRANT INSERT ON public.usage_events TO authenticated;
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) IN ('rafa@collaborate8.com', 'jade@collaborate8.com')
  )
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM anon;

CREATE POLICY "Users can record their own usage events"
ON public.usage_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view usage events"
ON public.usage_events FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_usage_summary(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => GREATEST(_days, 1));
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT jsonb_build_object(
    'since', v_since,
    'days', GREATEST(_days, 1),
    'total_users', (SELECT count(*) FROM public.profiles),
    'new_users', (SELECT count(*) FROM public.profiles WHERE created_at >= v_since),
    'active_users', (SELECT count(DISTINCT user_id) FROM public.usage_events WHERE created_at >= v_since),
    'total_events', (SELECT count(*) FROM public.usage_events WHERE created_at >= v_since),
    'linked_pairs', (SELECT count(*) FROM public.profiles WHERE coparent_id IS NOT NULL),
    'payments_count', (SELECT count(*) FROM public.payments WHERE created_at >= v_since),
    'payments_total', (SELECT COALESCE(sum(amount), 0) FROM public.payments WHERE created_at >= v_since AND status IN ('succeeded','completed','paid')),
    'expenses_count', (SELECT count(*) FROM public.expense_requests WHERE created_at >= v_since),
    'tabs', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT COALESCE(tab, path, event_type) AS name,
               count(*) AS clicks,
               count(DISTINCT user_id) AS users
        FROM public.usage_events
        WHERE created_at >= v_since
        GROUP BY 1
        ORDER BY count(*) DESC
        LIMIT 25
      ) t
    ),
    'daily', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d->>'day'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'events', count(*),
          'users', count(DISTINCT user_id)
        ) AS d
        FROM public.usage_events
        WHERE created_at >= v_since
        GROUP BY date_trunc('day', created_at)
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_usage_summary(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_usage_summary(integer) TO authenticated;

SELECT cron.schedule(
  'weekly-admin-report',
  '0 13 * * 5',
  $cron$
  SELECT net.http_post(
    url := 'https://eycpkzbjylzzynkfggis.supabase.co/functions/v1/weekly-admin-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $cron$
);