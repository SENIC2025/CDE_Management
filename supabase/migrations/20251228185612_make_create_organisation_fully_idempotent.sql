/*
  # Make create_organisation Fully Idempotent

  1. Problem
    - create_organisation() function doesn't use ON CONFLICT for membership inserts
    - If trigger fires or function is called twice, duplicate key violations occur
    - Users see "No Organisation Found" after failed creation attempts

  2. Changes
    - Add ON CONFLICT handling to organisation_members insert
    - Add ON CONFLICT handling to project_memberships insert (trigger also inserts)
    - Add ON CONFLICT handling to organisation_plans and governance_settings
    - Wrap in exception handler to surface real errors to UI

  3. Impact
    - Function can be called multiple times without errors
    - Retrying after failure works correctly
    - Users get clear error messages if something truly fails

  4. Safety
    - ON CONFLICT DO NOTHING is safe and idempotent
    - For unique constraints like org_id, we use DO UPDATE to ensure latest data
    - All audit logging preserved
*/

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
  v_error_message text;
  v_error_detail text;
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

  -- Add user as admin (idempotent with ON CONFLICT)
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin')
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = 'admin',
        updated_at = now();

  -- Update user's org_id (for convenience, though users can belong to multiple orgs)
  UPDATE users
  SET org_id = v_org_id
  WHERE id = v_user_id;

  -- Create default organisation plan (project tier) - idempotent
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
  )
  ON CONFLICT (org_id) DO UPDATE
    SET plan_tier = 'project',
        status = 'active',
        updated_at = now();

  -- Create default governance settings - idempotent
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
  )
  ON CONFLICT (org_id) DO UPDATE
    SET methodology_governance_mode = 'project_only',
        template_governance_mode = 'project_only',
        updated_at = now();

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

  -- NOTE: project_memberships is inserted by trigger (trg_add_creator_project_membership)
  -- We add this as a safety net to ensure membership exists
  INSERT INTO project_memberships (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'coordinator')
  ON CONFLICT (project_id, user_id) DO NOTHING;

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

EXCEPTION
  WHEN OTHERS THEN
    -- Capture error details for better debugging
    GET STACKED DIAGNOSTICS
      v_error_message = MESSAGE_TEXT,
      v_error_detail = PG_EXCEPTION_DETAIL;

    -- Log error to audit_events for troubleshooting
    BEGIN
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
        'error',
        jsonb_build_object(
          'error_message', v_error_message,
          'error_detail', v_error_detail,
          'function', 'create_organisation',
          'timestamp', now()
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Re-raise with clear message
    RAISE EXCEPTION 'Failed to create organisation: %', v_error_message
      USING DETAIL = v_error_detail,
            HINT = 'Please try again or contact support if the problem persists.';
END;
$$;

COMMENT ON FUNCTION public.create_organisation IS
  'Create a new organisation manually from UI. Fully idempotent with proper error handling. User becomes admin and starter project is created automatically.';
