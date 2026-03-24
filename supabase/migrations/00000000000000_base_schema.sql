-- =====================================================
-- BASE SCHEMA FOR CDE MANAGER
-- Created: 2026-02-21
-- This migration creates all base tables and policies
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organisations
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id uuid NOT NULL UNIQUE,
  org_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project Memberships
CREATE TABLE IF NOT EXISTS project_memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Organisation Members
CREATE TABLE IF NOT EXISTS organisation_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- =====================================================
-- PLANS & GOVERNANCE
-- =====================================================

-- Plan Catalog
CREATE TABLE IF NOT EXISTS plan_catalog (
  plan_tier text PRIMARY KEY,
  name text NOT NULL,
  description text,
  default_entitlements_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed plan catalog
INSERT INTO plan_catalog (plan_tier, name, description, default_entitlements_json) VALUES
  ('project', 'Project', 'Single project tier', '{"features":["basic_reports"]}'::jsonb),
  ('portfolio', 'Portfolio', 'Multi-project tier', '{"features":["basic_reports","portfolio_view"]}'::jsonb),
  ('organisation', 'Organisation', 'Full organisation tier', '{"features":["basic_reports","portfolio_view","advanced_analytics"]}'::jsonb)
ON CONFLICT (plan_tier) DO NOTHING;

-- Organisation Plans
CREATE TABLE IF NOT EXISTS organisation_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE UNIQUE,
  plan_tier text NOT NULL REFERENCES plan_catalog(plan_tier),
  entitlements_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organisation Governance Settings
CREATE TABLE IF NOT EXISTS organisation_governance_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE UNIQUE,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ACTIVITIES & OBJECTIVES
-- =====================================================

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  domain text,
  status text DEFAULT 'planned',
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Objectives
CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project Objectives
CREATE TABLE IF NOT EXISTS project_objectives (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective_id uuid REFERENCES objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  owner text,
  kpis jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Objective Library
CREATE TABLE IF NOT EXISTS objective_library (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  category text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDICATORS
-- =====================================================

-- Indicators
CREATE TABLE IF NOT EXISTS indicators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text,
  target_value numeric,
  locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indicator Values
CREATE TABLE IF NOT EXISTS indicator_values (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  indicator_id uuid NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indicator Library
CREATE TABLE IF NOT EXISTS indicator_library (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  category text,
  calculation_method text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indicator Library Usage
CREATE TABLE IF NOT EXISTS indicator_library_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  indicator_library_id uuid NOT NULL REFERENCES indicator_library(id) ON DELETE CASCADE,
  indicator_id uuid REFERENCES indicators(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, indicator_library_id)
);

-- Indicator Taxonomy
CREATE TABLE IF NOT EXISTS indicator_taxonomy (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text,
  parent_id uuid REFERENCES indicator_taxonomy(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- EVIDENCE
-- =====================================================

-- Evidence Items
CREATE TABLE IF NOT EXISTS evidence_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text,
  file_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Evidence Links
CREATE TABLE IF NOT EXISTS evidence_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_item_id uuid NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  indicator_id uuid REFERENCES indicators(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- COMPLIANCE
-- =====================================================

-- Compliance Rules
CREATE TABLE IF NOT EXISTS compliance_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  rule_type text,
  conditions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Compliance Checks
CREATE TABLE IF NOT EXISTS compliance_checks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES compliance_rules(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  checked_at timestamptz,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Compliance Status
CREATE TABLE IF NOT EXISTS compliance_status (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  overall_status text DEFAULT 'unknown',
  last_checked timestamptz,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Remediation Actions
CREATE TABLE IF NOT EXISTS remediation_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  compliance_check_id uuid REFERENCES compliance_checks(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text DEFAULT 'pending',
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- REPORTS & AUDIT
-- =====================================================

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text,
  entity_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Saved Views
CREATE TABLE IF NOT EXISTS saved_views (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  view_type text,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- DECISION SUPPORT
-- =====================================================

-- Decision Support Flags
CREATE TABLE IF NOT EXISTS decision_support_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text DEFAULT 'info',
  entity_type text,
  entity_id uuid,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Decision Flag Overrides
CREATE TABLE IF NOT EXISTS decision_flag_overrides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id uuid NOT NULL REFERENCES decision_support_flags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rationale text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- STRATEGY
-- =====================================================

-- Strategy Templates
CREATE TABLE IF NOT EXISTS strategy_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_data jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Strategy Theory of Change
CREATE TABLE IF NOT EXISTS strategy_theory_of_change (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inputs jsonb DEFAULT '[]'::jsonb,
  activities jsonb DEFAULT '[]'::jsonb,
  outputs jsonb DEFAULT '[]'::jsonb,
  outcomes jsonb DEFAULT '[]'::jsonb,
  impact jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Strategy Risks
CREATE TABLE IF NOT EXISTS strategy_risks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  risk_description text NOT NULL,
  likelihood text,
  impact text,
  mitigation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Strategy Assumptions
CREATE TABLE IF NOT EXISTS strategy_assumptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assumption text NOT NULL,
  validation_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Strategy Documents
CREATE TABLE IF NOT EXISTS strategy_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text,
  file_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- TEMPLATES
-- =====================================================

-- Template Assets
CREATE TABLE IF NOT EXISTS template_assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  asset_type text,
  file_path text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Template Sections
CREATE TABLE IF NOT EXISTS template_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id uuid REFERENCES strategy_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  section_order integer,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- METHODOLOGIES
-- =====================================================

-- Project Methodologies
CREATE TABLE IF NOT EXISTS project_methodologies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  methodology_name text NOT NULL,
  description text,
  framework jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_governance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_library_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_support_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_theory_of_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_methodologies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - USERS
-- =====================================================

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- =====================================================
-- RLS POLICIES - PROJECTS
-- =====================================================

CREATE POLICY "Users can view projects they're members of"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = projects.id
      AND project_memberships.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create projects in their org"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.org_id = projects.org_id
    )
  );

CREATE POLICY "Project coordinators and admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = projects.id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('coordinator', 'admin')
    )
  );

CREATE POLICY "Project admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = projects.id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - PROJECT MEMBERSHIPS
-- =====================================================

CREATE POLICY "Users can view memberships of their projects"
  ON project_memberships FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "System can create memberships"
  ON project_memberships FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Coordinators and admins can manage memberships"
  ON project_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      WHERE pm.project_id = project_memberships.project_id
      AND pm.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND pm.role IN ('coordinator', 'admin')
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON project_memberships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      WHERE pm.project_id = project_memberships.project_id
      AND pm.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND pm.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - ORGANISATION MEMBERS
-- =====================================================

CREATE POLICY "Users can read organisation members for their org"
  ON organisation_members FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Org admins can insert organisation members"
  ON organisation_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = organisation_members.org_id
      AND om.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND om.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - PLANS
-- =====================================================

CREATE POLICY "Users can view their org plan"
  ON organisation_plans FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- RLS POLICIES - GOVERNANCE
-- =====================================================

CREATE POLICY "Users can view their org governance settings"
  ON organisation_governance_settings FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- RLS POLICIES - ACTIVITIES
-- =====================================================

CREATE POLICY "Project members can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - OBJECTIVES
-- =====================================================

CREATE POLICY "Project members can view objectives"
  ON objectives FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - PROJECT OBJECTIVES
-- =====================================================

CREATE POLICY "Project members can view project objectives"
  ON project_objectives FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Contributors can create project objectives"
  ON project_objectives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_objectives.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Contributors can update project objectives"
  ON project_objectives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_objectives.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Contributors can delete project objectives"
  ON project_objectives FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_objectives.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - OBJECTIVE LIBRARY
-- =====================================================

CREATE POLICY "Authenticated users can view approved objectives"
  ON objective_library FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Admins can view all objectives"
  ON objective_library FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND organisation_members.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - INDICATORS
-- =====================================================

CREATE POLICY "Project members can view indicators"
  ON indicators FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Contributors can create indicators"
  ON indicators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = indicators.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Contributors can update unlocked indicators"
  ON indicators FOR UPDATE
  TO authenticated
  USING (
    locked = false
    AND EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = indicators.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Contributors can delete indicators"
  ON indicators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = indicators.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - INDICATOR LIBRARY
-- =====================================================

CREATE POLICY "Authenticated users can view approved indicators"
  ON indicator_library FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Admins can view all indicators"
  ON indicator_library FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND organisation_members.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - INDICATOR LIBRARY USAGE
-- =====================================================

CREATE POLICY "Project members can view indicator usage"
  ON indicator_library_usage FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Contributors can create indicator usage"
  ON indicator_library_usage FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = indicator_library_usage.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - INDICATOR TAXONOMY
-- =====================================================

CREATE POLICY "Project members can view taxonomy"
  ON indicator_taxonomy FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- RLS POLICIES - EVIDENCE
-- =====================================================

CREATE POLICY "Project members can view evidence"
  ON evidence_items FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - COMPLIANCE
-- =====================================================

CREATE POLICY "Users can view compliance rules"
  ON compliance_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage compliance rules"
  ON compliance_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND organisation_members.role = 'admin'
    )
  );

CREATE POLICY "Users can view compliance checks in their projects"
  ON compliance_checks FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "CDE Leads can create compliance checks"
  ON compliance_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = compliance_checks.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('cde_lead', 'coordinator', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - REMEDIATION
-- =====================================================

CREATE POLICY "Users can view remediation actions in their projects"
  ON remediation_actions FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "CDE Leads can create remediation actions"
  ON remediation_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = remediation_actions.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('cde_lead', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Contributors can update remediation actions"
  ON remediation_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = remediation_actions.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - REPORTS
-- =====================================================

CREATE POLICY "Project members can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Contributors can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = reports.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Report status changes require appropriate role"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = reports.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Contributors can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = reports.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('contributor', 'coordinator', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - SAVED VIEWS
-- =====================================================

CREATE POLICY "Users can view saved views for their projects"
  ON saved_views FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Users can create saved views for their projects"
  ON saved_views FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update their own saved views"
  ON saved_views FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can delete their own saved views"
  ON saved_views FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- RLS POLICIES - DECISION SUPPORT
-- =====================================================

CREATE POLICY "Users can view overrides for their projects"
  ON decision_flag_overrides FOR SELECT
  TO authenticated
  USING (
    flag_id IN (
      SELECT id FROM decision_support_flags
      WHERE project_id IN (
        SELECT project_id FROM project_memberships
        WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  );

CREATE POLICY "CDE Lead and above can create overrides"
  ON decision_flag_overrides FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM decision_support_flags dsf
      JOIN project_memberships pm ON pm.project_id = dsf.project_id
      WHERE dsf.id = decision_flag_overrides.flag_id
      AND pm.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND pm.role IN ('cde_lead', 'coordinator', 'admin')
    )
  );

CREATE POLICY "CDE Lead and above can update overrides"
  ON decision_flag_overrides FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM decision_support_flags dsf
      JOIN project_memberships pm ON pm.project_id = dsf.project_id
      WHERE dsf.id = decision_flag_overrides.flag_id
      AND pm.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND pm.role IN ('cde_lead', 'coordinator', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - STRATEGY
-- =====================================================

CREATE POLICY "Org members can view strategy templates"
  ON strategy_templates FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR org_id IN (SELECT org_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Org admins can manage strategy templates"
  ON strategy_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = strategy_templates.org_id
      AND organisation_members.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND organisation_members.role = 'admin'
    )
  );

CREATE POLICY "Project members can view theory of change"
  ON strategy_theory_of_change FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Project members can view risks"
  ON strategy_risks FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "CDE Leads can manage strategy documents"
  ON strategy_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = strategy_documents.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('cde_lead', 'coordinator', 'admin')
    )
  );

CREATE POLICY "Project members can view strategy documents"
  ON strategy_documents FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - TEMPLATES
-- =====================================================

CREATE POLICY "Org members can view org assets"
  ON template_assets FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR org_id IN (SELECT org_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Public assets visible to authenticated users"
  ON template_assets FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Org admins can manage template assets"
  ON template_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = template_assets.org_id
      AND organisation_members.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND organisation_members.role = 'admin'
    )
  );

CREATE POLICY "Org members can view template sections"
  ON template_sections FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM strategy_templates
      WHERE is_public = true
      OR org_id IN (SELECT org_id FROM users WHERE auth_id = auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - METHODOLOGIES
-- =====================================================

CREATE POLICY "Users can view methodologies for their projects"
  ON project_methodologies FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_memberships
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "CDE Lead and above can create methodologies"
  ON project_methodologies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_methodologies.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('cde_lead', 'coordinator', 'admin')
    )
  );

CREATE POLICY "CDE Lead and above can update methodologies"
  ON project_methodologies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships
      WHERE project_memberships.project_id = project_methodologies.project_id
      AND project_memberships.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND project_memberships.role IN ('cde_lead', 'coordinator', 'admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to bootstrap user organisation
CREATE OR REPLACE FUNCTION bootstrap_user_organisation(p_org_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_org_name text;
BEGIN
  -- Get the current user
  SELECT id, org_id INTO v_user_id, v_org_id
  FROM users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- If user already has an org, return it
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- Create organisation
  v_org_name := COALESCE(p_org_name, 'My Organisation');

  INSERT INTO organisations (name)
  VALUES (v_org_name)
  RETURNING id INTO v_org_id;

  -- Update user with org_id
  UPDATE users
  SET org_id = v_org_id, updated_at = now()
  WHERE id = v_user_id;

  -- Add user as org admin
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin');

  -- Create default org plan
  INSERT INTO organisation_plans (org_id, plan_tier)
  VALUES (v_org_id, 'project');

  -- Create default governance settings
  INSERT INTO organisation_governance_settings (org_id, settings)
  VALUES (v_org_id, '{}'::jsonb);

  RETURN v_org_id;
END;
$$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_project_id ON project_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_user_id ON project_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_indicators_project_id ON indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_project_id ON evidence_items(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_project_id ON compliance_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);

-- =====================================================
-- COMPLETE
-- =====================================================
