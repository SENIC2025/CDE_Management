/*
  # Organisation Members and Plans & Governance Module

  1. New Tables
    - `organisation_members`
      - Links users to organisations with org-level roles
      - Needed for org-level admin permissions

    - `plan_catalog`
      - Stores default entitlements for each plan tier
      - plan_tier (PK): project, portfolio, organisation
      - name, description
      - default_entitlements_json: all feature flags and limits

    - `organisation_plans`
      - Tracks current plan for each organisation
      - org_id (UNIQUE): links to organisations
      - plan_tier: current tier (project/portfolio/organisation)
      - status: active, trial, suspended
      - starts_at, ends_at: plan period
      - entitlements_json: org-specific overrides

    - `organisation_governance_settings`
      - Org-level governance controls and defaults
      - org_id (UNIQUE): links to organisations
      - org_defaults_json: default settings for new projects
      - methodology_governance_mode: project_only, org_approved
      - template_governance_mode: project_only, org_shared, org_locked
      - branding_json: logo, footer, disclaimer

  2. Security
    - Enable RLS on all new tables
    - Org members can read their org's plan
    - Only org admins can update plans and governance settings
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
      AND om.user_id = auth.uid()
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
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update organisation members"
  ON organisation_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members AS om
      WHERE om.org_id = organisation_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members AS om
      WHERE om.org_id = organisation_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete organisation members"
  ON organisation_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members AS om
      WHERE om.org_id = organisation_members.org_id
      AND om.user_id = auth.uid()
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
  org_defaults_json jsonb NOT NULL DEFAULT '{}',
  methodology_governance_mode text NOT NULL DEFAULT 'project_only' CHECK (methodology_governance_mode IN ('project_only', 'org_approved')),
  template_governance_mode text NOT NULL DEFAULT 'project_only' CHECK (template_governance_mode IN ('project_only', 'org_shared', 'org_locked')),
  branding_json jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organisation_plans_org_id ON organisation_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_organisation_plans_status ON organisation_plans(status);
CREATE INDEX IF NOT EXISTS idx_organisation_governance_settings_org_id ON organisation_governance_settings(org_id);

-- Enable RLS
ALTER TABLE plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_governance_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plan_catalog
CREATE POLICY "Plan catalog is readable by all authenticated users"
  ON plan_catalog
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for organisation_plans
CREATE POLICY "Users can read their organisation's plan"
  ON organisation_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_plans.org_id
      AND organisation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can insert their organisation's plan"
  ON organisation_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_plans.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update their organisation's plan"
  ON organisation_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_plans.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_plans.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete their organisation's plan"
  ON organisation_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_plans.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  );

-- RLS Policies for organisation_governance_settings
CREATE POLICY "Users can read their organisation's governance settings"
  ON organisation_governance_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_governance_settings.org_id
      AND organisation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can insert their organisation's governance settings"
  ON organisation_governance_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_governance_settings.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update their organisation's governance settings"
  ON organisation_governance_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_governance_settings.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_governance_settings.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete their organisation's governance settings"
  ON organisation_governance_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = organisation_governance_settings.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  );

-- Seed plan_catalog with default plans
INSERT INTO plan_catalog (plan_tier, name, description, default_entitlements_json) VALUES
(
  'project',
  'Project',
  'Single project management with core CDE features',
  jsonb_build_object(
    'max_projects', 1,
    'portfolio_dashboard_enabled', false,
    'cross_project_reporting_enabled', false,
    'shared_templates_enabled', false,
    'shared_indicator_library_enabled', false,
    'org_level_methodology_enabled', false,
    'org_defaults_enabled', false,
    'export_branding_enabled', false,
    'compliance_profiles_enabled', true,
    'override_governance_enabled', true
  )
),
(
  'portfolio',
  'Portfolio',
  'Multi-project portfolio management with cross-project insights',
  jsonb_build_object(
    'max_projects', 10,
    'portfolio_dashboard_enabled', true,
    'cross_project_reporting_enabled', true,
    'shared_templates_enabled', true,
    'shared_indicator_library_enabled', true,
    'org_level_methodology_enabled', false,
    'org_defaults_enabled', true,
    'export_branding_enabled', true,
    'compliance_profiles_enabled', true,
    'override_governance_enabled', true
  )
),
(
  'organisation',
  'Organisation',
  'Full enterprise governance with unlimited projects and org-level controls',
  jsonb_build_object(
    'max_projects', null,
    'portfolio_dashboard_enabled', true,
    'cross_project_reporting_enabled', true,
    'shared_templates_enabled', true,
    'shared_indicator_library_enabled', true,
    'org_level_methodology_enabled', true,
    'org_defaults_enabled', true,
    'export_branding_enabled', true,
    'compliance_profiles_enabled', true,
    'override_governance_enabled', true
  )
)
ON CONFLICT (plan_tier) DO NOTHING;
