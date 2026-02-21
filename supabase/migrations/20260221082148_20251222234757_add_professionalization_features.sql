/*
  # Add Professionalization Features

  1. New Tables
    - `decision_flag_overrides`: Track flag override workflow with rationale
    - `project_methodologies`: Version-controlled methodology definitions

  2. Security
    - Enable RLS on both tables
    - CDE Lead/Coordinator/Admin can create/update
    - Viewer/Contributor read-only
*/

CREATE TABLE IF NOT EXISTS decision_flag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_id text,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  flag_code text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  rationale text DEFAULT '',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_flag_override UNIQUE (project_id, period_id, entity_type, entity_id, flag_code),
  CONSTRAINT valid_status CHECK (status IN ('open', 'acknowledged', 'not_applicable', 'false_positive', 'resolved'))
);

CREATE TABLE IF NOT EXISTS project_methodologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_rationale text DEFAULT '',
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_methodology_status CHECK (status IN ('draft', 'approved')),
  CONSTRAINT unique_project_version UNIQUE (project_id, version)
);

ALTER TABLE decision_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_methodologies ENABLE ROW LEVEL SECURITY;

-- RLS policies for decision_flag_overrides
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decision_flag_overrides' AND policyname = 'Users can view overrides for their projects') THEN
    CREATE POLICY "Users can view overrides for their projects"
      ON decision_flag_overrides FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = decision_flag_overrides.project_id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decision_flag_overrides' AND policyname = 'CDE Lead and above can create overrides') THEN
    CREATE POLICY "CDE Lead and above can create overrides"
      ON decision_flag_overrides FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = decision_flag_overrides.project_id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('cde_lead', 'coordinator', 'admin')
        )
        AND created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decision_flag_overrides' AND policyname = 'CDE Lead and above can update overrides') THEN
    CREATE POLICY "CDE Lead and above can update overrides"
      ON decision_flag_overrides FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = decision_flag_overrides.project_id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('cde_lead', 'coordinator', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = decision_flag_overrides.project_id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('cde_lead', 'coordinator', 'admin')
        )
        AND updated_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

-- RLS policies for project_methodologies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_methodologies' AND policyname = 'Users can view methodologies for their projects') THEN
    CREATE POLICY "Users can view methodologies for their projects"
      ON project_methodologies FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = project_methodologies.project_id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_methodologies' AND policyname = 'CDE Lead and above can create methodologies') THEN
    CREATE POLICY "CDE Lead and above can create methodologies"
      ON project_methodologies FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = project_methodologies.project_id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('cde_lead', 'coordinator', 'admin')
        )
        AND created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_methodologies' AND policyname = 'CDE Lead and above can update methodologies') THEN
    CREATE POLICY "CDE Lead and above can update methodologies"
      ON project_methodologies FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = project_methodologies.project_id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('cde_lead', 'coordinator', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = project_methodologies.project_id
            AND u.auth_id = auth.uid()
            AND pm.role IN ('cde_lead', 'coordinator', 'admin')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flag_overrides_project ON decision_flag_overrides(project_id, period_id);
CREATE INDEX IF NOT EXISTS idx_flag_overrides_entity ON decision_flag_overrides(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_methodologies_project ON project_methodologies(project_id);
CREATE INDEX IF NOT EXISTS idx_methodologies_status ON project_methodologies(project_id, status);
