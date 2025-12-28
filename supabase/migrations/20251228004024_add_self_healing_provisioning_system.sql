/*
  # Self-Healing Provisioning System

  1. Error Diagnostics
    - Update provision_first_workspace() with comprehensive exception handling
    - Log all provisioning failures to audit_events for troubleshooting
    - Return detailed error messages to frontend for user-friendly display

  2. Security & Grants
    - Verify EXECUTE grants on provision_first_workspace for authenticated users
    - Ensure function uses SECURITY DEFINER with proper search_path
    - Add comments documenting the self-healing behavior

  3. Changes
    - Add EXCEPTION block to capture and log errors
    - Ensure errors are visible to platform admins via audit_events
    - Maintain idempotency and concurrency safety
*/

-- =====================================================
-- A) UPDATE PROVISION_FIRST_WORKSPACE WITH ERROR HANDLING
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
  v_existing_starter_project_id uuid;
  v_governance_id uuid;
  v_is_new_provision boolean := false;
  v_error_message text;
  v_error_detail text;
  v_error_hint text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to provision workspace';
  END IF;

  -- Acquire advisory lock per user to serialize concurrent provisioning attempts
  -- This prevents race conditions when the same user logs in from multiple tabs/devices
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  -- Get the user record
  SELECT id, email INTO v_user_id, v_user_email
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found. Please ensure your account is properly set up.';
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

    -- Create default governance settings (will set starter_project_id later)
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

    v_is_new_provision := true;
  END IF;

  -- Lock the governance settings row to prevent concurrent project creation
  SELECT id, starter_project_id INTO v_governance_id, v_existing_starter_project_id
  FROM organisation_governance_settings
  WHERE org_id = v_org_id
  FOR UPDATE;

  -- If starter project already exists and is valid, return it (idempotent)
  IF v_existing_starter_project_id IS NOT NULL THEN
    -- Verify the project still exists
    SELECT id INTO v_project_id
    FROM projects
    WHERE id = v_existing_starter_project_id
      AND org_id = v_org_id;

    IF v_project_id IS NOT NULL THEN
      -- Ensure user has membership
      INSERT INTO project_memberships (project_id, user_id, role)
      VALUES (v_project_id, v_user_id, 'coordinator')
      ON CONFLICT DO NOTHING;

      RETURN v_project_id;
    END IF;
  END IF;

  -- Create the starter project (only if no valid starter exists)
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

  -- Update governance settings with starter_project_id
  UPDATE organisation_governance_settings
  SET starter_project_id = v_project_id
  WHERE org_id = v_org_id;

  -- Audit logging (only for new provisioning to avoid duplicate logs)
  IF v_is_new_provision THEN
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
      'auto_provisioned', true,
      'is_starter_project', true
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN v_project_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Capture error details
    GET STACKED DIAGNOSTICS
      v_error_message = MESSAGE_TEXT,
      v_error_detail = PG_EXCEPTION_DETAIL,
      v_error_hint = PG_EXCEPTION_HINT;

    -- Log the error to audit_events for platform admin troubleshooting
    BEGIN
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
        COALESCE(v_user_id, (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)),
        'provisioning',
        v_org_id,
        'error',
        jsonb_build_object(
          'error_message', v_error_message,
          'error_detail', v_error_detail,
          'error_hint', v_error_hint,
          'user_email', v_user_email,
          'timestamp', now()
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- If we can't log the error, continue anyway
      NULL;
    END;

    -- Re-raise the exception so the frontend can display it
    RAISE EXCEPTION 'Workspace provisioning failed: %', v_error_message
      USING DETAIL = v_error_detail,
            HINT = COALESCE(v_error_hint, 'Please try again or contact support if the problem persists.');
END;
$$;

COMMENT ON FUNCTION public.provision_first_workspace IS 
  'Self-healing workspace provisioning with automatic error logging. Creates organisation and first project with concurrency safety. Errors are logged to audit_events for troubleshooting.';

-- =====================================================
-- B) VERIFY GRANTS
-- =====================================================

-- Ensure authenticated users can call provision_first_workspace
GRANT EXECUTE ON FUNCTION public.provision_first_workspace() TO authenticated;

-- Verify other critical provisioning functions have proper grants
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- =====================================================
-- C) ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON TABLE organisation_governance_settings IS
  'Governance and security settings per organisation. Includes starter_project_id for deterministic first-time provisioning.';

COMMENT ON COLUMN organisation_governance_settings.starter_project_id IS
  'Tracks the canonical first/starter project. Used by provision_first_workspace() to ensure idempotent, concurrency-safe provisioning.';
