/*
  # Productization Features: Onboarding, Plan Comparison, Security

  1. New Tables
    - `onboarding_status`
      - Tracks onboarding wizard completion per organisation
      - org_id (UNIQUE): links to organisations
      - project_id: first project created during onboarding
      - checklist_json: completion status per step
      - completed_at: when wizard was completed
      - Audit fields: created_by, updated_by, timestamps

    - `user_last_seen`
      - Tracks user activity for security panel
      - user_id, org_id: composite unique key
      - last_seen_at: timestamp of last activity
      - Updated on app load or significant actions

  2. Security
    - Enable RLS on all new tables
    - Org members can read onboarding_status
    - Org admins/coordinators can update onboarding_status
    - Only same-org users can see user_last_seen

  3. Indexes
    - Optimize queries for security panel and onboarding checks
*/

-- Create onboarding_status table
CREATE TABLE IF NOT EXISTS onboarding_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid UNIQUE NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  checklist_json jsonb NOT NULL DEFAULT '{
    "plan_reviewed": false,
    "project_created": false,
    "reporting_periods_set": false,
    "template_pack_applied": false,
    "decision_support_configured": false,
    "methodology_approved": false,
    "members_invited": false
  }',
  completed_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

-- Create user_last_seen table
CREATE TABLE IF NOT EXISTS user_last_seen (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  last_seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, org_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_status_org_id ON onboarding_status(org_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_completed ON onboarding_status(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_last_seen_org_id ON user_last_seen(org_id);
CREATE INDEX IF NOT EXISTS idx_user_last_seen_last_seen_at ON user_last_seen(last_seen_at DESC);

-- Enable RLS
ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_last_seen ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_status
CREATE POLICY "Users can read their organisation's onboarding status"
  ON onboarding_status
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = onboarding_status.org_id
      AND organisation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins and coordinators can insert onboarding status"
  ON onboarding_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = onboarding_status.org_id
      AND organisation_members.user_id = auth.uid()
      AND organisation_members.role = 'admin'
    )
  );

CREATE POLICY "Org admins and coordinators can update onboarding status"
  ON onboarding_status
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = onboarding_status.org_id
      AND om.user_id = auth.uid()
      AND (
        om.role = 'admin'
        OR EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.user_id = auth.uid()
          AND pm.role IN ('coordinator', 'cde_lead')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = onboarding_status.org_id
      AND om.user_id = auth.uid()
      AND (
        om.role = 'admin'
        OR EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.user_id = auth.uid()
          AND pm.role IN ('coordinator', 'cde_lead')
        )
      )
    )
  );

-- RLS Policies for user_last_seen
CREATE POLICY "Users can read last seen data for their org members"
  ON user_last_seen
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = user_last_seen.org_id
      AND organisation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upsert their own last seen timestamp"
  ON user_last_seen
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own last seen timestamp"
  ON user_last_seen
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
