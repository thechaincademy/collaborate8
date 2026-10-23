-- Deploy target: database migration (apply only with explicit deployment approval).
-- Matches _shared/conversation-tool-access-rule.ts. No co-parent inheritance:
-- this checks the same caller-owned row as conversation-tool-access status.
CREATE OR REPLACE FUNCTION public.has_premium_access(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversation_tool_access a
    WHERE a.user_id = uid AND CASE
      WHEN NULLIF(a.subscription_status, '') IS NOT NULL THEN
        a.subscription_status IN ('active', 'trialing') OR a.current_period_end > now()
      ELSE a.expires_at IS NULL OR a.expires_at > now()
    END
  );
$$;
REVOKE ALL ON FUNCTION public.has_premium_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_premium_access(uuid) TO authenticated, service_role;

-- Restrictive AND guard: existing permissive upload policies cannot bypass it.
-- Preserves receipts, existing reads, and deletes. Chat and Documents share this bucket.
DROP POLICY IF EXISTS "Chat attachments require premium insert" ON storage.objects;
CREATE POLICY "Chat attachments require premium insert"
ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  bucket_id <> 'chat-attachments' OR (
    (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_premium_access(auth.uid())
  )
);
