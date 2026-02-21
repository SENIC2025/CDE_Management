/*
  # Add Deployment-Grade Enhancements

  Production features for data integrity, performance, and auditability
*/

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities(domain);
CREATE INDEX IF NOT EXISTS idx_activities_updated_at ON activities(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_indicators_project_id ON indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_indicators_locked ON indicators(locked);
CREATE INDEX IF NOT EXISTS idx_indicators_updated_at ON indicators(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_indicator_values_indicator_id ON indicator_values(indicator_id);

CREATE INDEX IF NOT EXISTS idx_evidence_items_project_id ON evidence_items(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_type ON evidence_items(type);
CREATE INDEX IF NOT EXISTS idx_evidence_items_updated_at ON evidence_items(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_links_evidence_item_id ON evidence_links(evidence_item_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_activity_id ON evidence_links(activity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_indicator_id ON evidence_links(indicator_id);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_project_id ON compliance_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_checked_at ON compliance_checks(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON reports(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_remediation_actions_check ON remediation_actions(compliance_check_id);
CREATE INDEX IF NOT EXISTS idx_remediation_actions_status ON remediation_actions(status);

CREATE INDEX IF NOT EXISTS idx_audit_events_project_id ON audit_events(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);

-- Evidence Metadata
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_items' AND column_name = 'context') THEN
    ALTER TABLE evidence_items ADD COLUMN context text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_items' AND column_name = 'extraction_date') THEN
    ALTER TABLE evidence_items ADD COLUMN extraction_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'completeness_score') THEN
    ALTER TABLE activities ADD COLUMN completeness_score integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'indicators' AND column_name = 'completeness_score') THEN
    ALTER TABLE indicators ADD COLUMN completeness_score integer DEFAULT 0;
  END IF;
END $$;

-- Enhanced Compliance Schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_rules' AND column_name = 'scope') THEN
    ALTER TABLE compliance_rules ADD COLUMN scope text DEFAULT 'project';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_rules' AND column_name = 'applies_to') THEN
    ALTER TABLE compliance_rules ADD COLUMN applies_to text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'remediation_actions' AND column_name = 'remediation_suggestion') THEN
    ALTER TABLE remediation_actions ADD COLUMN remediation_suggestion text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'remediation_actions' AND column_name = 'project_id') THEN
    ALTER TABLE remediation_actions ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Soft Delete Support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_items' AND column_name = 'deleted_at') THEN
    ALTER TABLE evidence_items ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_items' AND column_name = 'deleted_by') THEN
    ALTER TABLE evidence_items ADD COLUMN deleted_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'deleted_at') THEN
    ALTER TABLE activities ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'indicators' AND column_name = 'deleted_at') THEN
    ALTER TABLE indicators ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_evidence_items_deleted_at ON evidence_items(deleted_at);

-- Helper Functions
CREATE OR REPLACE FUNCTION calculate_activity_completeness(p_activity_id uuid)
RETURNS integer AS $$
DECLARE
  evidence_count integer;
BEGIN
  SELECT COUNT(DISTINCT el.evidence_item_id)
  INTO evidence_count
  FROM evidence_links el
  WHERE el.activity_id = p_activity_id;
  
  RETURN CASE 
    WHEN evidence_count = 0 THEN 0
    WHEN evidence_count < 3 THEN 50
    ELSE 100
  END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_indicator_completeness(p_indicator_id uuid)
RETURNS integer AS $$
DECLARE
  evidence_count integer;
BEGIN
  SELECT COUNT(DISTINCT el.evidence_item_id)
  INTO evidence_count
  FROM evidence_links el
  WHERE el.indicator_id = p_indicator_id;
  
  RETURN CASE 
    WHEN evidence_count = 0 THEN 0
    WHEN evidence_count = 1 THEN 50
    ELSE 100
  END;
END;
$$ LANGUAGE plpgsql;

-- Update existing compliance rules
UPDATE compliance_rules 
SET scope = 'project', 
    applies_to = COALESCE(code, 'general')
WHERE scope IS NULL;
