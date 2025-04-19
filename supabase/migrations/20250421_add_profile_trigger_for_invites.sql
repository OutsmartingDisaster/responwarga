-- Migration: Add trigger to create profile on user signup from invite

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_with_invite_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.users metadata
AS $$
DECLARE
  org_id uuid;
  assign_role text;
BEGIN
  -- Extract data passed during invitation from raw_app_meta_data
  -- Adjust JSON path if you used different keys in your invite function
  org_id := (NEW.raw_app_meta_data ->> 'organization_id')::uuid;
  assign_role := (NEW.raw_app_meta_data ->> 'role_to_assign')::text;

  -- Only proceed if both organization_id and role_to_assign were in the invite metadata
  IF org_id IS NOT NULL AND assign_role IS NOT NULL THEN
    -- Insert a new profile for the user, linking them to the organization with the specified role
    INSERT INTO public.profiles (user_id, organization_id, role, name)
    VALUES (
      NEW.id, 
      org_id, 
      assign_role, 
      -- Use email as placeholder name initially, user can update later
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Create the trigger that calls the function after a user is created
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_invite_data(); 