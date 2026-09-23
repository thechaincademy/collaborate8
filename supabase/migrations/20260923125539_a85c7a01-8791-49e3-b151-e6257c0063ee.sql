DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
CREATE POLICY "Users can upload own receipts" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
CREATE POLICY "Users can update own receipts" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);