-- Collabor8: web "Request access" wall. NOT APPLIED. Needs Rafa's yes.
-- Target: London (byrwtxdalhsmvktuzoya) only. Never the old Lovable database.
-- Rollback: NEEDS_RAFA_APPROVAL_access_requests_ROLLBACK.sql
--
-- What this changes, in plain English:
--  1. A new table, public.access_requests, holding requests to join from the website: name,
--     email, an optional short note, pending/approved/rejected, who decided and when, and a
--     fingerprint (SHA-256 hash) of the single-use sign-up link. The link itself is never stored.
--     Browsers can't read or write it at all (RLS on, no policies, no grants to anon or
--     authenticated). Only the server (service role) can.
--  2. public.access_request_submit(): the only way a request gets in. It is rate limited
--     (3 per email per day, 10 per network per hour, 300 per hour in total), never makes a
--     second open request for the same email, and forgets the network fingerprint after 7 days.
--     The network fingerprint is a hash, not the IP address.
--  3. public.c8_before_user_created(): a check Supabase runs before it creates any new account.
--     A new account is allowed when it is (a) a team test account, (b) made in the phone app,
--     (c) a co-parent with a valid, unused invite code from an existing parent, or (d) someone
--     Rafa or Jade approved, using their own single-use link (it is marked used here). Anyone
--     else is refused with a message pointing them to collaborate8.com/request-access.
--     Existing accounts are never touched: this only runs when a brand-new account is created.
--     Nothing in profiles, invitations or auth.users is changed.
--  4. Step 2 below (outside SQL) switches that check on in Supabase Auth.
--
-- Step 1: run this file in the SQL editor (or via the Management API) on London.

BEGIN;

CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254 AND email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  note text CHECK (note IS NULL OR length(note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  approval_token_hash text CHECK (approval_token_hash IS NULL OR approval_token_hash ~ '^[0-9a-f]{64}$'),
  token_expires_at timestamptz,
  token_used_at timestamptz,
  request_ip_hash text CHECK (request_ip_hash IS NULL OR request_ip_hash ~ '^[0-9a-f]{64}$'),
  CHECK (status = 'pending' OR decided_at IS NOT NULL)
);

COMMENT ON TABLE public.access_requests IS 'Requests to join Collabor8 from the website. Server only. Tokens are stored as SHA-256 hashes; request_ip_hash is cleared after 7 days.';

CREATE UNIQUE INDEX IF NOT EXISTS access_requests_one_pending_per_email ON public.access_requests (email) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS access_requests_token_hash ON public.access_requests (approval_token_hash) WHERE approval_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS access_requests_created_at ON public.access_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS access_requests_email_created ON public.access_requests (email, created_at);
CREATE INDEX IF NOT EXISTS access_requests_ip_created ON public.access_requests (request_ip_hash, created_at) WHERE request_ip_hash IS NOT NULL;

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: anon and authenticated can never read or write rows.
REVOKE ALL ON public.access_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_requests TO service_role;

-- The only insert path, called by the request-access edge function with the service role.
CREATE OR REPLACE FUNCTION public.access_request_submit(_email text, _name text, _note text, _ip_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e text := lower(btrim(coalesce(_email, '')));
  n text := btrim(coalesce(_name, ''));
  t text := nullif(btrim(coalesce(_note, '')), '');
  new_id uuid;
BEGIN
  IF e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR length(e) > 254 OR length(n) NOT BETWEEN 1 AND 100 OR length(coalesce(t, '')) > 500 THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;
  IF _ip_hash IS NOT NULL AND _ip_hash !~ '^[0-9a-f]{64}$' THEN _ip_hash := NULL; END IF;

  -- Forget network fingerprints after 7 days.
  UPDATE public.access_requests SET request_ip_hash = NULL
   WHERE request_ip_hash IS NOT NULL AND created_at < now() - interval '7 days';

  IF EXISTS (SELECT 1 FROM public.access_requests WHERE email = e AND status = 'pending') THEN
    RETURN jsonb_build_object('result', 'already_pending');
  END IF;
  IF EXISTS (SELECT 1 FROM public.access_requests WHERE email = e AND status = 'approved' AND token_used_at IS NULL AND token_expires_at > now()) THEN
    RETURN jsonb_build_object('result', 'already_approved');
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = e) THEN
    RETURN jsonb_build_object('result', 'has_account');
  END IF;

  IF (SELECT count(*) FROM public.access_requests WHERE email = e AND created_at > now() - interval '24 hours') >= 3
     OR (_ip_hash IS NOT NULL AND (SELECT count(*) FROM public.access_requests WHERE request_ip_hash = _ip_hash AND created_at > now() - interval '1 hour') >= 10)
     OR (SELECT count(*) FROM public.access_requests WHERE created_at > now() - interval '1 hour') >= 300 THEN
    RETURN jsonb_build_object('result', 'rate_limited');
  END IF;

  INSERT INTO public.access_requests (email, name, note, request_ip_hash)
  VALUES (e, n, t, _ip_hash)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('result', 'created', 'id', new_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('result', 'already_pending');
END;
$$;

REVOKE ALL ON FUNCTION public.access_request_submit(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_request_submit(text, text, text, text) TO service_role;

-- Before-user-created auth hook. Runs only when a brand-new account is about to be created.
-- Returning '{}' lets it through; returning an error object refuses it.
CREATE OR REPLACE FUNCTION public.c8_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e text := lower(btrim(coalesce(event->'user'->>'email', '')));
  meta jsonb := coalesce(event->'user'->'user_metadata', '{}'::jsonb);
  client text := coalesce(meta->>'c8_client', '');
  acq text := btrim(coalesce(meta->>'acquisition_source', ''));
  code text := upper(btrim(coalesce(meta->>'c8_invite_code', '')));
  tok text := coalesce(meta->>'c8_access_token', '');
  used_id uuid;
BEGIN
  IF jsonb_typeof(meta) <> 'object' THEN meta := '{}'::jsonb; END IF;

  -- (a) Team test accounts: the QA inbox and its +aliases, and +uk aliases on collaborate8.com.
  IF e ~ '^collaborate8-qa(\+[a-z0-9._-]+)?@agentmail\.to$' OR e ~ '^[^@]+\+uk[a-z0-9._-]*@collaborate8\.com$' THEN
    RETURN '{}'::jsonb;
  END IF;

  -- (b) The phone app. New builds send c8_client = 'app' (the website's in-app web view does
  -- too). Current app builds (28 to 34) send acquisition_source, which the website never sends;
  -- the website always sends c8_client = 'web'.
  IF client = 'app' OR (client = '' AND acq <> '') THEN
    RETURN '{}'::jsonb;
  END IF;

  -- (c) A co-parent with a valid, unused invite code from an existing parent.
  BEGIN
    IF code ~ '^[A-Z0-9]{6}$' AND EXISTS (
      SELECT 1 FROM public.invitations i
      JOIN public.profiles p ON p.id = i.inviter_id
      WHERE i.invite_code = code AND coalesce(i.status, 'pending') <> 'accepted'
    ) THEN
      RETURN '{}'::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- fall through to the next check
  END;

  -- (d) Someone Rafa or Jade approved, with their own single-use link (marked used now).
  BEGIN
    IF e <> '' AND tok ~ '^[A-Za-z0-9_-]{40,64}$' THEN
      UPDATE public.access_requests
         SET token_used_at = now()
       WHERE approval_token_hash = encode(sha256(convert_to(tok, 'UTF8')), 'hex')
         AND email = e
         AND status = 'approved'
         AND token_used_at IS NULL
         AND token_expires_at > now()
      RETURNING id INTO used_id;
      IF used_id IS NOT NULL THEN
        RETURN '{}'::jsonb;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Collabor8 is welcoming new families gradually. Please request access at collaborate8.com/request-access, or ask your co-parent for their invite code.'
  ));
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE ALL ON FUNCTION public.c8_before_user_created(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.c8_before_user_created(jsonb) TO supabase_auth_admin;

COMMIT;

-- Step 2 (after step 1, and only once the website build that sends c8_client is live on the
-- London test site): switch the hook on in Supabase Auth, via Dashboard > Authentication >
-- Hooks > "Before User Created" > Postgres > public.c8_before_user_created, or:
--
--   curl -X PATCH "https://api.supabase.com/v1/projects/byrwtxdalhsmvktuzoya/config/auth" \
--     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "User-Agent: curl/8.5.0" \
--     -H "Content-Type: application/json" \
--     -d '{"hook_before_user_created_enabled": true,
--          "hook_before_user_created_uri": "pg-functions://postgres/public/c8_before_user_created"}'
--
-- To switch the wall off again without dropping anything, send the same call with
-- "hook_before_user_created_enabled": false.
