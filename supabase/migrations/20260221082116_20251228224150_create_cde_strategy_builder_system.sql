/*
  # Create CDE Strategy Builder System

  1. New Tables
    - `strategy_documents`: Strategy/M&E documents
    - `strategy_theory_of_change`: Theory of change narratives
    - `strategy_assumptions`: Key assumptions
    - `strategy_risks`: Risk register
    
  2. Security
    - Enable RLS
    - Project members can view
    - CDE Leads/Coordinators can edit
*/

CREATE TABLE IF NOT EXISTS strategy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  title text NOT NULL,
  content_json jsonb,
  status text DEFAULT 'draft',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strategy_theory_of_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  narrative text,
  impact_pathways jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strategy_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  validity_period text,
  status text DEFAULT 'active',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strategy_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  likelihood text,
  impact text,
  mitigation_strategy text,
  status text DEFAULT 'identified',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_docs_project ON strategy_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_strategy_toc_project ON strategy_theory_of_change(project_id);
CREATE INDEX IF NOT EXISTS idx_strategy_assumptions_project ON strategy_assumptions(project_id);
CREATE INDEX IF NOT EXISTS idx_strategy_risks_project ON strategy_risks(project_id);

ALTER TABLE strategy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_theory_of_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_risks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Strategy Documents
CREATE POLICY "Project members can view strategy documents"
  ON strategy_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = strategy_documents.project_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "CDE Leads can manage strategy documents"
  ON strategy_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = strategy_documents.project_id
        AND u.auth_id = auth.uid()
        AND pm.role IN ('cde_lead', 'coordinator', 'admin')
    )
  );

-- RLS Policies for Theory of Change
CREATE POLICY "Project members can view theory of change"
  ON strategy_theory_of_change FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = strategy_theory_of_change.project_id
        AND u.auth_id = auth.uid()
    )
  );

-- RLS Policies for Assumptions
CREATE POLICY "Project members can view assumptions"
  ON strategy_assumptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = strategy_assumptions.project_id
        AND u.auth_id = auth.uid()
    )
  );

-- RLS Policies for Risks
CREATE POLICY "Project members can view risks"
  ON strategy_risks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = strategy_risks.project_id
        AND u.auth_id = auth.uid()
    )
  );
