-- Migration: Add RLS policies for organizations and daily log tables

-- Enable RLS for relevant tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id uuid) -- Reverted parameter name
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = user_id; -- This correctly compares column `user_id` with parameter `user_id`
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid) -- Reverted parameter name
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = user_id AND role = 'admin' -- Correct comparison
  );
$$;

-- Helper function to get user's profile ID (integer) from auth UUID
CREATE OR REPLACE FUNCTION get_profile_id(user_id uuid) -- Reverted parameter name
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles WHERE user_id = user_id; -- Correct comparison
$$;


-- Organizations Policies
DROP POLICY IF EXISTS "Allow admin full access" ON public.organizations;
CREATE POLICY "Allow admin full access" ON public.organizations
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow org_admin to manage own organization" ON public.organizations;
CREATE POLICY "Allow org_admin to manage own organization" ON public.organizations
  FOR ALL
  USING (id = get_user_organization_id(auth.uid()))
  WITH CHECK (id = get_user_organization_id(auth.uid()));

-- Daily Logs Policies
DROP POLICY IF EXISTS "Allow admin full access" ON public.daily_logs;
CREATE POLICY "Allow admin full access" ON public.daily_logs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow org members to access own org logs" ON public.daily_logs;
CREATE POLICY "Allow org members to access own org logs" ON public.daily_logs
  FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Allow org_admin to manage own org logs" ON public.daily_logs;
CREATE POLICY "Allow org_admin to manage own org logs" ON public.daily_logs
  FOR ALL -- INSERT, UPDATE, DELETE for org_admin
  USING (organization_id = get_user_organization_id(auth.uid()))
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

-- Responder Logs Policies
DROP POLICY IF EXISTS "Allow admin full access" ON public.responder_logs;
CREATE POLICY "Allow admin full access" ON public.responder_logs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow org members to view own org responder logs" ON public.responder_logs;
CREATE POLICY "Allow org members to view own org responder logs" ON public.responder_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs dl
      WHERE dl.id = responder_logs.daily_log_id
      AND dl.organization_id = get_user_organization_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Allow responders to manage own logs" ON public.responder_logs;
CREATE POLICY "Allow responders to manage own logs" ON public.responder_logs
  FOR ALL -- INSERT, UPDATE, DELETE for own logs
  USING (responder_id = get_profile_id(auth.uid()))
  WITH CHECK (responder_id = get_profile_id(auth.uid()));


-- Inventory Logs Policies
DROP POLICY IF EXISTS "Allow admin full access" ON public.inventory_logs;
CREATE POLICY "Allow admin full access" ON public.inventory_logs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow org members to view own org inventory logs" ON public.inventory_logs;
CREATE POLICY "Allow org members to view own org inventory logs" ON public.inventory_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs dl
      WHERE dl.id = inventory_logs.daily_log_id
      AND dl.organization_id = get_user_organization_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Allow org_admin to manage own org inventory logs" ON public.inventory_logs;
CREATE POLICY "Allow org_admin to manage own org inventory logs" ON public.inventory_logs
  FOR ALL -- INSERT, UPDATE, DELETE for org_admin
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs dl
      WHERE dl.id = inventory_logs.daily_log_id
      AND dl.organization_id = get_user_organization_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_logs dl
      WHERE dl.id = inventory_logs.daily_log_id
      AND dl.organization_id = get_user_organization_id(auth.uid())
    )
  );

-- Activity Logs Policies
DROP POLICY IF EXISTS "Allow admin full access" ON public.activity_logs;
CREATE POLICY "Allow admin full access" ON public.activity_logs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow org members to view own org activity logs" ON public.activity_logs;
CREATE POLICY "Allow org members to view own org activity logs" ON public.activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs dl
      WHERE dl.id = activity_logs.daily_log_id
      AND dl.organization_id = get_user_organization_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Allow responders to manage own activity logs" ON public.activity_logs;
CREATE POLICY "Allow responders to manage own activity logs" ON public.activity_logs
  FOR ALL -- INSERT, UPDATE, DELETE for own logs
  USING (responder_id = get_profile_id(auth.uid()))
  WITH CHECK (responder_id = get_profile_id(auth.uid()));

-- Contributions Policies
DROP POLICY IF EXISTS "Public can read all contributions" ON public.contributions;
CREATE POLICY "Public can read all contributions"
  ON public.contributions
  FOR SELECT
  USING (true);

-- Create a view to restrict contact info
DROP VIEW IF EXISTS public.contributions_public CASCADE;
CREATE OR REPLACE VIEW public.contributions_public AS
SELECT
  id, latitude, longitude, contribution_type, status, description, created_at, updated_at, photo_url, address, capacity, facilities, quantity, unit, assigned_to, responder_status, assigned_organization_id, emergency_report_id, -- public fields
  CASE
    WHEN show_contact_info
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'org_admin', 'responder')
      )
    THEN full_name ELSE NULL END AS full_name,
  CASE
    WHEN show_contact_info
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'org_admin', 'responder')
      )
    THEN phone_number ELSE NULL END AS phone_number,
  CASE
    WHEN show_contact_info
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'org_admin', 'responder')
      )
    THEN email ELSE NULL END AS email
FROM public.contributions;

-- Grant select on the view to all users
GRANT SELECT ON public.contributions_public TO anon, authenticated;
