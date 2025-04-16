-- Migration: Add RLS policies for organizations and daily log tables

-- Enable RLS for relevant tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

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
