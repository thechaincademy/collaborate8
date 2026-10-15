-- Collabor8 - Product Tracker row 7 (part 2 of 2): Feature usage analytics
-- Approved by Rafaela on 15 Oct 2026.

ALTER TABLE public.usage_events
  ADD COLUMN IF NOT EXISTS anonymous_id uuid;

COMMENT ON COLUMN public.usage_events.anonymous_id IS
  'Random per-browser id for signed-out events (only after analytics cookie consent). Not derived from personal data.';
COMMENT ON COLUMN public.usage_events.metadata IS
  'Allow-listed, non-personal properties only (see sanitize_usage_event). Never text, names, emails or exact amounts.';

ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_event_type_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_event_type_check CHECK (
  event_type IN (
    'tab_click',
    'signup_started', 'signup_completed', 'login',
    'expense_added', 'expense_approved', 'expense_rejected',
    'chat_message_sent', 'document_uploaded',
    'payment_started', 'payment_completed',
    'chatbot_opened', 'chatbot_message_sent',
    'coparent_invite_sent', 'coparent_linked',
    'decision_created', 'benefits_viewed', 'calculator_used'
  )
);

ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_actor_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_actor_check
  CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL);

ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_tab_len_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_tab_len_check
  CHECK (tab IS NULL OR char_length(tab) <= 40);

ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_path_len_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_path_len_check
  CHECK (path IS NULL OR char_length(path) <= 120);

ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_metadata_check;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_metadata_check
  CHECK (metadata IS NULL OR (jsonb_typeof(metadata) = 'object' AND pg_column_size(metadata) <= 1024));

CREATE OR REPLACE FUNCTION public.sanitize_usage_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY[
    'tab','flow','method','source','surface','kind','category','priority',
    'product','interval','amount_bucket','file_type','has_receipt',
    'has_deadline','require_ack','used_suggestion','rewritten','pending',
    'options_count','action'
  ];
  k text;
  v jsonb;
  clean jsonb := '{}'::jsonb;
BEGIN
  NEW.created_at := now();

  IF NEW.path IS NOT NULL THEN
    NEW.path := left(split_part(split_part(NEW.path, '?', 1), '#', 1), 120);
  END IF;

  IF NEW.metadata IS NOT NULL THEN
    IF jsonb_typeof(NEW.metadata) <> 'object' THEN
      NEW.metadata := NULL;
    ELSE
      FOR k, v IN SELECT key, value FROM jsonb_each(NEW.metadata) LOOP
        IF k = ANY (allowed) AND (
             jsonb_typeof(v) = 'boolean'
          OR (jsonb_typeof(v) = 'number' AND k = 'options_count')
          OR (jsonb_typeof(v) = 'string'
              AND char_length(v #>> '{}') <= 40
              AND position('@' IN (v #>> '{}')) = 0)
        ) THEN
          clean := clean || jsonb_build_object(k, v);
        END IF;
      END LOOP;
      NEW.metadata := NULLIF(clean, '{}'::jsonb);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usage_events_sanitize ON public.usage_events;
CREATE TRIGGER usage_events_sanitize
  BEFORE INSERT ON public.usage_events
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_usage_event();

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can record their own usage events" ON public.usage_events;
CREATE POLICY "Users can record their own usage events"
  ON public.usage_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Visitors can record pre-signup events" ON public.usage_events;
CREATE POLICY "Visitors can record pre-signup events"
  ON public.usage_events
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND anonymous_id IS NOT NULL
    AND event_type IN ('signup_started', 'signup_completed', 'calculator_used')
  );

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.usage_events FROM anon, authenticated;
REVOKE SELECT ON public.usage_events FROM anon;

CREATE INDEX IF NOT EXISTS usage_events_type_created_idx
  ON public.usage_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_anon_idx
  ON public.usage_events (anonymous_id) WHERE anonymous_id IS NOT NULL;

CREATE OR REPLACE VIEW public.usage_events_reportable
WITH (security_invoker = true) AS
WITH test_users AS (
  SELECT id FROM public.profiles WHERE is_test_account
), test_anon AS (
  SELECT DISTINCT e.anonymous_id
  FROM public.usage_events e
  JOIN test_users t ON t.id = e.user_id
  WHERE e.anonymous_id IS NOT NULL
)
SELECT ue.*
FROM public.usage_events ue
WHERE (ue.user_id IS NULL
       OR (NOT EXISTS (SELECT 1 FROM test_users t WHERE t.id = ue.user_id)
           AND NOT public.is_admin(ue.user_id)))
  AND (ue.anonymous_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM test_anon a WHERE a.anonymous_id = ue.anonymous_id));

REVOKE ALL ON public.usage_events_reportable FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.usage_events_reportable TO service_role;

COMMENT ON VIEW public.usage_events_reportable IS
  'usage_events without test accounts, admins and their anonymous ids. Used by admin_usage_summary, weekly-admin-report and the weekly report queries.';

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
    'total_users', (SELECT count(*) FROM public.profiles WHERE NOT is_test_account),
    'new_users', (SELECT count(*) FROM public.profiles WHERE created_at >= v_since AND NOT is_test_account),
    'active_users', (SELECT count(DISTINCT user_id) FROM public.usage_events_reportable WHERE created_at >= v_since AND user_id IS NOT NULL),
    'total_events', (SELECT count(*) FROM public.usage_events_reportable WHERE created_at >= v_since),
    'linked_pairs', (SELECT count(*) FROM public.profiles WHERE coparent_id IS NOT NULL AND NOT is_test_account),
    'payments_count', (SELECT count(*) FROM public.payments y WHERE y.created_at >= v_since
                         AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = y.payer_id AND p.is_test_account)),
    'payments_total', (SELECT COALESCE(sum(amount), 0) FROM public.payments y WHERE y.created_at >= v_since AND y.status IN ('succeeded','completed','paid')
                         AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = y.payer_id AND p.is_test_account)),
    'expenses_count', (SELECT count(*) FROM public.expense_requests x WHERE x.created_at >= v_since
                         AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = x.user_id AND p.is_test_account)),
    'tabs', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT COALESCE(tab, path, event_type) AS name,
               count(*) AS clicks,
               count(DISTINCT user_id) AS users
        FROM public.usage_events_reportable
        WHERE created_at >= v_since AND event_type = 'tab_click'
        GROUP BY 1
        ORDER BY count(*) DESC
        LIMIT 25
      ) t
    ),
    'features', (
      SELECT COALESCE(jsonb_agg(f), '[]'::jsonb) FROM (
        SELECT event_type AS name,
               count(*) AS events,
               count(DISTINCT COALESCE(user_id::text, 'anon:' || anonymous_id::text)) AS users
        FROM public.usage_events_reportable
        WHERE created_at >= v_since AND event_type <> 'tab_click'
        GROUP BY 1
        ORDER BY count(*) DESC
      ) f
    ),
    'signup_funnel', (
      WITH completed AS (
        SELECT DISTINCT user_id
        FROM public.usage_events_reportable
        WHERE event_type = 'signup_completed' AND created_at >= v_since AND user_id IS NOT NULL
      )
      SELECT jsonb_build_object(
        'started_anon', (SELECT count(DISTINCT anonymous_id) FROM public.usage_events_reportable
                          WHERE event_type = 'signup_started' AND created_at >= v_since),
        'completed', (SELECT count(*) FROM completed),
        'invited_or_linked', (SELECT count(DISTINCT e.user_id) FROM public.usage_events_reportable e
                               JOIN completed c USING (user_id)
                               WHERE e.event_type IN ('coparent_invite_sent', 'coparent_linked')),
        'first_action', (SELECT count(DISTINCT e.user_id) FROM public.usage_events_reportable e
                          JOIN completed c USING (user_id)
                          WHERE e.event_type IN ('expense_added', 'chat_message_sent', 'document_uploaded',
                                                 'decision_created', 'payment_started'))
      )
    ),
    'daily', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d->>'day'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'events', count(*),
          'users', count(DISTINCT user_id)
        ) AS d
        FROM public.usage_events_reportable
        WHERE created_at >= v_since
        GROUP BY date_trunc('day', created_at)
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;