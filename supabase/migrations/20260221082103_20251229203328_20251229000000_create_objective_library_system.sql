/*
  # Create Objective Library System

  1. New Tables
    - `objective_library`: Central library of strategic objectives
      - Approved objectives with standard definitions
      - code (UNIQUE): Identifier
      - title, description, category
      - is_approved: Boolean approval status
    
    - `project_objectives`: Project-specific objective instances
      - objective_lib_id: Reference to library (nullable for custom)
      - project_id: Where objective is used
      - status: active, completed, archived
      - created_at, updated_at for audit

  2. Security
    - Enable RLS on all tables
    - Users can view approved objectives
    - Project members can create/manage objectives
*/

CREATE TABLE IF NOT EXISTS objective_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective_lib_id uuid REFERENCES objective_library(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'active',
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_objective_library_code ON objective_library(code);
CREATE INDEX IF NOT EXISTS idx_objective_library_category ON objective_library(category);
CREATE INDEX IF NOT EXISTS idx_objective_library_approved ON objective_library(is_approved);
CREATE INDEX IF NOT EXISTS idx_project_objectives_project ON project_objectives(project_id);
CREATE INDEX IF NOT EXISTS idx_project_objectives_lib ON project_objectives(objective_lib_id);
CREATE INDEX IF NOT EXISTS idx_project_objectives_status ON project_objectives(status);

ALTER TABLE objective_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_objectives ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view approved objectives"
  ON objective_library FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Admins can view all objectives"
  ON objective_library FOR SELECT
  TO authenticated
  USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Project members can view project objectives"
  ON project_objectives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = project_objectives.project_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Contributors can create project objectives"
  ON project_objectives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = project_objectives.project_id
        AND u.auth_id = auth.uid()
        AND pm.role IN ('contributor', 'cde_lead', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Contributors can update project objectives"
  ON project_objectives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = project_objectives.project_id
        AND u.auth_id = auth.uid()
        AND pm.role IN ('contributor', 'cde_lead', 'coordinator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = project_objectives.project_id
        AND u.auth_id = auth.uid()
        AND pm.role IN ('contributor', 'cde_lead', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Contributors can delete project objectives"
  ON project_objectives FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = project_objectives.project_id
        AND u.auth_id = auth.uid()
        AND pm.role IN ('contributor', 'cde_lead', 'coordinator', 'admin')
    )
  );
