-- Drop existing table if exists
DROP TABLE IF EXISTS about_content;

-- Create about_content table
CREATE TABLE about_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT FALSE
);

-- Add RLS policies
ALTER TABLE about_content ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anyone can read active content)
CREATE POLICY "Public can view active about content" 
  ON about_content 
  FOR SELECT 
  USING (active = TRUE);

-- Policy for admin read access (authenticated users can read all content)
CREATE POLICY "Authenticated users can view all about content" 
  ON about_content 
  FOR SELECT 
  TO authenticated 
  USING (TRUE);

-- Policy for admin write access (authenticated users can create/update)
CREATE POLICY "Authenticated users can create about content" 
  ON about_content 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update about content" 
  ON about_content 
  FOR UPDATE 
  TO authenticated 
  USING (TRUE) 
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can delete about content" 
  ON about_content 
  FOR DELETE 
  TO authenticated 
  USING (TRUE);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_about_content_updated_at ON about_content;

-- Create function to update the updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_about_content_updated_at
BEFORE UPDATE ON about_content
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 