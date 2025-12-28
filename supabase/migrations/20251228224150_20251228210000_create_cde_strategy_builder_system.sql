/*
  # CDE Strategy Builder System

  1. New Tables
    - `cde_strategies`
      - Stores project strategy with template, status, focus, cadence, and roles
      - One-to-one with projects
      - Supports draft/review/approved workflow
    - `cde_strategy_objectives`
      - Structured objective mapping for strategies
      - Tracks objective type, priority, stakeholder types, expected outcomes
    - `cde_strategy_channel_plan`
      - Channel planning with intensity and frequency
      - Links channels to objectives
    - `cde_strategy_generated_items`
      - Tracks system-generated items to avoid duplicates
      - Records activities, objectives, KPIs created by strategy builder

  2. Security
    - Enable RLS on all tables
    - Project members can read strategies
    - Coordinators/admins can create and update strategies
    - Only coordinators/admins can approve strategies

  3. Important Notes
    - Uses JSONB for flexible focus, cadence, and roles configuration
    - Integrates with existing activities and KPI systems
    - Supports autosave workflow with status tracking
    - Template-driven planning for standardized approaches
*/

-- Create cde_strategies table
CREATE TABLE IF NOT EXISTS cde_strategies (
  strategy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_started', 'draft', 'ready_for_review', 'approved')) DEFAULT 'draft',
  template_code text,
  focus_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  cadence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  roles_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cde_strategies ENABLE ROW LEVEL SECURITY;

-- Project members can read strategies
CREATE POLICY "Project members can read strategies"
  ON cde_strategies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = cde_strategies.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Project coordinators can insert strategies
CREATE POLICY "Project coordinators can create strategies"
  ON cde_strategies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = cde_strategies.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Project coordinators can update strategies
CREATE POLICY "Project coordinators can update strategies"
  ON cde_strategies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = cde_strategies.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = cde_strategies.project_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Create cde_strategy_objectives table
CREATE TABLE IF NOT EXISTS cde_strategy_objectives (
  strategy_objective_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES cde_strategies(strategy_id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  objective_type text NOT NULL CHECK (objective_type IN ('awareness', 'engagement', 'capacity_building', 'uptake', 'policy_influence', 'sustainability')),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  stakeholder_types text[] DEFAULT '{}',
  expected_outcome text NOT NULL CHECK (expected_outcome IN ('visibility', 'knowledge', 'capability', 'adoption', 'policy_reference', 'sustainability')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cde_strategy_objectives ENABLE ROW LEVEL SECURITY;

-- Project members can read strategy objectives
CREATE POLICY "Project members can read strategy objectives"
  ON cde_strategy_objectives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_objectives.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Project coordinators can insert strategy objectives
CREATE POLICY "Project coordinators can create strategy objectives"
  ON cde_strategy_objectives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_objectives.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Project coordinators can update strategy objectives
CREATE POLICY "Project coordinators can update strategy objectives"
  ON cde_strategy_objectives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_objectives.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_objectives.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Project coordinators can delete strategy objectives
CREATE POLICY "Project coordinators can delete strategy objectives"
  ON cde_strategy_objectives FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_objectives.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Create cde_strategy_channel_plan table
CREATE TABLE IF NOT EXISTS cde_strategy_channel_plan (
  channel_plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES cde_strategies(strategy_id) ON DELETE CASCADE,
  channel_type text NOT NULL,
  intensity text NOT NULL CHECK (intensity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  frequency_json jsonb DEFAULT '{}'::jsonb,
  linked_objective_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cde_strategy_channel_plan ENABLE ROW LEVEL SECURITY;

-- Project members can read channel plans
CREATE POLICY "Project members can read channel plans"
  ON cde_strategy_channel_plan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_channel_plan.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Project coordinators can insert channel plans
CREATE POLICY "Project coordinators can create channel plans"
  ON cde_strategy_channel_plan FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_channel_plan.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Project coordinators can update channel plans
CREATE POLICY "Project coordinators can update channel plans"
  ON cde_strategy_channel_plan FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_channel_plan.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_channel_plan.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Project coordinators can delete channel plans
CREATE POLICY "Project coordinators can delete channel plans"
  ON cde_strategy_channel_plan FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_channel_plan.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Create cde_strategy_generated_items table
CREATE TABLE IF NOT EXISTS cde_strategy_generated_items (
  generated_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES cde_strategies(strategy_id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('activity', 'objective', 'kpi')),
  entity_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cde_strategy_generated_items ENABLE ROW LEVEL SECURITY;

-- Project members can read generated items
CREATE POLICY "Project members can read generated items"
  ON cde_strategy_generated_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_generated_items.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Project coordinators can insert generated items
CREATE POLICY "Project coordinators can create generated items"
  ON cde_strategy_generated_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cde_strategies
      JOIN project_memberships ON project_memberships.project_id = cde_strategies.project_id
      WHERE cde_strategies.strategy_id = cde_strategy_generated_items.strategy_id
      AND project_memberships.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cde_strategies_project_id ON cde_strategies(project_id);
CREATE INDEX IF NOT EXISTS idx_cde_strategy_objectives_strategy_id ON cde_strategy_objectives(strategy_id);
CREATE INDEX IF NOT EXISTS idx_cde_strategy_channel_plan_strategy_id ON cde_strategy_channel_plan(strategy_id);
CREATE INDEX IF NOT EXISTS idx_cde_strategy_generated_items_strategy_id ON cde_strategy_generated_items(strategy_id);
CREATE INDEX IF NOT EXISTS idx_cde_strategy_generated_items_entity ON cde_strategy_generated_items(entity_type, entity_id);
