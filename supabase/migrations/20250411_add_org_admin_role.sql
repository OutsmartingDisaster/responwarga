-- Migration: Add 'org_admin' role to profiles table

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'co-admin', 'org_admin', 'responder', 'user'));
