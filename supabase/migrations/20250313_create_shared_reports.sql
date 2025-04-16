-- Create shared_reports table
CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id VARCHAR(32) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('emergency', 'contribution')),
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- Add RLS policies
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anyone can read active shared reports)
CREATE POLICY "Public can view active shared reports" 
  ON shared_reports 
  FOR SELECT 
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Policy for admin write access
CREATE POLICY "Authenticated users can create shared reports" 
  ON shared_reports 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update shared reports" 
  ON shared_reports 
  FOR UPDATE 
  TO authenticated 
  USING (TRUE) 
  WITH CHECK (TRUE);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_shared_reports_updated_at
BEFORE UPDATE ON shared_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 