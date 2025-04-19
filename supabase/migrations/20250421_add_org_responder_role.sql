-- Migration: Add 'org_responder' role to profiles table

-- Drop the existing check constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new check constraint including 'org_responder'
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin'::text, 'co-admin'::text, 'responder'::text, 'user'::text, 'org_admin'::text, 'org_responder'::text])); 