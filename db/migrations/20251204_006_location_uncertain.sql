-- Migration: Location Uncertainty Flag
-- Date: 2025-12-04
-- Description: Add location_uncertain flag and related fields to submissions

-- Add location_uncertain flag
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_submissions' AND column_name = 'location_uncertain'
  ) THEN
    ALTER TABLE crowdsource_submissions ADD COLUMN location_uncertain BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add location_level (provinsi/kabupaten/kecamatan/kelurahan/exact)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_submissions' AND column_name = 'location_level'
  ) THEN
    ALTER TABLE crowdsource_submissions ADD COLUMN location_level VARCHAR(20) DEFAULT 'exact';
  END IF;
END $$;

-- Add location_verified_by_moderator
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_submissions' AND column_name = 'location_verified'
  ) THEN
    ALTER TABLE crowdsource_submissions ADD COLUMN location_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add moderator_notes for location verification notes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_submissions' AND column_name = 'moderator_notes'
  ) THEN
    ALTER TABLE crowdsource_submissions ADD COLUMN moderator_notes TEXT;
  END IF;
END $$;

-- Add exif_gps_data to store extracted GPS from photo EXIF
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_submissions' AND column_name = 'exif_gps_data'
  ) THEN
    ALTER TABLE crowdsource_submissions ADD COLUMN exif_gps_data JSONB;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_submissions_location_uncertain ON crowdsource_submissions(location_uncertain);
CREATE INDEX IF NOT EXISTS idx_submissions_location_verified ON crowdsource_submissions(location_verified);

COMMENT ON COLUMN crowdsource_submissions.location_uncertain IS 'True if submitter does not know exact location';
COMMENT ON COLUMN crowdsource_submissions.location_level IS 'Level of location certainty: exact, kelurahan, kecamatan, kabupaten, provinsi';
COMMENT ON COLUMN crowdsource_submissions.location_verified IS 'True if moderator has verified the location';
COMMENT ON COLUMN crowdsource_submissions.moderator_notes IS 'Notes from moderator about location verification';
COMMENT ON COLUMN crowdsource_submissions.exif_gps_data IS 'GPS data extracted from photo EXIF metadata';
