/*
  # Fix Strategy Templates RPC Reliability

  1. Helper Functions
    - `get_user_display_name` - Safe SECURITY DEFINER function to get user names without RLS recursion

  2. Updated RPCs
    - `list_strategy_templates` - Fixed to avoid RLS issues and handle missing users gracefully
    - Add proper grants for all template functions

  3. Important Notes
    - Uses SECURITY DEFINER with safe search_path to prevent SQL injection
    - Avoids RLS recursion by using helper functions
    - Returns templates even if creator profile lookup fails
*/

-- Helper function to get user display name safely
CREATE OR REPLACE FUNCTION get_user_display_name(p_user_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT COALESCE(full_name, email, 'Unknown')
  INTO v_name
  FROM users
  WHERE id = p_user_id;

  RETURN COALESCE(v_name, 'Unknown');
END;
$$;

-- Updated list_strategy_templates with better error handling
DROP FUNCTION IF EXISTS list_strategy_templates(uuid);

CREATE FUNCTION list_strategy_templates(p_org_id uuid)
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
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_is_member boolean;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation ID is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE organisation_members.org_id = p_org_id
      AND organisation_members.user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'User is not a member of this organisation';
  END IF;

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
    get_user_display_name(t.created_by) as creator_name
  FROM cde_strategy_templates t
  WHERE t.org_id = p_org_id
    AND t.is_active = true
  ORDER BY t.updated_at DESC;
END;
$$;

-- Updated upsert_strategy_template with better validation
DROP FUNCTION IF EXISTS upsert_strategy_template(uuid, uuid, text, text, jsonb);

CREATE FUNCTION upsert_strategy_template(
  p_template_id uuid,
  p_org_id uuid,
  p_name text,
  p_description text,
  p_template_json jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_result_id uuid;
  v_is_admin boolean;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation ID is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;

  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE organisation_members.org_id = p_org_id
      AND organisation_members.user_id = v_user_id
      AND organisation_members.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only organisation admins can create or update templates';
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
      COALESCE(p_template_json, '{}'::jsonb),
      v_user_id
    )
    RETURNING template_id INTO v_result_id;
  ELSE
    UPDATE cde_strategy_templates
    SET
      name = p_name,
      description = p_description,
      template_json = COALESCE(p_template_json, '{}'::jsonb),
      updated_at = now()
    WHERE template_id = p_template_id
      AND org_id = p_org_id
    RETURNING template_id INTO v_result_id;

    IF v_result_id IS NULL THEN
      RAISE EXCEPTION 'Template not found or access denied';
    END IF;
  END IF;

  RETURN v_result_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_display_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION list_strategy_templates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_strategy_template(uuid, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_strategy_template_to_project(uuid, uuid, text, jsonb) TO authenticated;
