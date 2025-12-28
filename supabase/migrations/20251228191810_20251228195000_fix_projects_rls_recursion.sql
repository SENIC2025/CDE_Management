/*
  # Fix Infinite Recursion in Projects RLS Policies

  ## Problem
  Projects and project_memberships tables have circular RLS dependencies:
  - projects policies check project_memberships (via EXISTS subqueries)
  - project_memberships policies check projects (via SELECT org_id FROM projects)
  - This causes infinite recursion (42P17 error) when creating or querying projects

  ## Root Cause
  project_memberships policies contain: is_org_admin((SELECT p.org_id FROM projects...))
  This queries projects table from within project_memberships policies, which are themselves
  queried by projects policies, creating a circular dependency.

  ## Solution
  1. Add org_id column to project_memberships (denormalized for performance)
  2. Create trigger to auto-populate org_id from projects on insert/update
  3. Backfill existing project_memberships with org_id
  4. Replace project_memberships policies to use org_id directly (no projects query)
  5. Clean up duplicate projects policies and create simple, non-recursive ones

  ## Changes Made
  - Added org_id to project_memberships
  - Created sync trigger for org_id
  - Replaced all RLS policies on both tables with non-recursive versions
  - Removed duplicate policies

  ## Security Model After Fix
  Projects:
  - SELECT: platform admin OR org member OR project member
  - INSERT: platform admin OR org admin
  - UPDATE: platform admin OR org admin OR project coordinator
  - DELETE: platform admin OR org admin

  Project Memberships:
  - SELECT: own membership OR org admin (using denormalized org_id)
  - INSERT: org admin (using denormalized org_id)
  - UPDATE: org admin (using denormalized org_id)
  - DELETE: org admin (using denormalized org_id)
*/

-- =====================================================
-- STEP 1: ADD ORG_ID TO PROJECT_MEMBERSHIPS
-- =====================================================

-- Add org_id column to project_memberships (denormalized for RLS performance)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_memberships'
      AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.project_memberships 
    ADD COLUMN org_id uuid REFERENCES public.organisations(id);
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_memberships_org_id 
  ON public.project_memberships(org_id);

-- =====================================================
-- STEP 2: BACKFILL ORG_ID FROM PROJECTS
-- =====================================================

-- Backfill existing project_memberships with org_id from projects
UPDATE public.project_memberships pm
SET org_id = p.org_id
FROM public.projects p
WHERE pm.project_id = p.id
  AND pm.org_id IS NULL;

-- =====================================================
-- STEP 3: CREATE TRIGGER TO AUTO-SYNC ORG_ID
-- =====================================================

-- Function to sync org_id from projects to project_memberships
CREATE OR REPLACE FUNCTION sync_project_membership_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT or UPDATE, sync org_id from projects
  SELECT org_id INTO NEW.org_id
  FROM projects
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_sync_project_membership_org_id ON public.project_memberships;

CREATE TRIGGER trigger_sync_project_membership_org_id
  BEFORE INSERT OR UPDATE ON public.project_memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_membership_org_id();

-- =====================================================
-- STEP 4: FIX PROJECT_MEMBERSHIPS RLS POLICIES
-- =====================================================

-- Drop ALL existing project_memberships policies
DROP POLICY IF EXISTS "System can create memberships" ON public.project_memberships;
DROP POLICY IF EXISTS "Users can view memberships of their projects" ON public.project_memberships;
DROP POLICY IF EXISTS "Coordinators and admins can manage memberships" ON public.project_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.project_memberships;
DROP POLICY IF EXISTS project_memberships_select ON public.project_memberships;
DROP POLICY IF EXISTS project_memberships_insert ON public.project_memberships;
DROP POLICY IF EXISTS project_memberships_update ON public.project_memberships;
DROP POLICY IF EXISTS project_memberships_delete ON public.project_memberships;

-- Enable RLS
ALTER TABLE public.project_memberships ENABLE ROW LEVEL SECURITY;

-- SELECT: users can see their own memberships OR org admins can see all in their org
CREATE POLICY project_memberships_select
  ON public.project_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR is_platform_admin()
    OR is_org_admin(org_id)
  );

-- INSERT: only org admins (org_id is set by trigger)
CREATE POLICY project_memberships_insert
  ON public.project_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR is_org_admin(org_id)
  );

-- UPDATE: only org admins
CREATE POLICY project_memberships_update
  ON public.project_memberships
  FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin()
    OR is_org_admin(org_id)
  )
  WITH CHECK (
    is_platform_admin()
    OR is_org_admin(org_id)
  );

-- DELETE: only org admins
CREATE POLICY project_memberships_delete
  ON public.project_memberships
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR is_org_admin(org_id)
  );

-- =====================================================
-- STEP 5: FIX PROJECTS RLS POLICIES
-- =====================================================

-- Drop ALL existing projects policies
DROP POLICY IF EXISTS "Users can view their projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their org" ON public.projects;
DROP POLICY IF EXISTS "Project coordinators and admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS projects_select ON public.projects;
DROP POLICY IF EXISTS projects_insert ON public.projects;
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete ON public.projects;

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- SELECT: platform admin OR org member OR project member
-- Note: project_memberships now has org_id, so querying it is safe
CREATE POLICY projects_select
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    is_platform_admin()
    OR is_org_member(org_id)
    OR EXISTS (
      SELECT 1 FROM public.project_memberships pm
      INNER JOIN public.users u ON u.id = pm.user_id
      WHERE pm.project_id = projects.id
        AND u.auth_id = auth.uid()
    )
  );

-- INSERT: only org admins (or platform admins)
CREATE POLICY projects_insert
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR is_org_admin(org_id)
  );

-- UPDATE: org admin OR project coordinator
CREATE POLICY projects_update
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin()
    OR is_org_admin(org_id)
    OR EXISTS (
      SELECT 1 FROM public.project_memberships pm
      INNER JOIN public.users u ON u.id = pm.user_id
      WHERE pm.project_id = projects.id
        AND u.auth_id = auth.uid()
        AND pm.role IN ('coordinator', 'admin')
    )
  )
  WITH CHECK (
    is_platform_admin()
    OR is_org_admin(org_id)
    OR EXISTS (
      SELECT 1 FROM public.project_memberships pm
      INNER JOIN public.users u ON u.id = pm.user_id
      WHERE pm.project_id = projects.id
        AND u.auth_id = auth.uid()
        AND pm.role IN ('coordinator', 'admin')
    )
  );

-- DELETE: only org admins (or platform admins)
CREATE POLICY projects_delete
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR is_org_admin(org_id)
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify: projects policies should now be non-recursive
-- They only query: organisation_members (via is_org_member/is_org_admin), 
-- project_memberships (safe because pm now uses org_id directly), 
-- and platform_admins (via is_platform_admin)

-- Verify: project_memberships policies are non-recursive
-- They only query: users (for user_id lookup), organisation_members (via is_org_admin with org_id)
-- No queries to projects table!
