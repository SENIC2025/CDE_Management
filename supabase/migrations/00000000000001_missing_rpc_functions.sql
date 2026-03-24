-- =====================================================
-- MISSING RPC FUNCTIONS FOR CDE MANAGER
-- Fix #7: Workspace Auto-Setup + Session Memory
-- =====================================================

-- =====================================================
-- SCHEMA ALIGNMENT: Rename columns to match frontend
-- Base schema uses 'name' but frontend expects 'full_name' / 'title'
-- These are safe: IF NOT EXISTS / IF EXISTS checks prevent errors
-- =====================================================

-- Rename users.name → users.full_name (frontend uses full_name everywhere)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.users RENAME COLUMN name TO full_name;
  END IF;
END $$;

-- Rename projects.name → projects.title (frontend uses title everywhere)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.projects RENAME COLUMN name TO title;
  END IF;
END $$;

-- Fix: Add missing eu_compliance_enabled column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eu_compliance_enabled boolean DEFAULT false;

-- =====================================================
-- 0. handle_new_auth_user() trigger
-- Auto-creates public.users row when auth.users row is created
-- Uses full_name (renamed from name)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate trigger (safe: drops if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- =====================================================
-- 1. create_organisation(p_name)
-- Called from: Profile.tsx, WorkspaceRecovery.tsx
-- Creates org, adds user as admin, sets up plan
-- =====================================================
CREATE OR REPLACE FUNCTION create_organisation(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  -- Get the current user
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Create the organisation
  INSERT INTO organisations (name)
  VALUES (p_name)
  RETURNING id INTO v_org_id;

  -- Update user's org_id
  UPDATE users
  SET org_id = v_org_id, updated_at = now()
  WHERE id = v_user_id;

  -- Add user as org admin
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- Create default org plan
  INSERT INTO organisation_plans (org_id, plan_tier)
  VALUES (v_org_id, 'project')
  ON CONFLICT (org_id) DO NOTHING;

  -- Create default governance settings
  INSERT INTO organisation_governance_settings (org_id)
  VALUES (v_org_id)
  ON CONFLICT (org_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

-- =====================================================
-- 2. provision_first_workspace()
-- Called from: OrganisationContext.tsx
-- Creates org + first project for new users
-- FIXED: uses full_name (users) and title (projects)
-- =====================================================
CREATE OR REPLACE FUNCTION provision_first_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_org_id uuid;
  v_project_id uuid;
  v_auth_email text;
BEGIN
  -- Ensure authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to provision workspace';
  END IF;

  -- Get or create user profile
  SELECT id, full_name, org_id INTO v_user_id, v_user_name, v_org_id
  FROM users
  WHERE auth_id = auth.uid();

  -- Auto-create profile if trigger didn't fire
  IF v_user_id IS NULL THEN
    SELECT email INTO v_auth_email FROM auth.users WHERE id = auth.uid();

    INSERT INTO users (auth_id, full_name, email)
    VALUES (
      auth.uid(),
      COALESCE(split_part(v_auth_email, '@', 1), 'User'),
      COALESCE(v_auth_email, 'unknown@example.com')
    )
    ON CONFLICT (auth_id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = now()
    RETURNING id, full_name INTO v_user_id, v_user_name;
  END IF;

  -- If user already has an org, check for projects
  IF v_org_id IS NOT NULL THEN
    SELECT id INTO v_project_id
    FROM projects
    WHERE org_id = v_org_id
    LIMIT 1;

    IF v_project_id IS NOT NULL THEN
      RETURN v_project_id;
    END IF;
  END IF;

  -- Create organisation if needed
  IF v_org_id IS NULL THEN
    INSERT INTO organisations (name)
    VALUES (COALESCE(v_user_name, 'My') || '''s Organisation')
    RETURNING id INTO v_org_id;

    UPDATE users
    SET org_id = v_org_id, updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO organisation_members (org_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'admin')
    ON CONFLICT (org_id, user_id) DO NOTHING;

    INSERT INTO organisation_plans (org_id, plan_tier)
    VALUES (v_org_id, 'project')
    ON CONFLICT (org_id) DO NOTHING;

    INSERT INTO organisation_governance_settings (org_id)
    VALUES (v_org_id)
    ON CONFLICT (org_id) DO NOTHING;
  END IF;

  -- Create first project (uses 'title' column)
  INSERT INTO projects (org_id, title, description, status)
  VALUES (v_org_id, 'Your first project', 'Welcome to CDE Manager! Rename and customise this project to get started.', 'active')
  RETURNING id INTO v_project_id;

  -- Add user as project admin
  INSERT INTO project_memberships (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'admin')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN v_project_id;
END;
$$;

-- =====================================================
-- 2b. bootstrap_user_organisation(p_org_name)
-- Called from: AuthContext.tsx
-- Creates org for user who has no org_id
-- =====================================================
CREATE OR REPLACE FUNCTION bootstrap_user_organisation(p_org_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_user_email text;
  v_org_id uuid;
  v_org_name text;
BEGIN
  -- Get the current user
  SELECT id, full_name, email, org_id INTO v_user_id, v_user_name, v_user_email, v_org_id
  FROM users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- If user already has an org, return it
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- Determine org name
  v_org_name := COALESCE(
    p_org_name,
    COALESCE(v_user_name, split_part(v_user_email, '@', 1), 'My') || '''s Organisation'
  );

  -- Create organisation
  INSERT INTO organisations (name)
  VALUES (v_org_name)
  RETURNING id INTO v_org_id;

  -- Update user's org_id
  UPDATE users
  SET org_id = v_org_id, updated_at = now()
  WHERE id = v_user_id;

  -- Add user as admin
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- Create default plan
  INSERT INTO organisation_plans (org_id, plan_tier)
  VALUES (v_org_id, 'project')
  ON CONFLICT (org_id) DO NOTHING;

  -- Create default governance
  INSERT INTO organisation_governance_settings (org_id)
  VALUES (v_org_id)
  ON CONFLICT (org_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.bootstrap_user_organisation(text) TO authenticated;

-- =====================================================
-- 3. list_my_organisations()
-- Called from: Profile.tsx
-- Returns all orgs the current user belongs to
-- =====================================================
CREATE OR REPLACE FUNCTION list_my_organisations()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  my_role text,
  member_since timestamptz,
  join_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid();

  RETURN QUERY
  SELECT
    o.id AS org_id,
    o.name AS org_name,
    om.role AS my_role,
    om.created_at AS member_since,
    NULL::text AS join_code
  FROM organisation_members om
  JOIN organisations o ON o.id = om.org_id
  WHERE om.user_id = v_user_id
  ORDER BY om.created_at;
END;
$$;

-- =====================================================
-- 4. update_my_profile(p_name, p_job_title)
-- Called from: Profile.tsx
-- Updates the current user's profile
-- FIXED: uses full_name column
-- =====================================================
CREATE OR REPLACE FUNCTION update_my_profile(p_name text DEFAULT NULL, p_job_title text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET
    full_name = COALESCE(p_name, full_name),
    updated_at = now()
  WHERE auth_id = auth.uid();
END;
$$;

-- =====================================================
-- 5. join_organisation_by_code(p_code)
-- Called from: Profile.tsx
-- Joins an org using an invite code
-- =====================================================

-- First ensure join_codes table exists
CREATE TABLE IF NOT EXISTS organisation_join_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid REFERENCES users(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION join_organisation_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Find org by join code
  SELECT org_id INTO v_org_id
  FROM organisation_join_codes
  WHERE code = p_code
  AND (expires_at IS NULL OR expires_at > now());

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired join code';
  END IF;

  -- Update user's org
  UPDATE users
  SET org_id = v_org_id, updated_at = now()
  WHERE id = v_user_id;

  -- Add as org member
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'member')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

-- =====================================================
-- 6. generate_join_code(p_org_id)
-- Called from: Profile.tsx
-- Generates an invite code for an org
-- =====================================================
CREATE OR REPLACE FUNCTION generate_join_code(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_code text;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid();

  -- Verify user is admin of the org
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id
    AND user_id = v_user_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only org admins can generate join codes';
  END IF;

  -- Generate a unique code
  v_code := upper(substr(md5(random()::text || now()::text), 1, 8));

  -- Remove existing codes for this org
  DELETE FROM organisation_join_codes WHERE org_id = p_org_id;

  -- Insert new code
  INSERT INTO organisation_join_codes (org_id, code, created_by, expires_at)
  VALUES (p_org_id, v_code, v_user_id, now() + interval '7 days');

  RETURN v_code;
END;
$$;

-- =====================================================
-- 7. create_project_objective_from_library(...)
-- Called from: projectObjectivesService.ts
-- Creates a project objective from the library
-- =====================================================
CREATE OR REPLACE FUNCTION create_project_objective_from_library(
  p_project_id uuid,
  p_objective_lib_id uuid,
  p_priority text DEFAULT 'medium',
  p_stakeholder_types text[] DEFAULT '{}',
  p_time_horizon text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source text DEFAULT 'library'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_lib_title text;
  v_lib_desc text;
  v_objective_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid();

  -- Get library objective details
  SELECT title, description INTO v_lib_title, v_lib_desc
  FROM objective_library
  WHERE id = p_objective_lib_id;

  IF v_lib_title IS NULL THEN
    RAISE EXCEPTION 'Objective not found in library';
  END IF;

  -- Create the project objective
  INSERT INTO project_objectives (
    project_id, title, description, owner,
    kpis
  )
  VALUES (
    p_project_id,
    v_lib_title,
    COALESCE(v_lib_desc, ''),
    v_user_id::text,
    jsonb_build_object(
      'priority', p_priority,
      'stakeholder_types', to_jsonb(p_stakeholder_types),
      'time_horizon', p_time_horizon,
      'notes', p_notes,
      'source', p_source,
      'library_id', p_objective_lib_id
    )
  )
  RETURNING id INTO v_objective_id;

  RETURN v_objective_id;
END;
$$;

-- =====================================================
-- 8. log_frontend_error(...)
-- Called from: ErrorBoundary.tsx
-- Logs frontend errors (non-critical, best effort)
-- =====================================================
CREATE OR REPLACE FUNCTION log_frontend_error(
  p_error_message text DEFAULT NULL,
  p_error_stack text DEFAULT NULL,
  p_component_stack text DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_events (
    user_id,
    entity_type,
    action,
    details
  )
  VALUES (
    (SELECT id FROM users WHERE auth_id = auth.uid()),
    'frontend',
    'error',
    jsonb_build_object(
      'message', p_error_message,
      'stack', p_error_stack,
      'component_stack', p_component_stack,
      'url', p_url,
      'user_agent', p_user_agent
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently fail - logging errors should never break the app
  NULL;
END;
$$;

-- =====================================================
-- 9. get_platform_org_summary()
-- Called from: PlatformAdmin.tsx
-- Returns org stats for platform admin
-- =====================================================
CREATE OR REPLACE FUNCTION get_platform_org_summary()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  member_count bigint,
  project_count bigint,
  plan_tier text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify platform admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id AS org_id,
    o.name AS org_name,
    (SELECT count(*) FROM organisation_members om WHERE om.org_id = o.id) AS member_count,
    (SELECT count(*) FROM projects p WHERE p.org_id = o.id) AS project_count,
    (SELECT op.plan_tier FROM organisation_plans op WHERE op.org_id = o.id LIMIT 1) AS plan_tier,
    o.created_at
  FROM organisations o
  ORDER BY o.created_at DESC;
END;
$$;

-- =====================================================
-- 10. get_platform_project_summary(p_org_id)
-- Called from: PlatformAdmin.tsx
-- FIXED: uses p.title (renamed from p.name)
-- =====================================================
CREATE OR REPLACE FUNCTION get_platform_project_summary(p_org_id uuid DEFAULT NULL)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  org_name text,
  member_count bigint,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS project_id,
    p.title AS project_name,
    o.name AS org_name,
    (SELECT count(*) FROM project_memberships pm WHERE pm.project_id = p.id) AS member_count,
    p.status,
    p.created_at
  FROM projects p
  JOIN organisations o ON o.id = p.org_id
  WHERE (p_org_id IS NULL OR p.org_id = p_org_id)
  ORDER BY p.created_at DESC;
END;
$$;

-- =====================================================
-- 11. get_platform_audit_events(p_limit, p_offset)
-- Called from: PlatformAdmin.tsx
-- =====================================================
CREATE OR REPLACE FUNCTION get_platform_audit_events(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_email text,
  entity_type text,
  action text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    ae.id,
    u.email AS user_email,
    ae.entity_type,
    ae.action,
    ae.details,
    ae.timestamp AS created_at
  FROM audit_events ae
  LEFT JOIN users u ON u.id = ae.user_id
  ORDER BY ae.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 12. get_org_support_bundle(p_org_id)
-- Called from: PlatformAdmin.tsx
-- =====================================================
CREATE OR REPLACE FUNCTION get_org_support_bundle(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'organisation', (SELECT row_to_json(o) FROM organisations o WHERE o.id = p_org_id),
    'member_count', (SELECT count(*) FROM organisation_members om WHERE om.org_id = p_org_id),
    'project_count', (SELECT count(*) FROM projects p WHERE p.org_id = p_org_id),
    'plan', (SELECT row_to_json(op) FROM organisation_plans op WHERE op.org_id = p_org_id LIMIT 1),
    'recent_audit_events', (
      SELECT coalesce(jsonb_agg(row_to_json(ae)), '[]'::jsonb)
      FROM (
        SELECT ae.* FROM audit_events ae
        WHERE ae.project_id IN (SELECT p.id FROM projects p WHERE p.org_id = p_org_id)
        ORDER BY ae.timestamp DESC LIMIT 20
      ) ae
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 13. MISSING RLS POLICIES ON organisations TABLE
-- The base schema enables RLS but defines NO SELECT policy!
-- This causes all direct queries (including JOINs from
-- organisation_members) to return zero rows for the
-- organisations table, breaking the entire org-load flow.
-- =====================================================

-- Allow users to see organisations they belong to
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organisations'
    AND policyname = 'Users can view their organisations'
  ) THEN
    CREATE POLICY "Users can view their organisations"
      ON organisations FOR SELECT
      TO authenticated
      USING (
        id IN (SELECT org_id FROM users WHERE auth_id = auth.uid())
        OR id IN (SELECT org_id FROM organisation_members
                  WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
      );
  END IF;
END $$;

-- Allow authenticated users to create organisations (needed for signup flow)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organisations'
    AND policyname = 'Authenticated users can create organisations'
  ) THEN
    CREATE POLICY "Authenticated users can create organisations"
      ON organisations FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Allow org admins to update their organisation
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organisations'
    AND policyname = 'Org admins can update organisations'
  ) THEN
    CREATE POLICY "Org admins can update organisations"
      ON organisations FOR UPDATE
      TO authenticated
      USING (
        id IN (
          SELECT org_id FROM organisation_members
          WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
          AND role = 'admin'
        )
      );
  END IF;
END $$;

-- =====================================================
-- 14. MISSING RLS POLICIES ON audit_events TABLE
-- audit_events has RLS enabled but no INSERT policy
-- for authenticated users, breaking audit trail writes.
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_events'
    AND policyname = 'Authenticated users can insert audit events'
  ) THEN
    CREATE POLICY "Authenticated users can insert audit events"
      ON audit_events FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_events'
    AND policyname = 'Users can view audit events for their projects'
  ) THEN
    CREATE POLICY "Users can view audit events for their projects"
      ON audit_events FOR SELECT
      TO authenticated
      USING (
        project_id IN (
          SELECT project_id FROM project_memberships
          WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
        OR user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

-- =====================================================
-- 15. MISSING RLS POLICIES ON users TABLE
-- users table needs UPDATE policy for profile edits
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON users FOR UPDATE
      TO authenticated
      USING (auth_id = auth.uid())
      WITH CHECK (auth_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- 16. ADD MISSING COLUMNS TO project_objectives TABLE
-- The base schema only has: id, project_id, objective_id,
-- title, description, owner, kpis, created_at, updated_at
-- Frontend needs: status, priority, domain, notes,
-- means_of_verification for full objective management.
-- =====================================================

ALTER TABLE project_objectives ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE project_objectives ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE project_objectives ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE project_objectives ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE project_objectives ADD COLUMN IF NOT EXISTS means_of_verification jsonb DEFAULT '[]'::jsonb;
ALTER TABLE project_objectives ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- =====================================================
-- DONE
-- =====================================================
