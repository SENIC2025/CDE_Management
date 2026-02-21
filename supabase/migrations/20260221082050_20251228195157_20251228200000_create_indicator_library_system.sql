/*
  # Create Indicator Library System

  1. New Tables
    - `indicator_library`: Central library of indicators
      - Approved indicators with standard definitions
      - code (UNIQUE): Identifier
      - title, description, measurement_unit, category
      - is_approved: Boolean approval status
    
    - `indicator_taxonomy`: Hierarchical classification
      - parent_id: For nested categories
      - level: Depth in hierarchy
    
    - `indicator_library_usage`: Track usage across projects
      - project_id: Where indicator is used
      - indicator_lib_id: Reference to library
      - custom_title: Allow local overrides
      - last_used_at: For cleanup/analytics

  2. Security
    - Enable RLS on all tables
    - Users can view approved indicators
    - Admins can manage library entries
*/

CREATE TABLE IF NOT EXISTS indicator_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  measurement_unit text,
  category text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS indicator_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_lib_id uuid REFERENCES indicator_library(id) ON DELETE CASCADE,
  category_code text NOT NULL,
  category_name text NOT NULL,
  parent_id uuid REFERENCES indicator_taxonomy(id) ON DELETE CASCADE,
  level integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS indicator_library_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  indicator_lib_id uuid NOT NULL REFERENCES indicator_library(id) ON DELETE CASCADE,
  custom_title text,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, indicator_lib_id)
);

CREATE INDEX IF NOT EXISTS idx_indicator_library_code ON indicator_library(code);
CREATE INDEX IF NOT EXISTS idx_indicator_library_category ON indicator_library(category);
CREATE INDEX IF NOT EXISTS idx_indicator_library_approved ON indicator_library(is_approved);
CREATE INDEX IF NOT EXISTS idx_indicator_taxonomy_category ON indicator_taxonomy(category_code);
CREATE INDEX IF NOT EXISTS idx_indicator_taxonomy_parent ON indicator_taxonomy(parent_id);
CREATE INDEX IF NOT EXISTS idx_indicator_lib_usage_project ON indicator_library_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_indicator_lib_usage_lib ON indicator_library_usage(indicator_lib_id);

ALTER TABLE indicator_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_library_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view approved indicators"
  ON indicator_library FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Admins can view all indicators"
  ON indicator_library FOR SELECT
  TO authenticated
  USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Project members can view indicator usage"
  ON indicator_library_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = indicator_library_usage.project_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Contributors can create indicator usage"
  ON indicator_library_usage FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = indicator_library_usage.project_id
        AND u.auth_id = auth.uid()
        AND pm.role IN ('contributor', 'cde_lead', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Taxonomy is readable by authenticated users"
  ON indicator_taxonomy FOR SELECT
  TO authenticated
  USING (true);
