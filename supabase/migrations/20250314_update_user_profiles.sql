-- Update profiles table to add organization and update roles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS organization VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update role type to include co-admin and responder
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'co-admin', 'responder', 'user')); 