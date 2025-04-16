-- Migration: Create organizations table for whitelabel/multi-tenant support

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  description TEXT,
  theme JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for fast lookup by name
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
