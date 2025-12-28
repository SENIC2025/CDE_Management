/*
  # KPI & Indicator Library System

  ## Overview
  Professional indicator library for EU-funded CDE projects with project-level instantiation.
  Replaces blank KPI forms with reusable, evaluator-grade indicators.

  ## New Tables
  
  ### indicator_library
  Core library of professional indicators with:
  - Unique codes (e.g., COM-REACH-01)
  - Domain classification (communication/dissemination/exploitation)
  - Complete definitions with rationale, limitations, interpretation
  - Unit types and aggregation methods
  - Data collection metadata
  - Threshold values and defaults
  - Maturity levels (basic/advanced/expert)
  - System vs organisation-defined flags

  ### indicator_objective_types
  Many-to-many: indicators to objective types
  (awareness, engagement, capacity_building, uptake, policy_influence, sustainability)

  ### indicator_channels
  Many-to-many: indicators to channel types
  (events, website, social_media, publications, training, direct_engagement, media)

  ### indicator_stakeholders
  Many-to-many: indicators to stakeholder types
  (policymakers, practitioners, researchers, industry, civil_society, public, consortium)

  ### project_indicators
  Project-level instantiation of library indicators with:
  - Reference to library indicator (definitions stay in library)
  - Project-specific baseline and target
  - Status tracking
  - Responsible role assignment

  ## Security
  - Library SELECT: all authenticated users
  - Library INSERT/UPDATE/DELETE: org admins and platform admins only
  - Project indicators: same rules as other project-scoped entities
  - Strict tenant isolation maintained

  ## Audit Trail
  - All tables have created_at/updated_at
  - Soft delete via is_active flag
  - System indicators protected from deletion
*/

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- Domain types for indicators
DO $$ BEGIN
  CREATE TYPE indicator_domain AS ENUM ('communication', 'dissemination', 'exploitation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Unit types for measurement
DO $$ BEGIN
  CREATE TYPE indicator_unit AS ENUM ('number', 'percentage', 'binary', 'scale', 'currency');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Aggregation methods
DO $$ BEGIN
  CREATE TYPE indicator_aggregation AS ENUM ('sum', 'average', 'count', 'max', 'latest');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Data source types
DO $$ BEGIN
  CREATE TYPE indicator_data_source AS ENUM ('manual', 'analytics', 'survey', 'evidence-linked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Collection frequency
DO $$ BEGIN
  CREATE TYPE indicator_frequency AS ENUM ('per_activity', 'monthly', 'quarterly', 'annually');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Maturity levels
DO $$ BEGIN
  CREATE TYPE indicator_maturity AS ENUM ('basic', 'advanced', 'expert');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Objective types
DO $$ BEGIN
  CREATE TYPE objective_type AS ENUM ('awareness', 'engagement', 'capacity_building', 'uptake', 'policy_influence', 'sustainability');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Channel types
DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM ('events', 'website', 'social_media', 'publications', 'training', 'direct_engagement', 'media');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Stakeholder types
DO $$ BEGIN
  CREATE TYPE stakeholder_type AS ENUM ('policymakers', 'practitioners', 'researchers', 'industry', 'civil_society', 'public', 'consortium');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Project indicator status
DO $$ BEGIN
  CREATE TYPE project_indicator_status AS ENUM ('active', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLE: indicator_library
-- =====================================================

CREATE TABLE IF NOT EXISTS public.indicator_library (
  indicator_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  domain indicator_domain NOT NULL,
  
  -- Definition (evaluator-grade)
  definition text NOT NULL,
  rationale text,
  limitations text,
  interpretation_notes text,
  
  -- Measurement
  unit indicator_unit NOT NULL,
  aggregation_method indicator_aggregation NOT NULL,
  
  -- Collection
  data_source indicator_data_source NOT NULL,
  collection_frequency indicator_frequency,
  
  -- Thresholds
  good_threshold numeric,
  warning_threshold numeric,
  poor_threshold numeric,
  
  -- Defaults
  default_baseline numeric,
  default_target numeric,
  
  -- Classification
  maturity_level indicator_maturity NOT NULL,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT true,
  
  -- Organisation scope (null = system-wide, uuid = org-specific)
  org_id uuid REFERENCES public.organisations(id),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_indicator_library_domain ON public.indicator_library(domain);
CREATE INDEX IF NOT EXISTS idx_indicator_library_maturity ON public.indicator_library(maturity_level);
CREATE INDEX IF NOT EXISTS idx_indicator_library_active ON public.indicator_library(is_active);
CREATE INDEX IF NOT EXISTS idx_indicator_library_org ON public.indicator_library(org_id);

-- =====================================================
-- TABLE: indicator_objective_types
-- =====================================================

CREATE TABLE IF NOT EXISTS public.indicator_objective_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicator_library(indicator_id) ON DELETE CASCADE,
  objective_type objective_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(indicator_id, objective_type)
);

CREATE INDEX IF NOT EXISTS idx_indicator_objective_types_indicator ON public.indicator_objective_types(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_objective_types_type ON public.indicator_objective_types(objective_type);

-- =====================================================
-- TABLE: indicator_channels
-- =====================================================

CREATE TABLE IF NOT EXISTS public.indicator_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicator_library(indicator_id) ON DELETE CASCADE,
  channel_type channel_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(indicator_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_indicator_channels_indicator ON public.indicator_channels(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_channels_type ON public.indicator_channels(channel_type);

-- =====================================================
-- TABLE: indicator_stakeholders
-- =====================================================

CREATE TABLE IF NOT EXISTS public.indicator_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicator_library(indicator_id) ON DELETE CASCADE,
  stakeholder_type stakeholder_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(indicator_id, stakeholder_type)
);

CREATE INDEX IF NOT EXISTS idx_indicator_stakeholders_indicator ON public.indicator_stakeholders(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_stakeholders_type ON public.indicator_stakeholders(stakeholder_type);

-- =====================================================
-- TABLE: project_indicators
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_indicators (
  project_indicator_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  indicator_id uuid NOT NULL REFERENCES public.indicator_library(indicator_id),
  
  -- Project-specific values
  baseline numeric,
  target numeric,
  current_value numeric,
  
  -- Management
  status project_indicator_status DEFAULT 'active',
  responsible_role text,
  notes text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(project_id, indicator_id)
);

CREATE INDEX IF NOT EXISTS idx_project_indicators_project ON public.project_indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_indicators_indicator ON public.project_indicators(indicator_id);
CREATE INDEX IF NOT EXISTS idx_project_indicators_status ON public.project_indicators(status);

-- =====================================================
-- RLS POLICIES: indicator_library
-- =====================================================

ALTER TABLE public.indicator_library ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can view active indicators
CREATE POLICY indicator_library_select
  ON public.indicator_library
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      is_system = true
      OR org_id IS NULL
      OR is_platform_admin()
      OR is_org_member(org_id)
    )
  );

-- INSERT: only org admins or platform admins
CREATE POLICY indicator_library_insert
  ON public.indicator_library
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR (
      org_id IS NOT NULL
      AND is_org_admin(org_id)
    )
  );

-- UPDATE: only org admins for their indicators, platform admins for all
CREATE POLICY indicator_library_update
  ON public.indicator_library
  FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin()
    OR (
      org_id IS NOT NULL
      AND is_org_admin(org_id)
      AND is_system = false
    )
  )
  WITH CHECK (
    is_platform_admin()
    OR (
      org_id IS NOT NULL
      AND is_org_admin(org_id)
      AND is_system = false
    )
  );

-- DELETE: only platform admins (soft delete via is_active preferred)
CREATE POLICY indicator_library_delete
  ON public.indicator_library
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    AND is_system = false
  );

-- =====================================================
-- RLS POLICIES: indicator_objective_types
-- =====================================================

ALTER TABLE public.indicator_objective_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY indicator_objective_types_select
  ON public.indicator_objective_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY indicator_objective_types_insert
  ON public.indicator_objective_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.indicator_library il
      WHERE il.indicator_id = indicator_objective_types.indicator_id
        AND il.org_id IS NOT NULL
        AND is_org_admin(il.org_id)
    )
  );

CREATE POLICY indicator_objective_types_delete
  ON public.indicator_objective_types
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.indicator_library il
      WHERE il.indicator_id = indicator_objective_types.indicator_id
        AND il.org_id IS NOT NULL
        AND is_org_admin(il.org_id)
    )
  );

-- =====================================================
-- RLS POLICIES: indicator_channels
-- =====================================================

ALTER TABLE public.indicator_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY indicator_channels_select
  ON public.indicator_channels
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY indicator_channels_insert
  ON public.indicator_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.indicator_library il
      WHERE il.indicator_id = indicator_channels.indicator_id
        AND il.org_id IS NOT NULL
        AND is_org_admin(il.org_id)
    )
  );

CREATE POLICY indicator_channels_delete
  ON public.indicator_channels
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.indicator_library il
      WHERE il.indicator_id = indicator_channels.indicator_id
        AND il.org_id IS NOT NULL
        AND is_org_admin(il.org_id)
    )
  );

-- =====================================================
-- RLS POLICIES: indicator_stakeholders
-- =====================================================

ALTER TABLE public.indicator_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY indicator_stakeholders_select
  ON public.indicator_stakeholders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY indicator_stakeholders_insert
  ON public.indicator_stakeholders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.indicator_library il
      WHERE il.indicator_id = indicator_stakeholders.indicator_id
        AND il.org_id IS NOT NULL
        AND is_org_admin(il.org_id)
    )
  );

CREATE POLICY indicator_stakeholders_delete
  ON public.indicator_stakeholders
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.indicator_library il
      WHERE il.indicator_id = indicator_stakeholders.indicator_id
        AND il.org_id IS NOT NULL
        AND is_org_admin(il.org_id)
    )
  );

-- =====================================================
-- RLS POLICIES: project_indicators
-- =====================================================

ALTER TABLE public.project_indicators ENABLE ROW LEVEL SECURITY;

-- SELECT: project members can view
CREATE POLICY project_indicators_select
  ON public.project_indicators
  FOR SELECT
  TO authenticated
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_indicators.project_id
        AND (
          is_org_member(p.org_id)
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            INNER JOIN public.users u ON u.id = pm.user_id
            WHERE pm.project_id = p.id
              AND u.auth_id = auth.uid()
          )
        )
    )
  );

-- INSERT: org admins or project coordinators
CREATE POLICY project_indicators_insert
  ON public.project_indicators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_indicators.project_id
        AND (
          is_org_admin(p.org_id)
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            INNER JOIN public.users u ON u.id = pm.user_id
            WHERE pm.project_id = p.id
              AND u.auth_id = auth.uid()
              AND pm.role IN ('coordinator', 'admin')
          )
        )
    )
  );

-- UPDATE: org admins or project coordinators
CREATE POLICY project_indicators_update
  ON public.project_indicators
  FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_indicators.project_id
        AND (
          is_org_admin(p.org_id)
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            INNER JOIN public.users u ON u.id = pm.user_id
            WHERE pm.project_id = p.id
              AND u.auth_id = auth.uid()
              AND pm.role IN ('coordinator', 'admin')
          )
        )
    )
  )
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_indicators.project_id
        AND (
          is_org_admin(p.org_id)
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            INNER JOIN public.users u ON u.id = pm.user_id
            WHERE pm.project_id = p.id
              AND u.auth_id = auth.uid()
              AND pm.role IN ('coordinator', 'admin')
          )
        )
    )
  );

-- DELETE: org admins or project admins only
CREATE POLICY project_indicators_delete
  ON public.project_indicators
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_indicators.project_id
        AND (
          is_org_admin(p.org_id)
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            INNER JOIN public.users u ON u.id = pm.user_id
            WHERE pm.project_id = p.id
              AND u.auth_id = auth.uid()
              AND pm.role = 'admin'
          )
        )
    )
  );

-- =====================================================
-- TRIGGERS: updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_indicator_library_updated_at ON public.indicator_library;
CREATE TRIGGER update_indicator_library_updated_at
  BEFORE UPDATE ON public.indicator_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_indicators_updated_at ON public.project_indicators;
CREATE TRIGGER update_project_indicators_updated_at
  BEFORE UPDATE ON public.project_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
