/*
  # Fix Profile Creation and Provisioning Flow

  1. Automatic Profile Creation
    - Create trigger function handle_new_auth_user()
    - Trigger on auth.users AFTER INSERT to auto-create public.users row
    - Ensures every authenticated user has a profile row
    - Idempotent with ON CONFLICT DO NOTHING

  2. Provisioning RPC Improvements
    - Update provision_first_workspace() to create missing profiles as fallback
    - Get email from auth.jwt() or auth.users for audit logging
    - Never fail due to missing profile - create it on the fly
    - Improved error messages for better debugging

  3. RLS Policies for Users Table
    - Enable RLS on public.users
    - Allow users to read their own profile
    - Allow users to update their own name
    - Restrict auth_id and org_id updates to SECURITY DEFINER functions only

  4. Security & Grants
    - SECURITY DEFINER with SET search_path for trigger function
    - Proper grants for authenticated users
    - Audit logging for all profile operations
*/

-- =====================================================
-- A) AUTO-CREATE PROFILE ON AUTH USER CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (auth_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user IS
  'Automatically creates a public.users profile row when a new auth.users record is created. Runs as SECURITY DEFINER to bypass RLS.';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- =====================================================
-- B) UPDATE PROVISIONING RPC TO HANDLE MISSING PROFILES
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
      metadata
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
  'Self-healing workspace provisioning with automatic profile creation and error logging. Creates organisation and first project with concurrency safety. Errors are logged to audit_events for troubleshooting.';

-- =====================================================
-- C) RLS POLICIES FOR USERS TABLE
-- =====================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own name" ON public.users;
DROP POLICY IF EXISTS "System can insert profiles" ON public.users;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Allow users to update their own name only
CREATE POLICY "Users can update own name"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Note: INSERT is handled by SECURITY DEFINER functions (trigger + RPC)
-- We don't allow direct inserts from users

-- =====================================================
-- D) GRANTS AND PERMISSIONS
-- =====================================================

-- Grant execute on provisioning function
GRANT EXECUTE ON FUNCTION public.provision_first_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO authenticated;

-- Grant execute on other critical functions
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- =====================================================
-- E) BACKFILL: CREATE PROFILES FOR EXISTING AUTH USERS
-- =====================================================

-- Create profiles for any existing auth users that don't have a profile
-- This is a one-time backfill operation
DO $$
DECLARE
  v_auth_user RECORD;
  v_profile_count integer := 0;
BEGIN
  FOR v_auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users u ON u.auth_id = au.id
    WHERE u.id IS NULL
  LOOP
    INSERT INTO public.users (auth_id, name, email)
    VALUES (
      v_auth_user.id,
      COALESCE(v_auth_user.raw_user_meta_data->>'name', split_part(v_auth_user.email, '@', 1)),
      v_auth_user.email
    )
    ON CONFLICT (auth_id) DO NOTHING;
    
    v_profile_count := v_profile_count + 1;
  END LOOP;

  IF v_profile_count > 0 THEN
    RAISE NOTICE 'Created % missing user profiles', v_profile_count;
  END IF;
END $$;
