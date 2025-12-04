-- Migration: Add consent_publish_name column
-- Date: 2025-12-04
-- Description: Track if contributor consents to having their name published

ALTER TABLE crowdsource_submissions 
ADD COLUMN IF NOT EXISTS consent_publish_name BOOLEAN DEFAULT false;

COMMENT ON COLUMN crowdsource_submissions.consent_publish_name IS 'Whether the contributor consents to having their name displayed publicly';
