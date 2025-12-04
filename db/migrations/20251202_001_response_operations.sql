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
