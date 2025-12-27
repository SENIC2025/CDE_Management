/*
  # Add Organisation Bootstrap RPC

  1. Purpose
    - Allow authenticated users to create their first organisation
    - Automatically assign creator as admin in organisation_members
    - Create default organisation_plans and governance_settings
    - Prevent null org_id crashes during project creation

  2. New Functions
    - bootstrap_user_organisation(org_name text) returns uuid
      - Creates organisation, adds user as admin, sets up defaults
      - Can only be called by authenticated users
      - Returns the new org_id

  3. Security
    - SECURITY DEFINER to bypass RLS during bootstrap
    - Only authenticated users can call
    - Creates audit trail for org creation
*/

-- =====================================================
-- ORGANISATION BOOTSTRAP RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.bootstrap_user_organisation(
  p_org_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_org_name text;
  v_user_email text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create organisation';
  END IF;

  -- Get the user record
  SELECT id, email INTO v_user_id, v_user_email
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Check if user already has an organisation
  IF EXISTS (
    SELECT 1 FROM users WHERE id = v_user_id AND org_id IS NOT NULL
  ) THEN
    -- Return existing org_id
    SELECT org_id INTO v_org_id FROM users WHERE id = v_user_id;
    RETURN v_org_id;
  END IF;

  -- Determine organisation name
  IF p_org_name IS NULL OR p_org_name = '' THEN
    v_org_name := COALESCE(
      split_part(v_user_email, '@', 1) || '''s Organisation',
      'My Organisation'
    );
  ELSE
    v_org_name := p_org_name;
  END IF;

  -- Create organisation
  INSERT INTO organisations (name)
  VALUES (v_org_name)
  RETURNING id INTO v_org_id;

  -- Update user with org_id
  UPDATE users
  SET org_id = v_org_id
  WHERE id = v_user_id;

  -- Add user as admin in organisation_members
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- Create default organisation plan (starter)
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

  -- Log audit event
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
    'organisation',
    v_org_id,
    'created',
    jsonb_build_object(
      'org_name', v_org_name,
      'bootstrapped', true,
      'created_by', v_user_email
    )
  );

  RETURN v_org_id;
END;
$$;

COMMENT ON FUNCTION public.bootstrap_user_organisation IS 
  'Creates a new organisation for authenticated user if they do not have one. Returns org_id.';
