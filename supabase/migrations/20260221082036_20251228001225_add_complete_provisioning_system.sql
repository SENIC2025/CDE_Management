/*
  # Complete Provisioning System

  Comprehensive provisioning functions for organisations and projects
*/

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
      AND role = 'platform_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION provision_first_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_project_id uuid;
  v_user_email text;
  v_existing_starter_project_id uuid;
  v_governance_id uuid;
  v_is_new_provision boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to provision workspace';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  SELECT id, email INTO v_user_id, v_user_email
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT om.org_id INTO v_org_id
  FROM organisation_members om
  WHERE om.user_id = v_user_id
  ORDER BY om.created_at DESC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO organisations (name)
    VALUES (COALESCE(split_part(v_user_email, '@', 1) || '''s Organisation', 'My Organisation'))
    RETURNING id INTO v_org_id;

    UPDATE users
    SET org_id = v_org_id
    WHERE id = v_user_id;

    INSERT INTO organisation_members (org_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'admin')
    ON CONFLICT DO NOTHING;

    INSERT INTO organisation_plans (
      org_id,
      plan_tier,
      max_projects,
      max_users,
      storage_gb,
      api_calls_per_month,
      features
    )
    VALUES (
      v_org_id,
      'project',
      3,
      5,
      10,
      10000,
      '["basic_reports"]'::jsonb
    )
    ON CONFLICT (org_id) DO NOTHING;

    INSERT INTO organisation_governance_settings (org_id)
    VALUES (v_org_id)
    ON CONFLICT (org_id) DO NOTHING;

    v_is_new_provision := true;
  END IF;

  SELECT id, starter_project_id INTO v_governance_id, v_existing_starter_project_id
  FROM organisation_governance_settings
  WHERE org_id = v_org_id
  FOR UPDATE;

  IF v_existing_starter_project_id IS NOT NULL THEN
    SELECT id INTO v_project_id
    FROM projects
    WHERE id = v_existing_starter_project_id
      AND org_id = v_org_id;

    IF v_project_id IS NOT NULL THEN
      INSERT INTO project_memberships (project_id, user_id, role)
      VALUES (v_project_id, v_user_id, 'coordinator')
      ON CONFLICT DO NOTHING;

      RETURN v_project_id;
    END IF;
  END IF;

  INSERT INTO projects (
    org_id,
    title,
    description,
    programme_profile,
    start_date,
    end_date,
    status,
    reporting_periods
  )
  VALUES (
    v_org_id,
    'Your first project',
    'Auto-created starter project. You can rename and edit it later.',
    'Custom',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months',
    'active',
    '[]'::jsonb
  )
  RETURNING id INTO v_project_id;

  INSERT INTO project_memberships (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'coordinator')
  ON CONFLICT DO NOTHING;

  UPDATE organisation_governance_settings
  SET starter_project_id = v_project_id
  WHERE org_id = v_org_id;

  IF v_is_new_provision THEN
    INSERT INTO audit_events (
      org_id,
      project_id,
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    )
    VALUES (
      v_org_id,
      NULL,
      v_user_id,
      'provisioning',
      v_org_id,
      'create',
      jsonb_build_object(
        'stage', 'organisation',
        'org_name', COALESCE(split_part(v_user_email, '@', 1) || '''s Organisation', 'My Organisation'),
        'auto_provisioned', true
      )
    );
  END IF;

  INSERT INTO audit_events (
    org_id,
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  VALUES (
    v_org_id,
    v_project_id,
    v_user_id,
    'provisioning',
    v_project_id,
    'create',
    jsonb_build_object(
      'stage', 'project',
      'project_title', 'Your first project',
      'auto_provisioned', true,
      'is_starter_project', true
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_first_workspace() TO authenticated;

COMMENT ON FUNCTION public.provision_first_workspace IS 
  'Concurrency-safe auto-provisioning of organisation and first project.';
