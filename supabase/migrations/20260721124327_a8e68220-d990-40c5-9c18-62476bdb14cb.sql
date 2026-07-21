-- Drop existing overly permissive policies on receipts bucket (if any)
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;

-- Owner-only read policy: only the user whose UUID is the first folder segment can read the file
CREATE POLICY "Users can read own receipts" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'receipts')
         AND (storage.foldername(name))[1] = auth.uid()::text);

-- Owner-only upload policy: users can only upload to paths starting with their own user id
CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'receipts')
              AND (storage.foldername(name))[1] = auth.uid()::text);

-- Owner-only update policy
CREATE POLICY "Users can update own receipts" ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'receipts')
         AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'receipts')
              AND (storage.foldername(name))[1] = auth.uid()::text);

-- Owner-only delete policy
CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'receipts')
         AND (storage.foldername(name))[1] = auth.uid()::text);
