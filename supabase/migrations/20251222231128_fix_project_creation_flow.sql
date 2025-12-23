/*
  # Fix Project Creation Flow

  1. Changes
    - Add trigger to auto-create project_membership for project creator
    - Update RLS policies on projects table
    - Update RLS policies on project_memberships table
    - Ensure transactional project creation

  2. Security
    - Project creator automatically becomes coordinator
    - Projects are visible to their members via project_memberships
    - Users can only create projects in their own organization
*/

-- Function to get current user's ID from auth
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to automatically create project_membership when project is created
CREATE OR REPLACE FUNCTION create_project_membership_for_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert project_membership for the creator with coordinator role
  INSERT INTO project_memberships (project_id, user_id, role)
  VALUES (NEW.id, get_current_user_id(), 'coordinator');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_project_created ON projects;

-- Create trigger to auto-create membership
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_membership_for_creator();

-- Update projects RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Org admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects in their organisation" ON projects;

-- Policy: Users can view projects they are members of
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Users can view their projects') THEN
    CREATE POLICY "Users can view their projects"
      ON projects FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = projects.id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: Users in same org can create projects
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Users can create projects in their org') THEN
    CREATE POLICY "Users can create projects in their org"
      ON projects FOR INSERT
      TO authenticated
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM users WHERE auth_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: Coordinators and admins can update projects
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Project coordinators and admins can update projects') THEN
    CREATE POLICY "Project coordinators and admins can update projects"
      ON projects FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = projects.id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('coordinator', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = projects.id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('coordinator', 'admin')
        )
      );
  END IF;
END $$;

-- Policy: Admins can delete projects
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Project admins can delete projects') THEN
    CREATE POLICY "Project admins can delete projects"
      ON projects FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = projects.id
            AND u.auth_id = auth.uid()
            AND pm.role = 'admin'
        )
      );
  END IF;
END $$;

-- Update project_memberships RLS policies

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view/manage project memberships" ON project_memberships;

-- Policy: Users can view memberships of projects they belong to
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_memberships' AND policyname = 'Users can view memberships of their projects') THEN
    CREATE POLICY "Users can view memberships of their projects"
      ON project_memberships FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm2
          INNER JOIN users u ON u.id = pm2.user_id
          WHERE pm2.project_id = project_memberships.project_id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: Allow system to create membership (for trigger)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_memberships' AND policyname = 'System can create memberships') THEN
    CREATE POLICY "System can create memberships"
      ON project_memberships FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Policy: Coordinators and admins can manage memberships
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_memberships' AND policyname = 'Coordinators and admins can manage memberships') THEN
    CREATE POLICY "Coordinators and admins can manage memberships"
      ON project_memberships FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = project_memberships.project_id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('coordinator', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = project_memberships.project_id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('coordinator', 'admin')
        )
      );
  END IF;
END $$;

-- Policy: Admins can delete memberships
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_memberships' AND policyname = 'Admins can delete memberships') THEN
    CREATE POLICY "Admins can delete memberships"
      ON project_memberships FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = project_memberships.project_id
            AND u.auth_id = auth.uid()
            AND pm.role = 'admin'
        )
      );
  END IF;
END $$;
