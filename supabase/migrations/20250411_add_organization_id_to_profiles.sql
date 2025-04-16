-- Migration: Add organization_id to profiles and link to organizations table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- (Optional) Remove old organization string column if not needed
-- ALTER TABLE profiles DROP COLUMN IF EXISTS organization;
