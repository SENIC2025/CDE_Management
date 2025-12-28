/*
  # Complete First-Time Provisioning System

  1. New Functions
    - provision_first_workspace() - Auto-creates org + first project for new users
      - Creates organisation if user has none
      - Assigns user as org admin
      - Creates "Your first project" if user has no projects
      - Assigns user as project coordinator
      - Returns project_id
      - Idempotent and safe to call multiple times

  2. Platform Admin Infrastructure
    - platform_admins table - Tracks platform super admins
    - is_platform_admin() - Helper to check if current user is platform admin
    - Platform monitoring RPCs for cross-org visibility

  3. Security
    - All functions use SECURITY DEFINER to bypass RLS during provisioning
    - Comprehensive audit logging for all provisioning actions
    - Platform admin actions are explicitly logged
*/

-- =====================================================
-- PROVISIONING RPC: AUTO-CREATE ORG + FIRST PROJECT
-- =====================================================

CREATE OR REPLACE FUNCTION public.provision_first_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_project_id uuid;
  v_user_email text;
  v_existing_project_count int;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to provision workspace';
  END IF;

  -- Get the user record
  SELECT id, email INTO v_user_id, v_user_email
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Find or create organisation
  SELECT om.org_id INTO v_org_id
  FROM organisation_members om
  WHERE om.user_id = v_user_id
  ORDER BY om.created_at DESC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- Create new organisation
    INSERT INTO organisations (name)
    VALUES (COALESCE(split_part(v_user_email, '@', 1) || '''s Organisation', 'My Organisation'))
    RETURNING id INTO v_org_id;

    -- Update user with org_id
    UPDATE users
    SET org_id = v_org_id
    WHERE id = v_user_id;

    -- Add user as admin
    INSERT INTO organisation_members (org_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'admin')
    ON CONFLICT DO NOTHING;

    -- Create default organisation plan
    INSERT INTO organisation_plans (
      org_id,
      plan_tier,
      max_projects,
      max_users,
      storage_gb,
      api_calls_per_month,
      features
    )
    VALUES (
      v_org_id,
      'starter',
      3,
      5,
      10,
      10000,
      '["basic_reports", "email_support"]'::jsonb
    )
    ON CONFLICT (org_id) DO NOTHING;

    -- Create default governance settings
    INSERT INTO organisation_governance_settings (
      org_id,
      require_approval_for_project_creation,
      require_mfa_for_admins,
      password_policy,
      session_timeout_minutes,
      allowed_domains
    )
    VALUES (
      v_org_id,
      false,
      false,
      'standard',
      480,
      NULL
    )
    ON CONFLICT (org_id) DO NOTHING;

    -- Audit org creation
    INSERT INTO audit_events (
      org_id,
      project_id,
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    )
    VALUES (
      v_org_id,
      NULL,
      v_user_id,
      'provisioning',
      v_org_id,
      'create',
      jsonb_build_object(
        'stage', 'organisation',
        'org_name', COALESCE(split_part(v_user_email, '@', 1) || '''s Organisation', 'My Organisation'),
        'auto_provisioned', true
      )
    );
  END IF;

  -- Check if user has any projects in this org
  SELECT COUNT(*) INTO v_existing_project_count
  FROM project_memberships pm
  JOIN projects p ON p.id = pm.project_id
  WHERE pm.user_id = v_user_id
    AND p.org_id = v_org_id;

  IF v_existing_project_count = 0 THEN
    -- Create first project
    INSERT INTO projects (
      org_id,
      title,
      description,
      programme_profile,
      start_date,
      end_date,
      status,
      reporting_periods
    )
    VALUES (
      v_org_id,
      'Your first project',
      'Auto-created starter project. You can rename and edit it later.',
      'Custom',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '12 months',
      'active',
      '[]'::jsonb
    )
    RETURNING id INTO v_project_id;

    -- Add user as project coordinator
    INSERT INTO project_memberships (project_id, user_id, role)
    VALUES (v_project_id, v_user_id, 'coordinator')
    ON CONFLICT DO NOTHING;

    -- Audit project creation
    INSERT INTO audit_events (
      org_id,
      project_id,
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    )
    VALUES (
      v_org_id,
      v_project_id,
      v_user_id,
      'provisioning',
      v_project_id,
      'create',
      jsonb_build_object(
        'stage', 'project',
        'project_title', 'Your first project',
        'auto_provisioned', true
      )
    );
  ELSE
    -- Return existing project
    SELECT p.id INTO v_project_id
    FROM projects p
    JOIN project_memberships pm ON pm.project_id = p.id
    WHERE pm.user_id = v_user_id
      AND p.org_id = v_org_id
    ORDER BY p.created_at DESC
    LIMIT 1;
  END IF;

  RETURN v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_first_workspace() TO authenticated;

COMMENT ON FUNCTION public.provision_first_workspace IS 
  'Auto-provisions organisation and first project for new users. Idempotent - safe to call multiple times.';

-- =====================================================
-- PLATFORM ADMIN INFRASTRUCTURE
-- =====================================================

-- Platform admins table
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'super_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  notes text
);

-- RLS for platform_admins: only existing platform admins can manage
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view platform_admins"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Platform admins can insert platform_admins"
  ON platform_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Platform admins can delete platform_admins"
  ON platform_admins FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Helper function to check if current user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM platform_admins pa
    JOIN users u ON u.id = pa.user_id
    WHERE u.auth_id = auth.uid()
  ) INTO v_is_admin;

  RETURN COALESCE(v_is_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- =====================================================
-- PLATFORM ADMIN MONITORING RPCS
-- =====================================================

-- Get organisation summary (cross-org for platform admins only)
CREATE OR REPLACE FUNCTION public.get_platform_org_summary()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  plan_tier text,
  project_count bigint,
  user_count bigint,
  created_at timestamptz,
  last_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check platform admin permission
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  -- Get current user_id for audit
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();

  -- Log access
  INSERT INTO audit_events (
    org_id,
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  VALUES (
    NULL,
    NULL,
    v_user_id,
    'platform_admin',
    NULL,
    'view',
    jsonb_build_object(
      'action', 'get_org_summary',
      'timestamp', now()
    )
  );

  -- Return aggregated data
  RETURN QUERY
  SELECT
    o.id as org_id,
    o.name as org_name,
    COALESCE(op.plan_tier, 'starter') as plan_tier,
    COUNT(DISTINCT p.id) as project_count,
    COUNT(DISTINCT om.user_id) as user_count,
    o.created_at,
    MAX(ae.created_at) as last_activity
  FROM organisations o
  LEFT JOIN organisation_plans op ON op.org_id = o.id
  LEFT JOIN projects p ON p.org_id = o.id
  LEFT JOIN organisation_members om ON om.org_id = o.id
  LEFT JOIN audit_events ae ON ae.org_id = o.id
  GROUP BY o.id, o.name, o.created_at, op.plan_tier
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_org_summary() TO authenticated;

-- Get project summary (cross-org for platform admins only)
CREATE OR REPLACE FUNCTION public.get_platform_project_summary(
  p_org_id uuid DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  project_id uuid,
  project_title text,
  org_id uuid,
  org_name text,
  status text,
  member_count bigint,
  created_at timestamptz,
  last_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check platform admin permission
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  -- Get current user_id for audit
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();

  -- Log access
  INSERT INTO audit_events (
    org_id,
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  VALUES (
    NULL,
    NULL,
    v_user_id,
    'platform_admin',
    NULL,
    'view',
    jsonb_build_object(
      'action', 'get_project_summary',
      'filter_org_id', p_org_id,
      'timestamp', now()
    )
  );

  -- Return aggregated data
  RETURN QUERY
  SELECT
    p.id as project_id,
    p.title as project_title,
    p.org_id,
    o.name as org_name,
    p.status,
    COUNT(DISTINCT pm.user_id) as member_count,
    p.created_at,
    MAX(ae.created_at) as last_activity
  FROM projects p
  JOIN organisations o ON o.id = p.org_id
  LEFT JOIN project_memberships pm ON pm.project_id = p.id
  LEFT JOIN audit_events ae ON ae.project_id = p.id
  WHERE (p_org_id IS NULL OR p.org_id = p_org_id)
  GROUP BY p.id, p.title, p.org_id, o.name, p.status, p.created_at
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_project_summary(uuid, int) TO authenticated;

-- Get audit events (cross-org for platform admins only)
CREATE OR REPLACE FUNCTION public.get_platform_audit_events(
  p_org_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_from_date timestamptz DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  event_id uuid,
  org_id uuid,
  org_name text,
  project_id uuid,
  user_email text,
  entity_type text,
  action text,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check platform admin permission
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  -- Get current user_id for audit
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();

  -- Log access
  INSERT INTO audit_events (
    org_id,
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  VALUES (
    NULL,
    NULL,
    v_user_id,
    'platform_admin',
    NULL,
    'view',
    jsonb_build_object(
      'action', 'get_audit_events',
      'filters', jsonb_build_object(
        'org_id', p_org_id,
        'entity_type', p_entity_type,
        'action', p_action,
        'from_date', p_from_date
      ),
      'timestamp', now()
    )
  );

  -- Return filtered audit events
  RETURN QUERY
  SELECT
    ae.id as event_id,
    ae.org_id,
    o.name as org_name,
    ae.project_id,
    u.email as user_email,
    ae.entity_type,
    ae.action,
    ae.created_at,
    ae.metadata
  FROM audit_events ae
  LEFT JOIN organisations o ON o.id = ae.org_id
  LEFT JOIN users u ON u.id = ae.user_id
  WHERE (p_org_id IS NULL OR ae.org_id = p_org_id)
    AND (p_entity_type IS NULL OR ae.entity_type = p_entity_type)
    AND (p_action IS NULL OR ae.action = p_action)
    AND (p_from_date IS NULL OR ae.created_at >= p_from_date)
  ORDER BY ae.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_audit_events(uuid, text, text, timestamptz, int) TO authenticated;
