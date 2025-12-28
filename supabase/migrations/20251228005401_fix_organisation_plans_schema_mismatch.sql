/*
  # Fix Organisation Plans Schema Mismatch

  1. Problem
    - provision_first_workspace() was inserting into organisation_plans with non-existent columns:
      max_projects, max_users, storage_gb, api_calls_per_month, features
    - These should be stored in entitlements_json (for overrides) or read from plan_catalog.default_entitlements_json (for defaults)

  2. Solution
    - Update provision_first_workspace() to use correct organisation_plans schema
    - Use entitlements_json for storing overrides (or {} for defaults)
    - Read effective limits from merged plan_catalog + organisation_plans entitlements
    - Set plan_tier to 'project' (matches plan_catalog)

  3. Schema Verification
    - organisation_plans columns: org_id, plan_tier, status, starts_at, ends_at, entitlements_json, created_by, created_at, updated_by, updated_at
    - plan_catalog.default_entitlements_json contains: max_projects and all feature flags
    - Effective entitlements = COALESCE(organisation_plans.entitlements_json, '{}') || plan_catalog.default_entitlements_json

  4. Changes
    - Replace INSERT INTO organisation_plans to use only actual columns
    - Remove references to non-existent columns
    - Use 'project' plan tier (free tier, 1 project limit from catalog)
*/

-- =====================================================
-- UPDATE PROVISIONING RPC TO USE CORRECT SCHEMA
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
  v_auth_user_email text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to provision workspace';
  END IF;

  -- Acquire advisory lock per user to serialize concurrent provisioning attempts
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  -- Get email from auth.users for profile creation if needed
  SELECT email INTO v_auth_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get or create the user profile
  SELECT id, email INTO v_user_id, v_user_email
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Profile doesn't exist - create it now (fallback in case trigger didn't run)
    INSERT INTO users (auth_id, name, email)
    VALUES (
      auth.uid(),
      COALESCE(split_part(v_auth_user_email, '@', 1), 'User'),
      COALESCE(v_auth_user_email, 'user@example.com')
    )
    ON CONFLICT (auth_id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = now()
    RETURNING id, email INTO v_user_id, v_user_email;

    -- Audit the profile creation
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
      'user',
      v_user_id,
      'create',
      jsonb_build_object(
        'auto_created', true,
        'created_during', 'provisioning',
        'email', v_user_email
      )
    );
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

    -- Create default organisation plan (using project tier = 1 project limit)
    -- entitlements_json is empty, so defaults from plan_catalog.default_entitlements_json apply
    INSERT INTO organisation_plans (
      org_id,
      plan_tier,
      status,
      entitlements_json
    )
    VALUES (
      v_org_id,
      'project',
      'active',
      '{}'::jsonb
    )
    ON CONFLICT (org_id) DO NOTHING;

    -- Create default governance settings (will set starter_project_id later)
    INSERT INTO organisation_governance_settings (
      org_id,
      methodology_governance_mode,
      template_governance_mode,
      org_defaults_json,
      branding_json
    )
    VALUES (
      v_org_id,
      'project_only',
      'project_only',
      '{}'::jsonb,
      '{}'::jsonb
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
    reporting_periods
  )
  VALUES (
    v_org_id,
    'Your first project',
    'Auto-created starter project. You can rename and edit it later.',
    'Custom',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months',
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
      diff_json
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
    diff_json
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
        diff_json
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
          'user_email', COALESCE(v_user_email, v_auth_user_email),
          'timestamp', now()
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Re-raise the exception so the frontend can display it
    RAISE EXCEPTION 'Workspace provisioning failed: %', v_error_message
      USING DETAIL = v_error_detail,
            HINT = COALESCE(v_error_hint, 'Please try again or contact support if the problem persists.');
END;
$$;

COMMENT ON FUNCTION public.provision_first_workspace IS
  'Self-healing workspace provisioning with automatic profile creation and error logging. Creates organisation with project-tier plan (1 project limit) and first project. Concurrency-safe and idempotent.';

-- =====================================================
-- HELPER FUNCTION: GET EFFECTIVE ENTITLEMENTS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_effective_entitlements(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_tier text;
  v_org_entitlements jsonb;
  v_catalog_defaults jsonb;
  v_effective jsonb;
BEGIN
  -- Get organisation's plan tier and custom entitlements
  SELECT plan_tier, COALESCE(entitlements_json, '{}'::jsonb)
  INTO v_plan_tier, v_org_entitlements
  FROM organisation_plans
  WHERE org_id = p_org_id;

  IF v_plan_tier IS NULL THEN
    -- No plan found, return empty
    RETURN '{}'::jsonb;
  END IF;

  -- Get catalog defaults for this tier
  SELECT default_entitlements_json
  INTO v_catalog_defaults
  FROM plan_catalog
  WHERE plan_tier = v_plan_tier;

  -- Merge: org overrides take precedence over catalog defaults
  -- This uses || operator which does left-to-right merge (right overwrites left)
  v_effective := COALESCE(v_catalog_defaults, '{}'::jsonb) || v_org_entitlements;

  RETURN v_effective;
END;
$$;

COMMENT ON FUNCTION public.get_effective_entitlements IS
  'Returns effective entitlements for an organisation by merging plan_catalog defaults with organisation_plans overrides. Organisation overrides take precedence.';

GRANT EXECUTE ON FUNCTION public.get_effective_entitlements(uuid) TO authenticated;

-- =====================================================
-- CLEAN UP: VERIFY NO INVALID COLUMN REFERENCES REMAIN
-- =====================================================

-- Note: This migration fixes the schema mismatch. Any frontend code that
-- reads plan limits should call get_effective_entitlements(org_id) or
-- join organisation_plans with plan_catalog to compute effective values.
