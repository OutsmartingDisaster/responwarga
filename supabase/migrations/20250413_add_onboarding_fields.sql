-- Migration: Add onboarding fields to organizations table

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS map_location TEXT,
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Add index for slug
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
