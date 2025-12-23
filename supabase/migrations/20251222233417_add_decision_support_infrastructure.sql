/*
  # Add Decision Support Infrastructure

  1. New Tables
    - `saved_views`: Store user-defined filtered views
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `entity_type` (text) - activities, objectives, evidence, etc.
      - `name` (text) - user-defined name
      - `filters_json` (jsonb) - stored filter criteria
      - `is_default` (boolean) - system-provided defaults
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Changes
    - Add `settings_json` to projects table for project-level configs (hourly_rate, etc.)
    - Add indexes for decision support queries

  3. Security
    - Enable RLS on saved_views
    - Users can view/manage saved views for projects they're members of
*/

-- Add settings_json to projects table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'settings_json'
  ) THEN
    ALTER TABLE projects ADD COLUMN settings_json jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create saved_views table
CREATE TABLE IF NOT EXISTS saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  name text NOT NULL,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on saved_views
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_views
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_views' AND policyname = 'Users can view saved views for their projects') THEN
    CREATE POLICY "Users can view saved views for their projects"
      ON saved_views FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = saved_views.project_id
            AND u.auth_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_views' AND policyname = 'Users can create saved views for their projects') THEN
    CREATE POLICY "Users can create saved views for their projects"
      ON saved_views FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_memberships pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = saved_views.project_id
            AND u.auth_id = auth.uid()
        )
        AND created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_views' AND policyname = 'Users can update their own saved views') THEN
    CREATE POLICY "Users can update their own saved views"
      ON saved_views FOR UPDATE
      TO authenticated
      USING (
        created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      )
      WITH CHECK (
        created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_views' AND policyname = 'Users can delete their own saved views') THEN
    CREATE POLICY "Users can delete their own saved views"
      ON saved_views FOR DELETE
      TO authenticated
      USING (
        created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_links_activity ON evidence_links(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_links_indicator ON evidence_links(indicator_id) WHERE indicator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_links_asset ON evidence_links(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_links_publication ON evidence_links(publication_item_id) WHERE publication_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_end_date_project ON activities(project_id, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_domain_project ON activities(project_id, domain) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_uptake_created_project ON uptake_opportunities(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id, submitted_at);

CREATE INDEX IF NOT EXISTS idx_qual_outcome_project_activity ON qualitative_outcome_logs(project_id, activity_id);

CREATE INDEX IF NOT EXISTS idx_indicator_values_indicator_period ON indicator_values(indicator_id, period_id);

-- Insert default saved views
INSERT INTO saved_views (project_id, entity_type, name, filters_json, is_default, created_by)
SELECT 
  p.id as project_id,
  'activities' as entity_type,
  'Public-facing activities' as name,
  '{"domain": "dissemination", "status": ["completed", "in_progress"]}'::jsonb as filters_json,
  true as is_default,
  NULL as created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM saved_views sv 
  WHERE sv.project_id = p.id 
    AND sv.name = 'Public-facing activities' 
    AND sv.is_default = true
);

INSERT INTO saved_views (project_id, entity_type, name, filters_json, is_default, created_by)
SELECT 
  p.id as project_id,
  'activities' as entity_type,
  'Needs approval' as name,
  '{"status": ["draft", "review"]}'::jsonb as filters_json,
  true as is_default,
  NULL as created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM saved_views sv 
  WHERE sv.project_id = p.id 
    AND sv.name = 'Needs approval' 
    AND sv.is_default = true
);
