-- Create storage buckets for photos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('emergency-photos', 'emergency-photos', true),
  ('contribution-photos', 'contribution-photos', true);

-- Set up storage policies for emergency-photos bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'emergency-photos');

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'emergency-photos' AND
    auth.role() = 'authenticated'
  );

-- Set up storage policies for contribution-photos bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'contribution-photos');

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contribution-photos' AND
    auth.role() = 'authenticated'
  );