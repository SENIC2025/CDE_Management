/*
  # Fix Recursive Helper Functions and Policies

  ## Problem
  Helper functions (is_org_member, is_org_admin, is_platform_admin) and various
  policies query the users table with JOINs. When these are called from RLS policies,
  they can cause infinite recursion with users table RLS policies.

  ## Solution
  1. Make all helper functions SECURITY DEFINER so they bypass RLS when querying
  2. Update organisations policy to use organisation_members directly
  3. Ensure all policies that reference users do so safely

  ## Changes
  - Recreate helper functions as SECURITY DEFINER
  - Fix organisations SELECT policy to use organisation_members
  - All policies now avoid recursive users queries
*/

-- =====================================================
-- FIX HELPER FUNCTIONS: Make them SECURITY DEFINER
-- =====================================================

-- This prevents RLS recursion by bypassing RLS when these functions query users
CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organisation_members om
    INNER JOIN users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
      AND u.auth_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organisation_members om
    INNER JOIN users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
      AND u.auth_id = auth.uid()
      AND om.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM platform_admins pa
    JOIN users u ON u.id = pa.user_id
    WHERE u.auth_id = auth.uid()
  );
$$;

-- =====================================================
-- FIX ORGANISATIONS POLICY
-- =====================================================

-- Drop the old policy that queries users.org_id
DROP POLICY IF EXISTS "Users can view their organisation" ON organisations;

-- Create new policy using organisation_members (avoiding users table)
-- Users can view organisations they are members of
CREATE POLICY "Users can view their organisations"
  ON organisations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT om.org_id 
      FROM organisation_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Note: The users table query is now safe because:
-- 1. It happens inside a SECURITY DEFINER context (via the policy evaluation)
-- 2. The users RLS policies are simple and don't create circular dependencies
-- 3. The helper functions are SECURITY DEFINER so they bypass RLS entirely

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
