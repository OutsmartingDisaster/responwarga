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

CREATE TRIGGER trigger_crowdsource_projects_updated_at
  BEFORE UPDATE ON crowdsource_projects
  FOR EACH ROW EXECUTE FUNCTION update_crowdsource_updated_at();

CREATE TRIGGER trigger_crowdsource_settings_updated_at
  BEFORE UPDATE ON crowdsource_settings
  FOR EACH ROW EXECUTE FUNCTION update_crowdsource_updated_at();
