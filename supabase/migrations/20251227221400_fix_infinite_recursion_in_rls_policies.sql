/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - organisation_members RLS policies reference organisation_members within their USING clauses
    - This creates infinite recursion when querying the table
    - Also, policies incorrectly use auth.uid() as user_id instead of querying users table

  2. Solution
    - Drop existing problematic policies on organisation_members
    - Create new policies that use users table lookup instead of recursive queries
    - Use SECURITY DEFINER functions to break recursion cycle

  3. Changes
    - Drop all organisation_members policies
    - Create helper function to check org admin status safely
    - Recreate policies using helper function to avoid recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read organisation members for their org" ON organisation_members;
DROP POLICY IF EXISTS "Org admins can insert organisation members" ON organisation_members;
DROP POLICY IF EXISTS "Org admins can update organisation members" ON organisation_members;
DROP POLICY IF EXISTS "Org admins can delete organisation members" ON organisation_members;

-- Create helper function to check if user is org admin (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organisation_members om
    INNER JOIN users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
      AND u.auth_id = auth.uid()
      AND om.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organisation_members om
    INNER JOIN users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
      AND u.auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies without recursion
CREATE POLICY "Users can read organisation members for their org"
  ON organisation_members
  FOR SELECT
  TO authenticated
  USING (is_org_member(org_id));

CREATE POLICY "Org admins can insert organisation members"
  ON organisation_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Org admins can update organisation members"
  ON organisation_members
  FOR UPDATE
  TO authenticated
  USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Org admins can delete organisation members"
  ON organisation_members
  FOR DELETE
  TO authenticated
  USING (is_org_admin(org_id));
