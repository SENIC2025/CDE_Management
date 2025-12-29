/*
  # Allow Org Admins to Manage Plans via Admin UI

  1. Changes
    - Allow org admins to UPDATE organisation_plans for governance UI
    - Keep INSERT/DELETE blocked (only provisioning RPCs can do these)
    - Maintain security with org admin role check

  2. Security
    - Only org admins can update plans
    - Updates must be for their own organisation
    - No direct INSERT/DELETE allowed from frontend

  3. Important Notes
    - This enables the Governance admin UI to work
    - Plan provisioning still requires SECURITY DEFINER RPCs
*/

-- Drop the restrictive update policy
DROP POLICY IF EXISTS "No direct update on organisation_plans" ON organisation_plans;

-- Allow org admins to update plans (for governance UI)
CREATE POLICY "Org admins can update plans"
ON organisation_plans FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organisation_members
    WHERE organisation_members.org_id = organisation_plans.org_id
    AND organisation_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND organisation_members.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organisation_members
    WHERE organisation_members.org_id = organisation_plans.org_id
    AND organisation_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND organisation_members.role = 'admin'
  )
);
