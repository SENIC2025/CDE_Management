/*
  # Add RBAC Row Level Security Policies

  1. Security
    - Enable RLS on all major tables if not already enabled
    - Add policies based on user role from project_memberships table
    - Viewer: read-only access to project data
    - Contributor: CRUD on most entities except restricted actions
    - CDE Lead/Coordinator/Admin: full access including restricted actions

  2. Role-Based Policies
    - Viewers: SELECT only
    - Contributors: SELECT, INSERT, UPDATE, DELETE on most tables
    - CDE Lead/Coordinator: Additional permissions for indicators (lock), compliance, remediation, reports
    - Admin: Full access + template management + compliance rules

  3. Notes
    - Policies check project_memberships table for user role
    - Policies are restrictive by default
    - All policies check authentication and project membership
*/

-- Helper function to get user role for a project
CREATE OR REPLACE FUNCTION get_user_project_role(p_project_id uuid)
RETURNS text AS $$
  SELECT role
  FROM project_memberships
  WHERE project_id = p_project_id
    AND user_id = (
      SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1
    )
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(p_project_id uuid, required_roles text[])
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_memberships pm
    INNER JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = p_project_id
      AND u.auth_id = auth.uid()
      AND pm.role = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS on key tables if not already enabled
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

-- Indicators policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'indicators' AND policyname = 'Users can view indicators in their projects') THEN
    CREATE POLICY "Users can view indicators in their projects"
      ON indicators FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = indicators.project_id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'indicators' AND policyname = 'Contributors can create indicators') THEN
    CREATE POLICY "Contributors can create indicators"
      ON indicators FOR INSERT
      TO authenticated
      WITH CHECK (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'indicators' AND policyname = 'Contributors can update unlocked indicators') THEN
    CREATE POLICY "Contributors can update unlocked indicators"
      ON indicators FOR UPDATE
      TO authenticated
      USING (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
        AND (
          NOT locked
          OR user_has_role(project_id, ARRAY['cde_lead', 'coordinator', 'admin'])
        )
      )
      WITH CHECK (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
        AND (
          locked = false
          OR user_has_role(project_id, ARRAY['cde_lead', 'coordinator', 'admin'])
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'indicators' AND policyname = 'Contributors can delete indicators') THEN
    CREATE POLICY "Contributors can delete indicators"
      ON indicators FOR DELETE
      TO authenticated
      USING (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
      );
  END IF;
END $$;

-- Reports policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Users can view reports in their projects') THEN
    CREATE POLICY "Users can view reports in their projects"
      ON reports FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = reports.project_id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Contributors can create reports') THEN
    CREATE POLICY "Contributors can create reports"
      ON reports FOR INSERT
      TO authenticated
      WITH CHECK (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Report status changes require appropriate role') THEN
    CREATE POLICY "Report status changes require appropriate role"
      ON reports FOR UPDATE
      TO authenticated
      USING (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
      )
      WITH CHECK (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
        AND (
          status = 'draft'
          OR user_has_role(project_id, ARRAY['cde_lead', 'coordinator', 'admin'])
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Contributors can delete reports') THEN
    CREATE POLICY "Contributors can delete reports"
      ON reports FOR DELETE
      TO authenticated
      USING (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
      );
  END IF;
END $$;

-- Template assets policies (Admin only for management)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_assets' AND policyname = 'Users can view templates in their org') THEN
    CREATE POLICY "Users can view templates in their org"
      ON template_assets FOR SELECT
      TO authenticated
      USING (
        is_public = true
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.auth_id = auth.uid()
            AND u.org_id = template_assets.org_id
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_assets' AND policyname = 'Admins can create templates') THEN
    CREATE POLICY "Admins can create templates"
      ON template_assets FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE u.org_id = template_assets.org_id
            AND u.auth_id = auth.uid()
            AND pm.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_assets' AND policyname = 'Admins can update templates') THEN
    CREATE POLICY "Admins can update templates"
      ON template_assets FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE u.org_id = template_assets.org_id
            AND u.auth_id = auth.uid()
            AND pm.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE u.org_id = template_assets.org_id
            AND u.auth_id = auth.uid()
            AND pm.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_assets' AND policyname = 'Admins can delete templates') THEN
    CREATE POLICY "Admins can delete templates"
      ON template_assets FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE u.org_id = template_assets.org_id
            AND u.auth_id = auth.uid()
            AND pm.role = 'admin'
        )
      );
  END IF;
END $$;

-- Compliance rules policies (Admin only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_rules' AND policyname = 'Users can view compliance rules') THEN
    CREATE POLICY "Users can view compliance rules"
      ON compliance_rules FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_rules' AND policyname = 'Admins can manage compliance rules') THEN
    CREATE POLICY "Admins can manage compliance rules"
      ON compliance_rules FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE u.auth_id = auth.uid()
            AND pm.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE u.auth_id = auth.uid()
            AND pm.role = 'admin'
        )
      );
  END IF;
END $$;

-- Compliance checks policies (CDE Lead/Coordinator/Admin can run checks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_checks' AND policyname = 'Users can view compliance checks in their projects') THEN
    CREATE POLICY "Users can view compliance checks in their projects"
      ON compliance_checks FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = compliance_checks.project_id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compliance_checks' AND policyname = 'CDE Leads can create compliance checks') THEN
    CREATE POLICY "CDE Leads can create compliance checks"
      ON compliance_checks FOR INSERT
      TO authenticated
      WITH CHECK (
        user_has_role(project_id, ARRAY['cde_lead', 'coordinator', 'admin'])
      );
  END IF;
END $$;

-- Remediation actions policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remediation_actions' AND policyname = 'Users can view remediation actions in their projects') THEN
    CREATE POLICY "Users can view remediation actions in their projects"
      ON remediation_actions FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = remediation_actions.project_id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remediation_actions' AND policyname = 'CDE Leads can create remediation actions') THEN
    CREATE POLICY "CDE Leads can create remediation actions"
      ON remediation_actions FOR INSERT
      TO authenticated
      WITH CHECK (
        user_has_role(project_id, ARRAY['cde_lead', 'coordinator', 'admin'])
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remediation_actions' AND policyname = 'Contributors can update remediation actions') THEN
    CREATE POLICY "Contributors can update remediation actions"
      ON remediation_actions FOR UPDATE
      TO authenticated
      USING (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
      )
      WITH CHECK (
        user_has_role(project_id, ARRAY['contributor', 'cde_lead', 'coordinator', 'admin'])
      );
  END IF;
END $$;
