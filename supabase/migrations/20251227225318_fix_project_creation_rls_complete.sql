/*
  # Fix Project Creation RLS (Bootstrap-Safe)

  1. Problem
    - organisation_members policies cause infinite recursion
    - First admin cannot be created (bootstrap problem)
    - Project creators don't automatically become project members
    - Projects invisible after creation

  2. Solution
    - SECURITY DEFINER helper functions to break recursion
    - Bootstrap-safe insert policy for first org admin
    - Auto-assign project creator as coordinator via trigger
    - Proper RLS on projects and project_memberships

  3. Changes
    - Create is_org_member() and is_org_admin() helpers
    - Replace organisation_members policies with bootstrap support
    - Fix projects table policies
    - Add trigger to auto-create project membership
    - Ensure project_memberships RLS allows users to see their own memberships
*/

-- =====================================================
-- A) SAFE HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organisation_members om
    INNER JOIN users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
      AND u.auth_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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

-- =====================================================
-- B) ORGANISATION_MEMBERS RLS (BOOTSTRAP-SAFE)
-- =====================================================

ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read organisation members for their org" ON organisation_members;
DROP POLICY IF EXISTS "Org admins can insert organisation members" ON organisation_members;
DROP POLICY IF EXISTS "Org admins can update organisation members" ON organisation_members;
DROP POLICY IF EXISTS "Org admins can delete organisation members" ON organisation_members;
DROP POLICY IF EXISTS org_members_select ON organisation_members;
DROP POLICY IF EXISTS org_members_insert ON organisation_members;
DROP POLICY IF EXISTS org_members_update ON organisation_members;
DROP POLICY IF EXISTS org_members_delete ON organisation_members;

CREATE POLICY org_members_select
ON organisation_members
FOR SELECT
USING (is_org_member(org_id));

CREATE POLICY org_members_insert
ON organisation_members
FOR INSERT
WITH CHECK (
  -- Normal case: admin adds members
  is_org_admin(org_id)
  OR
  -- Bootstrap case: first user self-assigns as admin
  (
    EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.id = user_id)
    AND role = 'admin'
    AND NOT EXISTS (
      SELECT 1
      FROM organisation_members om2
      WHERE om2.org_id = organisation_members.org_id
    )
  )
);

CREATE POLICY org_members_update
ON organisation_members
FOR UPDATE
USING (is_org_admin(org_id))
WITH CHECK (is_org_admin(org_id));

CREATE POLICY org_members_delete
ON organisation_members
FOR DELETE
USING (is_org_admin(org_id));

-- =====================================================
-- C) PROJECTS TABLE RLS
-- =====================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select ON projects;
DROP POLICY IF EXISTS projects_insert ON projects;
DROP POLICY IF EXISTS projects_update ON projects;
DROP POLICY IF EXISTS projects_delete ON projects;

CREATE POLICY projects_select
ON projects
FOR SELECT
USING (is_org_member(org_id));

CREATE POLICY projects_insert
ON projects
FOR INSERT
WITH CHECK (is_org_admin(org_id));

CREATE POLICY projects_update
ON projects
FOR UPDATE
USING (is_org_admin(org_id))
WITH CHECK (is_org_admin(org_id));

CREATE POLICY projects_delete
ON projects
FOR DELETE
USING (is_org_admin(org_id));

-- =====================================================
-- D) AUTO-ASSIGN PROJECT CREATOR AS COORDINATOR
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_creator_project_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id from auth.uid()
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  -- Insert project membership for creator
  IF v_user_id IS NOT NULL THEN
    INSERT INTO project_memberships (project_id, user_id, role)
    VALUES (NEW.id, v_user_id, 'coordinator')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_creator_project_membership ON projects;

CREATE TRIGGER trg_add_creator_project_membership
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_project_membership();

-- =====================================================
-- E) PROJECT_MEMBERSHIPS RLS
-- =====================================================

ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_memberships_select ON project_memberships;
DROP POLICY IF EXISTS project_memberships_insert ON project_memberships;
DROP POLICY IF EXISTS project_memberships_update ON project_memberships;
DROP POLICY IF EXISTS project_memberships_delete ON project_memberships;

CREATE POLICY project_memberships_select
ON project_memberships
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.id = user_id)
  OR is_org_admin(
    (SELECT p.org_id FROM projects p WHERE p.id = project_memberships.project_id)
  )
);

CREATE POLICY project_memberships_insert
ON project_memberships
FOR INSERT
WITH CHECK (
  is_org_admin(
    (SELECT p.org_id FROM projects p WHERE p.id = project_memberships.project_id)
  )
);

CREATE POLICY project_memberships_update
ON project_memberships
FOR UPDATE
USING (
  is_org_admin(
    (SELECT p.org_id FROM projects p WHERE p.id = project_memberships.project_id)
  )
)
WITH CHECK (
  is_org_admin(
    (SELECT p.org_id FROM projects p WHERE p.id = project_memberships.project_id)
  )
);

CREATE POLICY project_memberships_delete
ON project_memberships
FOR DELETE
USING (
  is_org_admin(
    (SELECT p.org_id FROM projects p WHERE p.id = project_memberships.project_id)
  )
);
