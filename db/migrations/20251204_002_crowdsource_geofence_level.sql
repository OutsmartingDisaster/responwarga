-- Migration: Add geofence level columns
-- Date: 2025-12-04
-- Description: Add geofence_level and geofence_area_name to crowdsource_projects

-- Add geofence_level column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_projects' AND column_name = 'geofence_level'
  ) THEN
    ALTER TABLE crowdsource_projects 
    ADD COLUMN geofence_level VARCHAR(20) DEFAULT 'radius' 
    CHECK (geofence_level IN ('radius', 'kelurahan', 'kecamatan', 'kabupaten', 'provinsi'));
  END IF;
END $$;

-- Add geofence_area_name column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_projects' AND column_name = 'geofence_area_name'
  ) THEN
    ALTER TABLE crowdsource_projects 
    ADD COLUMN geofence_area_name VARCHAR(255);
  END IF;
END $$;

-- Comment
COMMENT ON COLUMN crowdsource_projects.geofence_level IS 'Level geofence: radius, kelurahan, kecamatan, kabupaten, provinsi';
COMMENT ON COLUMN crowdsource_projects.geofence_area_name IS 'Nama wilayah untuk level non-radius';
