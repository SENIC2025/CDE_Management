/*
  # Create Base Schema

  1. Core Tables
    - organisations: Multi-tenant support
    - users: User accounts with Supabase auth integration
    - projects: Project management
    - audit_events: Complete audit trail
    
  2. Content Tables
    - activities: Programme activities
    - indicators: Key indicators for measurement
    - indicator_values: Time-series indicator data
    - evidence_items: Supporting evidence/documentation
    - evidence_links: Relationship between evidence and activities/indicators
    - reports: Project reports
    
  3. Compliance Tables
    - compliance_rules: Compliance rule definitions
    - compliance_checks: Compliance assessments per project/period
    - remediation_actions: Actions to address non-compliance
    - compliance_status: Overall compliance status tracking
    
  4. Relationship Tables
    - project_memberships: User membership in projects
    - objectives: Strategic objectives
    
  5. Security
    - Enable RLS on sensitive tables
    - Basic policies for multi-tenancy
*/

-- =====================================================
-- A) CORE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  programme_profile text,
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  reporting_periods jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS project_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'contributor',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  timestamp timestamptz DEFAULT now()
);

-- =====================================================
-- B) CONTENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'active',
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective_id uuid REFERENCES objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  domain text,
  status text DEFAULT 'active',
  completeness_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  measurement_unit text,
  target_value numeric,
  status text DEFAULT 'active',
  locked boolean DEFAULT false,
  completeness_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS indicator_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  value numeric,
  period text,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text,
  content_url text,
  content_blob bytea,
  context text,
  extraction_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_item_id uuid NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  indicator_id uuid REFERENCES indicators(id) ON DELETE CASCADE,
  linked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  period text,
  status text DEFAULT 'draft',
  content jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- C) COMPLIANCE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_profile text NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  logic_json jsonb NOT NULL,
  severity text NOT NULL,
  evidence_required boolean,
  active boolean DEFAULT true,
  scope text DEFAULT 'project',
  applies_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_id text NOT NULL,
  status text NOT NULL,
  issues_json jsonb,
  checked_at timestamptz,
  checked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS remediation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_check_id uuid NOT NULL REFERENCES compliance_checks(id) ON DELETE CASCADE,
  task_id uuid,
  issue_code text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  remediation_suggestion text,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  overall_status text,
  last_review_date timestamptz,
  next_review_date timestamptz,
  compliant_requirements jsonb DEFAULT '[]'::jsonb,
  non_compliant_requirements jsonb DEFAULT '[]'::jsonb,
  not_applicable_requirements jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- D) DECISION SUPPORT
-- =====================================================

CREATE TABLE IF NOT EXISTS decision_support_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  description text,
  metadata jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- E) ENABLE RLS
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_support_flags ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- F) BASIC RLS POLICIES
-- =====================================================

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can view projects they're members of"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = projects.id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view objectives"
  ON objectives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = objectives.project_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = activities.project_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view indicators"
  ON indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = indicators.project_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view evidence"
  ON evidence_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = evidence_items.project_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = reports.project_id
        AND u.auth_id = auth.uid()
    )
  );
