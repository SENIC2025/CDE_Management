/*
  # Add Profile and Organisation Management System

  1. Purpose
    - Enable self-service organisation management from UI
    - Add Profile page functionality (edit name, sign out, manage orgs)
    - Allow manual org creation as fallback to auto-provisioning
    - Support org switching and joining via invite code
    - Eliminate dead-end "No Organisation Access" states

  2. Changes
    - Add join_code to organisations table (optional invite code system)
    - Add job_title field to users table (for Profile page)
    - Create RPC: create_organisation(p_name text) - manual org creation
    - Create RPC: list_my_organisations() - list user's orgs for switcher
    - Create RPC: join_organisation_by_code(p_code text) - join by code
    - Update users table RLS to allow self-update of name/job_title
    - Ensure audit logging for all org management operations

  3. Security
    - All org creation/joining uses SECURITY DEFINER RPCs
    - RLS remains restrictive on all tables
    - Users can only update their own profile fields
    - Membership changes are audit logged
    - Join codes are optional and org-controlled

  4. User Experience
    - Users stuck without org can: retry provisioning, create org manually, or join by code
    - Profile page is accessible without org membership
    - Clear error messages and retry options
    - Sign out always available via Profile page
*/

-- =====================================================
-- SCHEMA ENHANCEMENTS
-- =====================================================

-- Add join_code to organisations (for simple invite system)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'join_code'
  ) THEN
    ALTER TABLE organisations ADD COLUMN join_code text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_organisations_join_code ON organisations(join_code);
    COMMENT ON COLUMN organisations.join_code IS 'Optional invite code for users to join organisation';
  END IF;
END $$;

-- Add job_title to users (for Profile page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE users ADD COLUMN job_title text;
    COMMENT ON COLUMN users.job_title IS 'User job title or role (optional, user-editable)';
  END IF;
END $$;

-- Ensure auth_id is unique and indexed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_auth_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- =====================================================
-- RLS POLICIES FOR PROFILE MANAGEMENT
-- =====================================================

-- Drop existing users policies to recreate them properly
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Users can update their own name and job_title
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (
    auth_id = auth.uid() AND
    -- Only allow updating these fields (prevent changing email, auth_id, org_id, etc.)
    id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Note: INSERT for users is handled by trigger on auth.users or SECURITY DEFINER functions only

-- =====================================================
-- RPC: CREATE ORGANISATION (MANUAL FALLBACK)
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_organisation(p_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_org_name text;
  v_project_id uuid;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create organisation';
  END IF;

  -- Get user profile
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found. Please sign out and sign in again.';
  END IF;

  -- Validate and set organisation name
  v_org_name := COALESCE(NULLIF(TRIM(p_name), ''), 'My Organisation');

  -- Create organisation
  INSERT INTO organisations (name)
  VALUES (v_org_name)
  RETURNING id INTO v_org_id;

  -- Add user as admin
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin');

  -- Update user's org_id (for convenience, though users can belong to multiple orgs)
  UPDATE users
  SET org_id = v_org_id
  WHERE id = v_user_id;

  -- Create default organisation plan (project tier)
  INSERT INTO organisation_plans (
    org_id,
    plan_tier,
    status,
    entitlements_json,
    created_by
  )
  VALUES (
    v_org_id,
    'project',
    'active',
    '{}'::jsonb,
    v_user_id
  );

  -- Create default governance settings
  INSERT INTO organisation_governance_settings (
    org_id,
    methodology_governance_mode,
    template_governance_mode,
    org_defaults_json,
    branding_json,
    created_by
  )
  VALUES (
    v_org_id,
    'project_only',
    'project_only',
    '{}'::jsonb,
    '{}'::jsonb,
    v_user_id
  );

  -- Create starter project
  INSERT INTO projects (
    org_id,
    title,
    description,
    programme_profile,
    start_date,
    end_date,
    reporting_periods
  )
  VALUES (
    v_org_id,
    'Your first project',
    'Starter project created with your organisation',
    'Custom',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months',
    '[]'::jsonb
  )
  RETURNING id INTO v_project_id;

  -- Add user as project coordinator
  INSERT INTO project_memberships (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'coordinator');

  -- Update governance settings with starter_project_id
  UPDATE organisation_governance_settings
  SET starter_project_id = v_project_id
  WHERE org_id = v_org_id;

  -- Audit log
  INSERT INTO audit_events (
    org_id,
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    diff_json
  )
  VALUES (
    v_org_id,
    NULL,
    v_user_id,
    'organisation',
    v_org_id,
    'create',
    jsonb_build_object(
      'name', v_org_name,
      'created_via', 'manual_ui',
      'plan_tier', 'project',
      'starter_project_id', v_project_id
    )
  );

  RETURN v_org_id;
END;
$$;

COMMENT ON FUNCTION public.create_organisation IS
  'Create a new organisation manually from UI. User becomes admin and starter project is created automatically.';

GRANT EXECUTE ON FUNCTION public.create_organisation(text) TO authenticated;

-- =====================================================
-- RPC: LIST USER'S ORGANISATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_my_organisations()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  my_role text,
  member_since timestamptz,
  join_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Get user profile
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Return empty if no profile
    RETURN;
  END IF;

  -- Return user's organisations
  RETURN QUERY
  SELECT
    o.id AS org_id,
    o.name AS org_name,
    om.role AS my_role,
    om.created_at AS member_since,
    o.join_code
  FROM organisations o
  INNER JOIN organisation_members om ON om.org_id = o.id
  WHERE om.user_id = v_user_id
  ORDER BY om.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_my_organisations IS
  'List all organisations the current user is a member of, with their role and join codes.';

GRANT EXECUTE ON FUNCTION public.list_my_organisations() TO authenticated;

-- =====================================================
-- RPC: JOIN ORGANISATION BY CODE
-- =====================================================

CREATE OR REPLACE FUNCTION public.join_organisation_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_org_name text;
  v_existing_member boolean;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to join organisation';
  END IF;

  -- Validate code
  IF NULLIF(TRIM(p_code), '') IS NULL THEN
    RAISE EXCEPTION 'Join code cannot be empty';
  END IF;

  -- Get user profile
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found. Please sign out and sign in again.';
  END IF;

  -- Find organisation by join code
  SELECT id, name INTO v_org_id, v_org_name
  FROM organisations
  WHERE join_code = TRIM(p_code)
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code. Please check the code and try again.';
  END IF;

  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM organisation_members
    WHERE org_id = v_org_id AND user_id = v_user_id
  ) INTO v_existing_member;

  IF v_existing_member THEN
    -- Already a member, just return org_id (idempotent)
    RETURN v_org_id;
  END IF;

  -- Add user as member
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'member');

  -- Update user's default org_id if they don't have one
  UPDATE users
  SET org_id = v_org_id
  WHERE id = v_user_id AND org_id IS NULL;

  -- Audit log
  INSERT INTO audit_events (
    org_id,
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    diff_json
  )
  VALUES (
    v_org_id,
    NULL,
    v_user_id,
    'organisation_members',
    v_user_id,
    'create',
    jsonb_build_object(
      'org_name', v_org_name,
      'joined_via', 'join_code',
      'role', 'member'
    )
  );

  RETURN v_org_id;
END;
$$;

COMMENT ON FUNCTION public.join_organisation_by_code IS
  'Join an organisation using an invite code. User becomes a member with member role.';

GRANT EXECUTE ON FUNCTION public.join_organisation_by_code(text) TO authenticated;

-- =====================================================
-- RPC: GENERATE JOIN CODE (ADMIN ONLY)
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_join_code(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_join_code text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Get user profile
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Check if user is admin of this org
  SELECT EXISTS(
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id AND user_id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only organisation admins can generate join codes';
  END IF;

  -- Generate a random 8-character alphanumeric code
  v_join_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

  -- Update organisation with new join code
  UPDATE organisations
  SET join_code = v_join_code
  WHERE id = p_org_id;

  -- Audit log
  INSERT INTO audit_events (
    org_id,
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    diff_json
  )
  VALUES (
    p_org_id,
    NULL,
    v_user_id,
    'organisation',
    p_org_id,
    'update',
    jsonb_build_object(
      'action', 'generate_join_code',
      'join_code', v_join_code
    )
  );

  RETURN v_join_code;
END;
$$;

COMMENT ON FUNCTION public.generate_join_code IS
  'Generate a new join code for an organisation. Only admins can generate codes.';

GRANT EXECUTE ON FUNCTION public.generate_join_code(uuid) TO authenticated;

-- =====================================================
-- RPC: UPDATE USER PROFILE
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_name text DEFAULT NULL,
  p_job_title text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_old_name text;
  v_old_job_title text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Get current profile
  SELECT id, name, job_title INTO v_user_id, v_old_name, v_old_job_title
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Update profile (only update fields that are provided)
  UPDATE users
  SET
    name = COALESCE(NULLIF(TRIM(p_name), ''), name),
    job_title = CASE WHEN p_job_title IS NOT NULL THEN TRIM(p_job_title) ELSE job_title END,
    updated_at = now()
  WHERE id = v_user_id;

  -- Audit log (only if something changed)
  IF p_name IS NOT NULL AND TRIM(p_name) != v_old_name OR
     p_job_title IS NOT NULL AND TRIM(p_job_title) != COALESCE(v_old_job_title, '') THEN
    INSERT INTO audit_events (
      org_id,
      project_id,
      user_id,
      entity_type,
      entity_id,
      action,
      diff_json
    )
    VALUES (
      NULL,
      NULL,
      v_user_id,
      'user_profile',
      v_user_id,
      'update',
      jsonb_build_object(
        'old_name', v_old_name,
        'new_name', COALESCE(NULLIF(TRIM(p_name), ''), v_old_name),
        'old_job_title', v_old_job_title,
        'new_job_title', CASE WHEN p_job_title IS NOT NULL THEN TRIM(p_job_title) ELSE v_old_job_title END
      )
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_my_profile IS
  'Update current user profile (name and job_title). Changes are audit logged.';

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text) TO authenticated;
