/*
  # Organisation Members and Plans & Governance Module

  1. New Tables
    - `organisation_members`: Links users to organisations with org-level roles
    - `organisation_plans`: Tracks current plan for each organisation  
    - `organisation_governance_settings`: Org-level governance controls
    - `plan_catalog`: Stores default entitlements for each plan tier
*/

-- Create organisation_members table
CREATE TABLE IF NOT EXISTS organisation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organisation_members_org_id ON organisation_members(org_id);
CREATE INDEX IF NOT EXISTS idx_organisation_members_user_id ON organisation_members(user_id);

ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read organisation members for their org"
  ON organisation_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members AS om
      WHERE om.org_id = organisation_members.org_id
      AND om.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Org admins can insert organisation members"
  ON organisation_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members AS om
      WHERE om.org_id = organisation_members.org_id
      AND om.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND om.role = 'admin'
    )
  );

-- Create plan_catalog table
CREATE TABLE IF NOT EXISTS plan_catalog (
  plan_tier text PRIMARY KEY CHECK (plan_tier IN ('project', 'portfolio', 'organisation')),
  name text NOT NULL,
  description text NOT NULL,
  default_entitlements_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create organisation_plans table
CREATE TABLE IF NOT EXISTS organisation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid UNIQUE NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  plan_tier text NOT NULL REFERENCES plan_catalog(plan_tier),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended')),
  max_projects integer DEFAULT 3,
  max_users integer DEFAULT 5,
  storage_gb integer DEFAULT 10,
  api_calls_per_month integer DEFAULT 10000,
  features jsonb DEFAULT '[]'::jsonb,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  entitlements_json jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

-- Create organisation_governance_settings table
CREATE TABLE IF NOT EXISTS organisation_governance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid UNIQUE NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  require_approval_for_project_creation boolean DEFAULT false,
  require_mfa_for_admins boolean DEFAULT false,
  password_policy text DEFAULT 'standard',
  session_timeout_minutes integer DEFAULT 480,
  allowed_domains text[],
  starter_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  org_defaults_json jsonb NOT NULL DEFAULT '{}',
  methodology_governance_mode text NOT NULL DEFAULT 'project_only' CHECK (methodology_governance_mode IN ('project_only', 'org_approved')),
  template_governance_mode text NOT NULL DEFAULT 'project_only' CHECK (template_governance_mode IN ('project_only', 'org_shared', 'org_locked')),
  branding_json jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organisation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_governance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org plan"
  ON organisation_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.org_id = organisation_plans.org_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their org governance settings"
  ON organisation_governance_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.org_id = organisation_governance_settings.org_id
        AND u.auth_id = auth.uid()
    )
  );

-- Seed plan catalog
INSERT INTO plan_catalog (plan_tier, name, description, default_entitlements_json)
VALUES 
  ('project', 'Project', 'Single project tier', '{"features": ["basic_reports"]}'::jsonb),
  ('portfolio', 'Portfolio', 'Multi-project tier', '{"features": ["basic_reports", "portfolio_view"]}'::jsonb),
  ('organisation', 'Organisation', 'Full organisation tier', '{"features": ["basic_reports", "portfolio_view", "advanced_analytics"]}'::jsonb)
ON CONFLICT DO NOTHING;
