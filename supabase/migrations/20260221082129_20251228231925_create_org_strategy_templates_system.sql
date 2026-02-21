/*
  # Create Organisation Strategy Templates System

  1. New Tables
    - `strategy_templates`: Organisation-level templates
    - `template_sections`: Template structure and content
    - `template_assets`: Template resources and artifacts
    
  2. Security
    - Enable RLS
    - Org members can view org templates
    - Admins can manage templates
*/

CREATE TABLE IF NOT EXISTS strategy_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  template_data jsonb,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES strategy_templates(id) ON DELETE CASCADE,
  section_name text NOT NULL,
  section_order integer,
  content jsonb,
  guidance_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES strategy_templates(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  asset_type text,
  asset_name text,
  asset_data jsonb,
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_templates_org ON strategy_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_template_sections_template ON template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_template_assets_template ON template_assets(template_id);
CREATE INDEX IF NOT EXISTS idx_template_assets_org ON template_assets(org_id);

ALTER TABLE strategy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Strategy Templates
CREATE POLICY "Org members can view strategy templates"
  ON strategy_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.org_id = strategy_templates.org_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage strategy templates"
  ON strategy_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.org_id = strategy_templates.org_id
        AND u.auth_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- RLS Policies for Template Sections
CREATE POLICY "Org members can view template sections"
  ON template_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategy_templates st
      INNER JOIN organisation_members om ON om.org_id = st.org_id
      INNER JOIN users u ON u.id = om.user_id
      WHERE st.id = template_sections.template_id
        AND u.auth_id = auth.uid()
    )
  );

-- RLS Policies for Template Assets
CREATE POLICY "Public assets visible to authenticated users"
  ON template_assets FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Org members can view org assets"
  ON template_assets FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    EXISTS (
      SELECT 1 FROM organisation_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.org_id = template_assets.org_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage template assets"
  ON template_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.org_id = template_assets.org_id
        AND u.auth_id = auth.uid()
        AND om.role = 'admin'
    )
  );
