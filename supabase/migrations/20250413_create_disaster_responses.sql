-- Migration: Create disaster_responses table for organization disaster management

CREATE TABLE IF NOT EXISTS disaster_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL, -- e.g. "Banjir Jakarta Selatan"
  type TEXT NOT NULL, -- e.g. "Banjir", "Gempa", "Kebakaran"
  location TEXT,      -- e.g. "Jakarta Selatan", or geojson/latlng in future
  status TEXT DEFAULT 'active', -- e.g. "active", "closed"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup by org
CREATE INDEX IF NOT EXISTS idx_disaster_responses_org ON disaster_responses(organization_id);
