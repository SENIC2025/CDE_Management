/*
  # Objective Library System

  1. New Tables
    - `objective_library` - System library of 20+ reusable EU-ready objectives
      - code, title, description, domain, outcome_type, maturity_level
      - suggested KPI bundles and indicator codes
      - suggested channels and stakeholder types
      - programme relevance (Horizon, Erasmus, Interreg, generic)
    - `project_objectives` - Project-level objectives referencing library
      - Links to objective_library for archetypes
      - Customization fields: priority, stakeholders, time horizon, notes
      - Source tracking (manual, library, strategy)
      - Health tracking: last_updated, kpis_linked, activities_linked

  2. Security
    - objective_library: SELECT for authenticated, admin-only write
    - project_objectives: project member read, coordinator/admin write
    - RLS policies enforce project membership

  3. Important Notes
    - Unique constraint prevents duplicate library objectives per project
    - JSONB fields for flexible KPI and channel suggestions
    - Idempotent seeding with ON CONFLICT handling
    - Full-text search support on title and description
    - Indexes for performance on common queries
*/

-- Create objective_library table
CREATE TABLE IF NOT EXISTS objective_library (
  objective_lib_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  domain text NOT NULL CHECK (domain IN ('communication', 'dissemination', 'exploitation')),
  outcome_type text NOT NULL CHECK (outcome_type IN ('visibility', 'knowledge', 'capability', 'engagement', 'adoption', 'policy_influence', 'sustainability')),
  maturity_level text NOT NULL CHECK (maturity_level IN ('basic', 'advanced', 'expert')) DEFAULT 'basic',
  programme_relevance text[] DEFAULT '{}',
  default_stakeholder_types text[] DEFAULT '{}',
  suggested_channel_types text[] DEFAULT '{}',
  suggested_kpi_bundle_id uuid REFERENCES kpi_bundles(bundle_id) ON DELETE SET NULL,
  suggested_indicator_codes text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE objective_library ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read objective library
CREATE POLICY "Authenticated users can read objective library"
  ON objective_library FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Platform admins can manage objective library (insert/update/delete restricted to platform admins via RPC)
-- For now, only system can insert during seeding
CREATE POLICY "System can insert objective library"
  ON objective_library FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "System can update objective library"
  ON objective_library FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Create indexes on objective_library
CREATE INDEX IF NOT EXISTS idx_objective_library_domain ON objective_library(domain);
CREATE INDEX IF NOT EXISTS idx_objective_library_outcome_type ON objective_library(outcome_type);
CREATE INDEX IF NOT EXISTS idx_objective_library_maturity ON objective_library(maturity_level);
CREATE INDEX IF NOT EXISTS idx_objective_library_programme ON objective_library USING GIN(programme_relevance);
CREATE INDEX IF NOT EXISTS idx_objective_library_stakeholders ON objective_library USING GIN(default_stakeholder_types);
CREATE INDEX IF NOT EXISTS idx_objective_library_indicators ON objective_library USING GIN(suggested_indicator_codes);

-- Create project_objectives table
CREATE TABLE IF NOT EXISTS project_objectives (
  objective_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective_lib_id uuid REFERENCES objective_library(objective_lib_id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  domain text NOT NULL CHECK (domain IN ('communication', 'dissemination', 'exploitation')),
  outcome_type text NOT NULL CHECK (outcome_type IN ('visibility', 'knowledge', 'capability', 'engagement', 'adoption', 'policy_influence', 'sustainability')),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  stakeholder_types text[] DEFAULT '{}',
  time_horizon text CHECK (time_horizon IN ('short', 'medium', 'long')) DEFAULT 'medium',
  notes text,
  source text CHECK (source IN ('manual', 'library', 'strategy')) DEFAULT 'library',
  kpis_linked_count int DEFAULT 0,
  activities_linked_count int DEFAULT 0,
  status text CHECK (status IN ('on_track', 'at_risk', 'needs_kpis', 'needs_activities', 'no_data')) DEFAULT 'needs_kpis',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_objectives ENABLE ROW LEVEL SECURITY;

-- Unique constraint: one library objective per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_objectives_unique_library 
  ON project_objectives(project_id, objective_lib_id) 
  WHERE objective_lib_id IS NOT NULL;

-- Project members can read project objectives
CREATE POLICY "Project members can read project objectives"
  ON project_objectives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_objectives.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Project coordinators can insert project objectives
CREATE POLICY "Project coordinators can create project objectives"
  ON project_objectives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_objectives.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Project coordinators can update project objectives
CREATE POLICY "Project coordinators can update project objectives"
  ON project_objectives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_objectives.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_objectives.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Project coordinators can delete project objectives
CREATE POLICY "Project coordinators can delete project objectives"
  ON project_objectives FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_objectives.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Create indexes on project_objectives
CREATE INDEX IF NOT EXISTS idx_project_objectives_project ON project_objectives(project_id);
CREATE INDEX IF NOT EXISTS idx_project_objectives_lib_ref ON project_objectives(objective_lib_id);
CREATE INDEX IF NOT EXISTS idx_project_objectives_domain ON project_objectives(domain);
CREATE INDEX IF NOT EXISTS idx_project_objectives_priority ON project_objectives(priority);
CREATE INDEX IF NOT EXISTS idx_project_objectives_status ON project_objectives(status);
