-- Create banner_settings table
CREATE TABLE IF NOT EXISTS banner_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies
ALTER TABLE banner_settings ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anyone can read settings)
CREATE POLICY "Public can view banner settings" 
  ON banner_settings 
  FOR SELECT 
  USING (TRUE);

-- Policy for admin write access (only authenticated users can update)
CREATE POLICY "Authenticated users can update banner settings" 
  ON banner_settings 
  FOR UPDATE 
  TO authenticated 
  USING (TRUE) 
  WITH CHECK (TRUE);

-- Insert default settings
INSERT INTO banner_settings (is_enabled) VALUES (TRUE)
ON CONFLICT DO NOTHING;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_banner_settings_updated_at
BEFORE UPDATE ON banner_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 