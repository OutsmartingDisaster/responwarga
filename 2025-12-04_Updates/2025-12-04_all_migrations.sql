-- Migration: Response Operations System
-- Date: 2025-12-02
-- Description: Create tables for response operations, team members, field reports, assignments, and notifications

-- ============================================
-- 1. Response Operations Table
-- ============================================
CREATE TABLE IF NOT EXISTS response_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Operation Info
  name VARCHAR(255) NOT NULL,
  disaster_type VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Disaster Location
  disaster_location_name VARCHAR(255) NOT NULL,
  disaster_lat DECIMAL(10, 8) NOT NULL,
  disaster_lng DECIMAL(11, 8) NOT NULL,
  disaster_radius_km DECIMAL(5, 2) DEFAULT 10,
  
  -- Posko Location
  posko_name VARCHAR(255),
  posko_address TEXT,
  posko_lat DECIMAL(10, 8),
  posko_lng DECIMAL(11, 8),
  
  -- Status & Timestamps
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
  created_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for response_operations
CREATE INDEX IF NOT EXISTS idx_response_ops_org ON response_operations(organization_id);
CREATE INDEX IF NOT EXISTS idx_response_ops_status ON response_operations(status);
CREATE INDEX IF NOT EXISTS idx_response_ops_disaster ON response_operations(disaster_type);
CREATE INDEX IF NOT EXISTS idx_response_ops_location ON response_operations(disaster_lat, disaster_lng);

-- ============================================
-- 2. Response Team Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS response_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_operation_id UUID NOT NULL REFERENCES response_operations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'responder' CHECK (role IN ('coordinator', 'responder')),
  status VARCHAR(50) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  
  UNIQUE(response_operation_id, user_id)
);

-- Indexes for response_team_members
CREATE INDEX IF NOT EXISTS idx_team_members_user ON response_team_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_operation ON response_team_members(response_operation_id);

-- ============================================
-- 3. Field Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_operation_id UUID NOT NULL REFERENCES response_operations(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES users(id),
  
  -- Category
  category VARCHAR(50) NOT NULL CHECK (category IN ('aid_delivery', 'field_condition', 'incident')),
  subcategory VARCHAR(100),
  
  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Location
  location_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metrics (optional based on category)
  severity VARCHAR(50) CHECK (severity IN ('mild', 'moderate', 'severe')),
  urgency VARCHAR(50) CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  affected_count INTEGER,
  quantity_delivered VARCHAR(255),
  
  -- Media
  photos TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for field_reports
CREATE INDEX IF NOT EXISTS idx_field_reports_operation ON field_reports(response_operation_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_reporter ON field_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_field_reports_category ON field_reports(category);

-- ============================================
-- 4. Report Assignments Table
-- ============================================
CREATE TABLE IF NOT EXISTS report_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES emergency_reports(id) ON DELETE CASCADE,
  response_operation_id UUID NOT NULL REFERENCES response_operations(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'declined')),
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  notes TEXT,
  response_notes TEXT,
  
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  UNIQUE(report_id, assigned_to)
);

-- Indexes for report_assignments
CREATE INDEX IF NOT EXISTS idx_assignments_assignee ON report_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_assignments_report ON report_assignments(report_id);
CREATE INDEX IF NOT EXISTS idx_assignments_operation ON report_assignments(response_operation_id);

-- ============================================
-- 5. Notifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Reference to related entity
  reference_type VARCHAR(50),
  reference_id UUID,
  
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================
-- 6. Add Dispatch Columns to Emergency Reports
-- ============================================
ALTER TABLE emergency_reports 
  ADD COLUMN IF NOT EXISTS dispatched_to UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50) DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Add constraint for dispatch_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emergency_reports_dispatch_status_check'
  ) THEN
    ALTER TABLE emergency_reports 
      ADD CONSTRAINT emergency_reports_dispatch_status_check 
      CHECK (dispatch_status IN ('unassigned', 'dispatched', 'acknowledged', 'assigned', 'in_progress', 'resolved'));
  END IF;
END $$;

-- Indexes for dispatch queries
CREATE INDEX IF NOT EXISTS idx_reports_dispatch_status ON emergency_reports(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_reports_dispatched_to ON emergency_reports(dispatched_to);
CREATE INDEX IF NOT EXISTS idx_reports_location ON emergency_reports(latitude, longitude);

-- ============================================
-- 7. Add Dispatch Columns to Contributions
-- ============================================
ALTER TABLE contributions 
  ADD COLUMN IF NOT EXISTS dispatched_to UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50) DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Add constraint for dispatch_status on contributions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contributions_dispatch_status_check'
  ) THEN
    ALTER TABLE contributions 
      ADD CONSTRAINT contributions_dispatch_status_check 
      CHECK (dispatch_status IN ('unassigned', 'dispatched', 'acknowledged', 'connected'));
  END IF;
END $$;

-- Indexes for contributions dispatch
CREATE INDEX IF NOT EXISTS idx_contributions_dispatch_status ON contributions(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_contributions_dispatched_to ON contributions(dispatched_to);

-- ============================================
-- 8. Helper Function: Find Operations Within Radius
-- ============================================
CREATE OR REPLACE FUNCTION find_operations_within_radius(
  p_lat DECIMAL(10, 8),
  p_lng DECIMAL(11, 8)
)
RETURNS TABLE (
  operation_id UUID,
  organization_id UUID,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ro.id as operation_id,
    ro.organization_id,
    (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(ro.disaster_lat)) *
        cos(radians(ro.disaster_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(ro.disaster_lat))
      )
    )::DECIMAL as distance_km
  FROM response_operations ro
  WHERE ro.status = 'active'
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(ro.disaster_lat)) *
        cos(radians(ro.disaster_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(ro.disaster_lat))
      )
    ) <= ro.disaster_radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Trigger: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to response_operations
DROP TRIGGER IF EXISTS update_response_operations_updated_at ON response_operations;
CREATE TRIGGER update_response_operations_updated_at
  BEFORE UPDATE ON response_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to field_reports
DROP TRIGGER IF EXISTS update_field_reports_updated_at ON field_reports;
CREATE TRIGGER update_field_reports_updated_at
  BEFORE UPDATE ON field_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Migration: Crowdsourcing System
-- Date: 2025-12-04
-- Description: Create tables for crowdsource projects, submissions, moderators, and settings

-- ============================================
-- 1. Crowdsource Projects Table
-- ============================================
CREATE TABLE IF NOT EXISTS crowdsource_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  disaster_type VARCHAR(50), -- flood, earthquake, fire, landslide, etc
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  
  -- Location & Geofencing
  location_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius_km DECIMAL(5, 2) DEFAULT 5.0,
  geofence_level VARCHAR(20) DEFAULT 'radius' CHECK (geofence_level IN ('radius', 'kelurahan', 'kecamatan', 'kabupaten', 'provinsi')),
  geofence_area_name VARCHAR(255), -- nama wilayah untuk level non-radius
  geofence_polygon JSONB, -- for irregular areas [{lat, lng}, ...]
  
  -- Settings
  allow_photo BOOLEAN DEFAULT true,
  allow_video BOOLEAN DEFAULT true,
  max_file_size_mb INT DEFAULT 10,
  require_location BOOLEAN DEFAULT true,
  auto_approve BOOLEAN DEFAULT false,
  
  -- Metadata
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crowdsource_projects_status ON crowdsource_projects(status);
CREATE INDEX IF NOT EXISTS idx_crowdsource_projects_location ON crowdsource_projects(latitude, longitude);

-- ============================================
-- 2. Crowdsource Submissions Table
-- ============================================
CREATE TABLE IF NOT EXISTS crowdsource_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  -- Submitter info (REQUIRED)
  submitter_name VARCHAR(100) NOT NULL,
  submitter_email VARCHAR(255) NOT NULL,
  submitter_whatsapp VARCHAR(20) NOT NULL,
  
  -- Content
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('photo', 'video')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT NOT NULL,
  
  -- Location of incident (from minimap, not sender location)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  address_detail TEXT,
  
  -- Verification
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  device_info JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_caption_length CHECK (LENGTH(caption) >= 20)
);

CREATE INDEX IF NOT EXISTS idx_crowdsource_submissions_project ON crowdsource_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_crowdsource_submissions_status ON crowdsource_submissions(status);
CREATE INDEX IF NOT EXISTS idx_crowdsource_submissions_location ON crowdsource_submissions(latitude, longitude);

-- ============================================
-- 3. Crowdsource Moderators Table
-- ============================================
CREATE TABLE IF NOT EXISTS crowdsource_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  -- Permissions
  can_approve BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_flag BOOLEAN DEFAULT true,
  can_export BOOLEAN DEFAULT false,
  
  -- Invitation
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_crowdsource_moderators_project ON crowdsource_moderators(project_id);
CREATE INDEX IF NOT EXISTS idx_crowdsource_moderators_user ON crowdsource_moderators(user_id);

-- ============================================
-- 4. Crowdsource Moderator Invites Table
-- ============================================
CREATE TABLE IF NOT EXISTS crowdsource_moderator_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  
  -- Permissions to grant
  can_approve BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_flag BOOLEAN DEFAULT true,
  can_export BOOLEAN DEFAULT false,
  
  -- Invite details
  invite_token VARCHAR(64) UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(project_id, email)
);

CREATE INDEX IF NOT EXISTS idx_crowdsource_invites_token ON crowdsource_moderator_invites(invite_token);

-- ============================================
-- 5. Crowdsource Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS crowdsource_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO crowdsource_settings (key, value) VALUES
  ('default_geofence_radius_km', '5'),
  ('max_submissions_per_user', '10'),
  ('allowed_file_types', '["image/jpeg", "image/png", "video/mp4"]'),
  ('moderation_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 6. Update Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_crowdsource_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_crowdsource_projects_updated_at ON crowdsource_projects;
CREATE TRIGGER trigger_crowdsource_projects_updated_at
  BEFORE UPDATE ON crowdsource_projects
  FOR EACH ROW EXECUTE FUNCTION update_crowdsource_updated_at();

DROP TRIGGER IF EXISTS trigger_crowdsource_settings_updated_at ON crowdsource_settings;
CREATE TRIGGER trigger_crowdsource_settings_updated_at
  BEFORE UPDATE ON crowdsource_settings
  FOR EACH ROW EXECUTE FUNCTION update_crowdsource_updated_at();
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
-- Migration: Map Layers for Crowdsource Projects
-- Date: 2025-12-04
-- Description: Support orthophoto overlays and analysis layers

-- Map layers table
CREATE TABLE IF NOT EXISTS crowdsource_map_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  -- Layer info
  layer_name VARCHAR(255) NOT NULL,
  layer_type VARCHAR(50) NOT NULL CHECK (layer_type IN ('orthophoto', 'geotiff', 'geojson', 'analysis', 'boundary')),
  description TEXT,
  
  -- Source
  source_url TEXT, -- URL to GeoTIFF, GeoJSON, or tile server
  source_type VARCHAR(50) CHECK (source_type IN ('file', 'url', 'tiles', 'wms')),
  
  -- Bounds (for positioning)
  bounds_north DECIMAL(10, 8),
  bounds_south DECIMAL(10, 8),
  bounds_east DECIMAL(11, 8),
  bounds_west DECIMAL(11, 8),
  
  -- Display
  opacity DECIMAL(3, 2) DEFAULT 0.7,
  z_index INT DEFAULT 1,
  is_visible BOOLEAN DEFAULT true,
  is_default_on BOOLEAN DEFAULT false, -- Show by default when page loads
  
  -- Metadata
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_layers_project ON crowdsource_map_layers(project_id);

-- Regional statistics view (for dashboard per daerah)
CREATE TABLE IF NOT EXISTS crowdsource_regional_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  region_name VARCHAR(255) NOT NULL,
  region_level VARCHAR(20) CHECK (region_level IN ('provinsi', 'kabupaten', 'kecamatan', 'kelurahan')),
  region_code VARCHAR(50),
  
  -- Stats (updated periodically or via trigger)
  total_submissions INT DEFAULT 0,
  photo_count INT DEFAULT 0,
  video_count INT DEFAULT 0,
  approved_count INT DEFAULT 0,
  pending_count INT DEFAULT 0,
  
  -- Bounds for map focus
  center_lat DECIMAL(10, 8),
  center_lng DECIMAL(11, 8),
  
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regional_stats_project ON crowdsource_regional_stats(project_id);

COMMENT ON TABLE crowdsource_map_layers IS 'Map overlay layers like orthophoto, GeoTIFF, analysis polygons';
COMMENT ON TABLE crowdsource_regional_stats IS 'Aggregated statistics per region for dashboard';
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
-- Migration: Add consent_publish_name column
-- Date: 2025-12-04
-- Description: Track if contributor consents to having their name published

ALTER TABLE crowdsource_submissions 
ADD COLUMN IF NOT EXISTS consent_publish_name BOOLEAN DEFAULT false;

COMMENT ON COLUMN crowdsource_submissions.consent_publish_name IS 'Whether the contributor consents to having their name displayed publicly';
