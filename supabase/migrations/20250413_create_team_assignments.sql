-- Migration: Create team_assignments table for assigning team members to emergency response locations

CREATE TABLE IF NOT EXISTS team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id integer REFERENCES profiles(id),
  organization_id uuid REFERENCES organizations(id),
  location_name TEXT NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_team_assignments_org ON team_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_profile ON team_assignments(profile_id);
