-- Migration: Add new field types (url, address)
-- Date: 2025-12-04

-- Drop old constraint and add new one with additional types
ALTER TABLE crowdsource_form_fields 
DROP CONSTRAINT IF EXISTS crowdsource_form_fields_field_type_check;

ALTER TABLE crowdsource_form_fields 
ADD CONSTRAINT crowdsource_form_fields_field_type_check 
CHECK (field_type IN (
  'text', 'textarea', 'number', 'select', 'checkbox', 'radio', 
  'date', 'time', 'email', 'phone', 
  'url', 'address',
  'photo', 'video', 'media'
));
