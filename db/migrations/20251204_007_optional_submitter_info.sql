-- Migration: Make submitter info optional
-- The crowdsource submission form now allows anonymous submissions
-- This migration removes the NOT NULL constraint from submitter fields

-- Make submitter_name nullable
ALTER TABLE crowdsource_submissions 
ALTER COLUMN submitter_name DROP NOT NULL;

-- Make submitter_email nullable
ALTER TABLE crowdsource_submissions 
ALTER COLUMN submitter_email DROP NOT NULL;

-- Make submitter_whatsapp nullable
ALTER TABLE crowdsource_submissions 
ALTER COLUMN submitter_whatsapp DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN crowdsource_submissions.submitter_name IS 'Optional: Name of the person submitting the report';
COMMENT ON COLUMN crowdsource_submissions.submitter_email IS 'Optional: Email for follow-up communication';
COMMENT ON COLUMN crowdsource_submissions.submitter_whatsapp IS 'Optional: WhatsApp number for follow-up';
