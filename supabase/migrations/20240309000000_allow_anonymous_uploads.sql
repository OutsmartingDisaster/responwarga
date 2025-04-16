-- Drop the existing policy for contribution_photo bucket that only allows authenticated users
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Create a new policy that allows anyone to upload to contribution_photo bucket
CREATE POLICY "Allow anonymous uploads" ON storage.objects
  USING (bucket_id = 'contribution_photo')
  WITH CHECK (bucket_id = 'contribution_photo');

-- Ensure the bucket is set to public
UPDATE storage.buckets
SET public = true
WHERE id = 'contribution_photo';
