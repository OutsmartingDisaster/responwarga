-- Migration: Crowdsource Form Fields (Form Builder)
-- Date: 2025-12-04
-- Description: Add custom form fields for crowdsource projects

CREATE TABLE IF NOT EXISTS crowdsource_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  -- Field definition
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'select', 'checkbox', 'radio', 'date', 'time', 'email', 'phone')),
  placeholder VARCHAR(255),
  helper_text VARCHAR(500),
  
  -- Options for select/radio/checkbox
  options JSONB, -- [{value: 'opt1', label: 'Option 1'}, ...]
  
  -- Validation
  is_required BOOLEAN DEFAULT false,
  min_length INT,
  max_length INT,
  min_value DECIMAL,
  max_value DECIMAL,
  pattern VARCHAR(255), -- regex pattern
  
  -- Display
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crowdsource_form_fields_project ON crowdsource_form_fields(project_id);
CREATE INDEX IF NOT EXISTS idx_crowdsource_form_fields_order ON crowdsource_form_fields(project_id, display_order);

-- Add form_data column to submissions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_submissions' AND column_name = 'form_data'
  ) THEN
    ALTER TABLE crowdsource_submissions ADD COLUMN form_data JSONB;
  END IF;
END $$;

COMMENT ON TABLE crowdsource_form_fields IS 'Custom form fields for crowdsource projects';
COMMENT ON COLUMN crowdsource_form_fields.options IS 'JSON array of options for select/radio/checkbox fields';
COMMENT ON COLUMN crowdsource_submissions.form_data IS 'JSON object containing custom field values';
