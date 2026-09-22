ALTER TABLE public.expense_requests
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_invoice_item_id text,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS apply_note text;

CREATE POLICY "Co-parent can decide pending expenses"
ON public.expense_requests
FOR UPDATE
TO authenticated
USING (user_id = public.get_coparent_id(auth.uid()) AND status = 'pending')
WITH CHECK (user_id = public.get_coparent_id(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;

CREATE POLICY "Receipts read coparent"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = (public.get_coparent_id(auth.uid()))::text);