-- Drop existing table if exists
DROP TABLE IF EXISTS banners;

-- Create banners table
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT FALSE
);

-- Add RLS policies
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anyone can read active banners)
CREATE POLICY "Public can view active banners" 
  ON banners 
  FOR SELECT 
  USING (active = TRUE);

-- Policy for admin read access (authenticated users can read all banners)
CREATE POLICY "Authenticated users can view all banners" 
  ON banners 
  FOR SELECT 
  TO authenticated 
  USING (TRUE);

-- Policy for admin write access (authenticated users can create/update)
CREATE POLICY "Authenticated users can create banners" 
  ON banners 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update banners" 
  ON banners 
  FOR UPDATE 
  TO authenticated 
  USING (TRUE) 
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can delete banners" 
  ON banners 
  FOR DELETE 
  TO authenticated 
  USING (TRUE);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_banners_updated_at ON banners;

-- Create function to update the updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON banners
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 