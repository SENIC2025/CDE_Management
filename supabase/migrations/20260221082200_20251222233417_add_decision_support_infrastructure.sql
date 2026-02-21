/*
  # Add Decision Support Infrastructure

  1. New Tables
    - `saved_views`: Store user-defined filtered views
    
  2. Changes
    - Add `settings_json` to projects table

  3. Security
    - Enable RLS on saved_views
    - Users can view/manage saved views for projects they're members of
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'settings_json'
  ) THEN
    ALTER TABLE projects ADD COLUMN settings_json jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

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

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_saved_views_project ON saved_views(project_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_entity_type ON saved_views(entity_type);
