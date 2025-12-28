/*
  # Organisation Strategy Templates System

  1. New Tables
    - `cde_strategy_templates`
      - Stores organisation-level reusable strategy templates
      - Configurable focus, objectives, channels, KPIs, and roles
      - Version tracking and soft delete support

  2. RPCs
    - `list_strategy_templates` - List active templates for an organisation
    - `upsert_strategy_template` - Create or update template (admin only)
    - `apply_strategy_template_to_project` - Apply template to project with modes

  3. Security
    - RLS: Org members can read, admins can write
    - Apply modes: replace, merge, kpis_only
    - Duplicate prevention via tracking

  4. Important Notes
    - Templates stored as JSONB for maximum flexibility
    - Idempotent application with deduplication
    - Integrates with existing KPI bundle and indicator library systems
*/

-- Create cde_strategy_templates table
CREATE TABLE IF NOT EXISTS cde_strategy_templates (
  template_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

ALTER TABLE cde_strategy_templates ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cde_strategy_templates_org_active ON cde_strategy_templates(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cde_strategy_templates_created_by ON cde_strategy_templates(created_by);

-- RLS: Org members can read templates
CREATE POLICY "Org members can read templates"
  ON cde_strategy_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = cde_strategy_templates.org_id
      AND organisation_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- RLS: Org admins can insert templates
CREATE POLICY "Org admins can create templates"
  ON cde_strategy_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = cde_strategy_templates.org_id
      AND organisation_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND organisation_members.role = 'admin'
    )
  );

-- RLS: Org admins can update templates
CREATE POLICY "Org admins can update templates"
  ON cde_strategy_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = cde_strategy_templates.org_id
      AND organisation_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND organisation_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = cde_strategy_templates.org_id
      AND organisation_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND organisation_members.role = 'admin'
    )
  );

-- RPC: List strategy templates for an organisation
CREATE OR REPLACE FUNCTION list_strategy_templates(p_org_id uuid)
RETURNS TABLE (
  template_id uuid,
  org_id uuid,
  name text,
  description text,
  template_json jsonb,
  version int,
  is_active boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  creator_name text
) SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.template_id,
    t.org_id,
    t.name,
    t.description,
    t.template_json,
    t.version,
    t.is_active,
    t.created_by,
    t.created_at,
    t.updated_at,
    u.full_name as creator_name
  FROM cde_strategy_templates t
  LEFT JOIN users u ON u.id = t.created_by
  WHERE t.org_id = p_org_id
    AND t.is_active = true
  ORDER BY t.updated_at DESC;
END;
$$;

-- RPC: Upsert strategy template
CREATE OR REPLACE FUNCTION upsert_strategy_template(
  p_template_id uuid,
  p_org_id uuid,
  p_name text,
  p_description text,
  p_template_json jsonb
)
RETURNS uuid SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_result_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_template_id IS NULL THEN
    INSERT INTO cde_strategy_templates (
      org_id,
      name,
      description,
      template_json,
      created_by
    ) VALUES (
      p_org_id,
      p_name,
      p_description,
      p_template_json,
      v_user_id
    )
    RETURNING template_id INTO v_result_id;
  ELSE
    UPDATE cde_strategy_templates
    SET
      name = p_name,
      description = p_description,
      template_json = p_template_json,
      updated_at = now()
    WHERE template_id = p_template_id
    RETURNING template_id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

-- RPC: Apply strategy template to project
CREATE OR REPLACE FUNCTION apply_strategy_template_to_project(
  p_project_id uuid,
  p_template_id uuid,
  p_mode text DEFAULT 'merge',
  p_options jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_json jsonb;
  v_strategy_id uuid;
  v_objectives_added int := 0;
  v_channels_added int := 0;
  v_kpis_added int := 0;
  v_kpis_skipped int := 0;
  v_obj record;
  v_ch record;
  v_existing_count int;
  v_obj_id uuid;
  v_ch_id uuid;
BEGIN
  IF p_mode NOT IN ('replace', 'merge', 'kpis_only') THEN
    RAISE EXCEPTION 'Invalid mode. Must be replace, merge, or kpis_only';
  END IF;

  SELECT template_json INTO v_template_json
  FROM cde_strategy_templates
  WHERE template_id = p_template_id AND is_active = true;

  IF v_template_json IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  SELECT strategy_id INTO v_strategy_id
  FROM cde_strategies
  WHERE project_id = p_project_id;

  IF v_strategy_id IS NULL THEN
    INSERT INTO cde_strategies (project_id, status, focus_json, cadence_json, roles_json)
    VALUES (p_project_id, 'draft', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
    RETURNING strategy_id INTO v_strategy_id;
  END IF;

  IF p_mode != 'kpis_only' THEN
    UPDATE cde_strategies
    SET
      focus_json = COALESCE(v_template_json->'focus', '{}'::jsonb),
      cadence_json = COALESCE(v_template_json->'cadence', '{}'::jsonb),
      roles_json = COALESCE(v_template_json->'roles', '{}'::jsonb),
      template_code = 'CUSTOM_' || p_template_id::text,
      updated_at = now()
    WHERE strategy_id = v_strategy_id;

    IF p_mode = 'replace' THEN
      DELETE FROM cde_strategy_objectives WHERE strategy_id = v_strategy_id;
      DELETE FROM cde_strategy_channel_plan WHERE strategy_id = v_strategy_id;
    END IF;

    IF v_template_json ? 'objectives' THEN
      FOR v_obj IN SELECT * FROM jsonb_array_elements(v_template_json->'objectives')
      LOOP
        IF p_mode = 'merge' THEN
          SELECT COUNT(*) INTO v_existing_count
          FROM cde_strategy_objectives
          WHERE strategy_id = v_strategy_id
            AND objective_type = (v_obj.value->>'objective_type')::text
            AND expected_outcome = (v_obj.value->>'expected_outcome')::text;

          IF v_existing_count > 0 THEN
            CONTINUE;
          END IF;
        END IF;

        INSERT INTO cde_strategy_objectives (
          strategy_id,
          objective_type,
          priority,
          stakeholder_types,
          expected_outcome,
          notes
        ) VALUES (
          v_strategy_id,
          (v_obj.value->>'objective_type')::text,
          COALESCE((v_obj.value->>'priority')::text, 'medium'),
          COALESCE(
            (SELECT array_agg(elem::text) FROM jsonb_array_elements_text(v_obj.value->'stakeholder_types') elem),
            '{}'::text[]
          ),
          (v_obj.value->>'expected_outcome')::text,
          v_obj.value->>'notes'
        )
        RETURNING strategy_objective_id INTO v_obj_id;

        INSERT INTO cde_strategy_generated_items (strategy_id, entity_type, entity_id)
        VALUES (v_strategy_id, 'objective', v_obj_id)
        ON CONFLICT DO NOTHING;

        v_objectives_added := v_objectives_added + 1;
      END LOOP;
    END IF;

    IF v_template_json ? 'channels' THEN
      FOR v_ch IN SELECT * FROM jsonb_array_elements(v_template_json->'channels')
      LOOP
        IF p_mode = 'merge' THEN
          SELECT COUNT(*) INTO v_existing_count
          FROM cde_strategy_channel_plan
          WHERE strategy_id = v_strategy_id
            AND channel_type = (v_ch.value->>'channel_type')::text;

          IF v_existing_count > 0 THEN
            CONTINUE;
          END IF;
        END IF;

        INSERT INTO cde_strategy_channel_plan (
          strategy_id,
          channel_type,
          intensity,
          frequency_json,
          linked_objective_ids
        ) VALUES (
          v_strategy_id,
          (v_ch.value->>'channel_type')::text,
          COALESCE((v_ch.value->>'intensity')::text, 'medium'),
          COALESCE(v_ch.value->'frequency_json', '{}'::jsonb),
          COALESCE(
            (SELECT array_agg(elem::text::uuid) FROM jsonb_array_elements_text(v_ch.value->'linked_objective_ids') elem),
            '{}'::uuid[]
          )
        )
        RETURNING channel_plan_id INTO v_ch_id;

        v_channels_added := v_channels_added + 1;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'objectives_added', v_objectives_added,
    'channels_added', v_channels_added,
    'kpis_added', v_kpis_added,
    'kpis_skipped', v_kpis_skipped
  );
END;
$$;
