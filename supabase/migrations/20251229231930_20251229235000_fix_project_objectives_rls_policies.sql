/*
  # Fix Project Objectives RLS Policies

  1. Changes
    - Create current_profile_id() helper to safely get user profile ID
    - Update all project_objectives RLS policies to use helper instead of subqueries
    - Create create_project_objective_from_library() RPC for reliable objective creation
    - Ensure project coordinators/admins can reliably create, read, update, delete objectives

  2. Security
    - current_profile_id() auto-creates profile if missing (idempotent)
    - RLS policies properly check project membership and roles
    - No tenant isolation weakening
    - All operations verify user is project member

  3. Important Notes
    - Removes fragile subqueries from RLS that can return NULL
    - created_by is set correctly to users.id
    - Frontend should use RPC for objective creation
    - Fixes 403 Forbidden on objective creation
*/

-- Create helper function to get current profile id safely
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_auth_id uuid;
  v_email text;
  v_name text;
BEGIN
  -- Get auth user id
  v_auth_id := auth.uid();
  
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try to find existing profile
  SELECT id INTO v_profile_id
  FROM users
  WHERE auth_id = v_auth_id;

  -- If profile exists, return it
  IF v_profile_id IS NOT NULL THEN
    RETURN v_profile_id;
  END IF;

  -- Profile doesn't exist, create it
  -- Get email and name from auth.users if available
  SELECT 
    COALESCE(raw_user_meta_data->>'email', email, 'user@example.com'),
    COALESCE(raw_user_meta_data->>'name', 'User')
  INTO v_email, v_name
  FROM auth.users
  WHERE id = v_auth_id;

  -- Insert new profile
  INSERT INTO users (id, auth_id, email, name, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_auth_id,
    COALESCE(v_email, 'user@example.com'),
    COALESCE(v_name, 'User'),
    now(),
    now()
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

-- Drop existing project_objectives policies
DROP POLICY IF EXISTS "Project members can read project objectives" ON project_objectives;
DROP POLICY IF EXISTS "Project coordinators can create project objectives" ON project_objectives;
DROP POLICY IF EXISTS "Project coordinators can update project objectives" ON project_objectives;
DROP POLICY IF EXISTS "Project coordinators can delete project objectives" ON project_objectives;

-- Create new policies using current_profile_id() helper

-- SELECT: All project members can read objectives
CREATE POLICY "Project members can read objectives"
ON project_objectives FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = project_objectives.project_id
      AND pm.user_id = public.current_profile_id()
  )
);

-- INSERT: Coordinators and admins can create objectives
CREATE POLICY "Project coordinators can create objectives"
ON project_objectives FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = project_objectives.project_id
      AND pm.user_id = public.current_profile_id()
      AND pm.role IN ('coordinator', 'admin', 'cde_lead')
  )
);

-- UPDATE: Coordinators and admins can update objectives
CREATE POLICY "Project coordinators can update objectives"
ON project_objectives FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = project_objectives.project_id
      AND pm.user_id = public.current_profile_id()
      AND pm.role IN ('coordinator', 'admin', 'cde_lead')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = project_objectives.project_id
      AND pm.user_id = public.current_profile_id()
      AND pm.role IN ('coordinator', 'admin', 'cde_lead')
  )
);

-- DELETE: Coordinators and admins can delete objectives
CREATE POLICY "Project coordinators can delete objectives"
ON project_objectives FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = project_objectives.project_id
      AND pm.user_id = public.current_profile_id()
      AND pm.role IN ('coordinator', 'admin', 'cde_lead')
  )
);

-- Create RPC for reliable objective creation from library
CREATE OR REPLACE FUNCTION public.create_project_objective_from_library(
  p_project_id uuid,
  p_objective_lib_id uuid,
  p_priority text DEFAULT 'medium',
  p_stakeholder_types text[] DEFAULT '{}',
  p_time_horizon text DEFAULT 'medium',
  p_notes text DEFAULT NULL,
  p_source text DEFAULT 'library'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_objective_id uuid;
  v_lib_objective RECORD;
  v_is_member boolean;
  v_has_permission boolean;
BEGIN
  -- Get current user profile id
  v_user_id := public.current_profile_id();

  -- Check if user is project member
  SELECT EXISTS (
    SELECT 1 FROM project_memberships
    WHERE project_id = p_project_id
      AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Access denied: not a member of this project';
  END IF;

  -- Check if user has permission to create objectives
  SELECT EXISTS (
    SELECT 1 FROM project_memberships
    WHERE project_id = p_project_id
      AND user_id = v_user_id
      AND role IN ('coordinator', 'admin', 'cde_lead')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to create objectives';
  END IF;

  -- Load objective from library
  SELECT * INTO v_lib_objective
  FROM objective_library
  WHERE objective_lib_id = p_objective_lib_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Objective not found in library or is inactive';
  END IF;

  -- Generate objective id
  v_objective_id := gen_random_uuid();

  -- Insert or update objective (idempotent based on project + library id)
  INSERT INTO project_objectives (
    objective_id,
    project_id,
    objective_lib_id,
    title,
    description,
    domain,
    outcome_type,
    priority,
    stakeholder_types,
    time_horizon,
    notes,
    source,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_objective_id,
    p_project_id,
    p_objective_lib_id,
    v_lib_objective.title,
    v_lib_objective.description,
    v_lib_objective.domain,
    v_lib_objective.outcome_type,
    p_priority,
    p_stakeholder_types,
    p_time_horizon,
    p_notes,
    p_source,
    'active',
    v_user_id,
    now(),
    now()
  )
  ON CONFLICT (project_id, objective_lib_id)
  DO UPDATE SET
    priority = EXCLUDED.priority,
    stakeholder_types = EXCLUDED.stakeholder_types,
    time_horizon = EXCLUDED.time_horizon,
    notes = EXCLUDED.notes,
    updated_at = now()
  RETURNING objective_id INTO v_objective_id;

  -- Log audit event (if audit function exists)
  BEGIN
    PERFORM log_audit_event(
      (SELECT org_id FROM projects WHERE project_id = p_project_id),
      p_project_id,
      v_user_id,
      'project_objective',
      v_objective_id,
      'create',
      jsonb_build_object(
        'project_id', p_project_id,
        'objective_lib_id', p_objective_lib_id,
        'title', v_lib_objective.title
      ),
      NULL
    );
  EXCEPTION WHEN undefined_function THEN
    -- Audit function doesn't exist, skip logging
    NULL;
  END;

  RETURN v_objective_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_project_objective_from_library(uuid, uuid, text, text[], text, text, text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.create_project_objective_from_library IS 
'Creates a project objective from the objective library. Validates user permissions and ensures idempotent creation.';
