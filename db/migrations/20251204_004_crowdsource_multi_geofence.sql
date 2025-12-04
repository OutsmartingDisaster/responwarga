-- Migration: Multi-zone Geofencing
-- Date: 2025-12-04
-- Description: Support multiple geofence zones per project

CREATE TABLE IF NOT EXISTS crowdsource_geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  -- Zone info
  zone_name VARCHAR(255) NOT NULL, -- e.g., "Provinsi Aceh", "Kota Medan"
  zone_level VARCHAR(20) CHECK (zone_level IN ('radius', 'kelurahan', 'kecamatan', 'kabupaten', 'provinsi')),
  
  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_km DECIMAL(5, 2) DEFAULT 5.0, -- for radius type
  
  -- Admin area codes (optional, for precise matching)
  admin_area_code VARCHAR(50), -- e.g., province code, regency code
  
  -- Display
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crowdsource_geofence_zones_project ON crowdsource_geofence_zones(project_id);

-- Add use_multi_zone flag to projects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crowdsource_projects' AND column_name = 'use_multi_zone'
  ) THEN
    ALTER TABLE crowdsource_projects ADD COLUMN use_multi_zone BOOLEAN DEFAULT false;
  END IF;
END $$;

COMMENT ON TABLE crowdsource_geofence_zones IS 'Multiple geofence zones for crowdsource projects';
COMMENT ON COLUMN crowdsource_projects.use_multi_zone IS 'If true, use crowdsource_geofence_zones instead of single location';
