/*
  # Fix Organisation Plans Access and Entitlements Loading

  1. Changes
    - Recreate get_effective_entitlements() as SECURITY DEFINER with proper auth checks
    - Enforce one active plan per organisation with unique constraint
    - Update RLS policies to restrict direct INSERT/UPDATE/DELETE to admin only
    - Grant execute permission to authenticated users for RPC access

  2. Security
    - get_effective_entitlements verifies caller is org member
    - Prevents frontend from directly inserting/updating organisation_plans
    - Ensures stable single-row active plan per org

  3. Important Notes
    - Frontend must use get_effective_entitlements(org_id) RPC only
    - No direct SELECT on organisation_plans from frontend
    - Plan provisioning happens only via admin RPCs
    - Fixes 403 Forbidden and 406 PGRST116 errors
*/

-- Drop existing function to recreate with proper security
DROP FUNCTION IF EXISTS get_effective_entitlements(uuid);

-- Create SECURITY DEFINER function for safe entitlements access
CREATE OR REPLACE FUNCTION get_effective_entitlements(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_plan_entitlements jsonb;
  v_plan_tier text;
  v_default_entitlements jsonb;
  v_merged_entitlements jsonb;
BEGIN
  -- Get the user_id for the authenticated user
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Verify user is a member of the organisation
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id
    AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a member of this organisation';
  END IF;

  -- Get the active plan for the organisation
  SELECT 
    plan_tier,
    entitlements_json
  INTO 
    v_plan_tier,
    v_plan_entitlements
  FROM organisation_plans
  WHERE org_id = p_org_id
  AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no active plan found, return default free tier entitlements
  IF v_plan_tier IS NULL THEN
    SELECT default_entitlements_json INTO v_default_entitlements
    FROM plan_catalog
    WHERE tier = 'free'
    LIMIT 1;

    RETURN COALESCE(v_default_entitlements, '{}'::jsonb);
  END IF;

  -- Get default entitlements for the plan tier
  SELECT default_entitlements_json INTO v_default_entitlements
  FROM plan_catalog
  WHERE tier = v_plan_tier
  LIMIT 1;

  -- Merge plan-specific overrides with defaults
  -- Plan-specific entitlements override defaults
  v_merged_entitlements := COALESCE(v_default_entitlements, '{}'::jsonb) || COALESCE(v_plan_entitlements, '{}'::jsonb);

  RETURN v_merged_entitlements;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_effective_entitlements(uuid) TO authenticated;

-- Add unique constraint to enforce one active plan per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_organisation_plans_one_active_per_org
ON organisation_plans(org_id)
WHERE status = 'active';

-- Update RLS policies for organisation_plans to restrict direct access

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Org members can read org plans" ON organisation_plans;
DROP POLICY IF EXISTS "Org admins can manage org plans" ON organisation_plans;
DROP POLICY IF EXISTS "System can manage org plans" ON organisation_plans;

-- Org admins can read plans (for admin UI only)
CREATE POLICY "Org admins can read plans"
ON organisation_plans FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organisation_members
    WHERE organisation_members.org_id = organisation_plans.org_id
    AND organisation_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND organisation_members.role = 'admin'
  )
);

-- Only allow INSERT/UPDATE/DELETE via SECURITY DEFINER functions (not direct access)
-- These policies effectively block direct modifications from frontend
CREATE POLICY "No direct insert on organisation_plans"
ON organisation_plans FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct update on organisation_plans"
ON organisation_plans FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct delete on organisation_plans"
ON organisation_plans FOR DELETE
TO authenticated
USING (false);

-- Create helper function to check if org has active plan (used by provisioning)
CREATE OR REPLACE FUNCTION has_active_plan(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_plans
    WHERE org_id = p_org_id
    AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION has_active_plan(uuid) TO authenticated;
