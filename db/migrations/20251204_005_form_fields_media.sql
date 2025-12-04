-- Migration: Add media upload fields to form_fields
-- Date: 2025-12-04
-- Description: Support photo/video upload in custom form fields

-- Add max_file_size_mb column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_form_fields' AND column_name = 'max_file_size_mb'
  ) THEN
    ALTER TABLE crowdsource_form_fields ADD COLUMN max_file_size_mb INT DEFAULT 10;
  END IF;
END $$;

-- Add allowed_formats column (JSONB array)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_form_fields' AND column_name = 'allowed_formats'
  ) THEN
    ALTER TABLE crowdsource_form_fields ADD COLUMN allowed_formats JSONB;
  END IF;
END $$;

-- Update field_type check constraint to include media types
ALTER TABLE crowdsource_form_fields DROP CONSTRAINT IF EXISTS crowdsource_form_fields_field_type_check;
ALTER TABLE crowdsource_form_fields ADD CONSTRAINT crowdsource_form_fields_field_type_check 
  CHECK (field_type IN ('text', 'textarea', 'number', 'select', 'checkbox', 'radio', 'date', 'time', 'email', 'phone', 'photo', 'video', 'media'));

COMMENT ON COLUMN crowdsource_form_fields.max_file_size_mb IS 'Maximum file size in MB for media uploads';
COMMENT ON COLUMN crowdsource_form_fields.allowed_formats IS 'JSON array of allowed file formats e.g. ["jpg", "png", "mp4"]';
