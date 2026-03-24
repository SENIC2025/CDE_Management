/*
  # Indicator Bundle System

  ## Overview
  Curated collections of indicators that users can adopt with one click.
  Each bundle groups 5-10 indicators by target segment, purpose, or domain.

  ## New Tables

  ### indicator_bundles
  Bundle definitions with:
  - Unique codes (e.g., BUNDLE-SEG-POLICY)
  - Type classification (segment, purpose, domain, maturity)
  - UI metadata (icon, color, sort_order)
  - System vs organisation-defined flags

  ### indicator_bundle_items
  Many-to-many: bundles to indicator codes with:
  - Reference to indicator_library via code
  - Sort order within bundle
  - Required flag (core vs optional)

  ## Security
  - Bundles SELECT: all authenticated users
  - Bundles INSERT/UPDATE/DELETE: platform admins or org admins (same pattern as indicator_library)
  - Bundle items SELECT: all authenticated users
  - Bundle items INSERT/DELETE: platform admins or org admins

  ## Seed Data
  10 curated bundles across segment, purpose, and domain types
*/

-- =====================================================
-- TABLE: indicator_bundles
-- =====================================================

CREATE TABLE IF NOT EXISTS public.indicator_bundles (
  bundle_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  bundle_type text NOT NULL CHECK (bundle_type IN ('segment', 'purpose', 'domain', 'maturity')),
  icon text,              -- emoji for UI display
  color text,             -- tailwind color class for UI
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT true,
  org_id uuid REFERENCES public.organisations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_indicator_bundles_type ON public.indicator_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_indicator_bundles_active ON public.indicator_bundles(is_active);

-- =====================================================
-- TABLE: indicator_bundle_items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.indicator_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.indicator_bundles(bundle_id) ON DELETE CASCADE,
  indicator_code text NOT NULL,   -- references indicator_library.code
  sort_order integer DEFAULT 0,
  is_required boolean DEFAULT false,  -- core vs optional within bundle
  created_at timestamptz DEFAULT now(),
  UNIQUE(bundle_id, indicator_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_indicator_bundle_items_bundle ON public.indicator_bundle_items(bundle_id);

-- =====================================================
-- RLS POLICIES: indicator_bundles
-- =====================================================

ALTER TABLE public.indicator_bundles ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can view active bundles
CREATE POLICY indicator_bundles_select
  ON public.indicator_bundles
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
CREATE POLICY indicator_bundles_insert
  ON public.indicator_bundles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR (
      org_id IS NOT NULL
      AND is_org_admin(org_id)
    )
  );

-- UPDATE: only org admins for their bundles, platform admins for all
CREATE POLICY indicator_bundles_update
  ON public.indicator_bundles
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
CREATE POLICY indicator_bundles_delete
  ON public.indicator_bundles
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    AND is_system = false
  );

-- =====================================================
-- RLS POLICIES: indicator_bundle_items
-- =====================================================

ALTER TABLE public.indicator_bundle_items ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can view bundle items
CREATE POLICY indicator_bundle_items_select
  ON public.indicator_bundle_items
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: platform admins or org admins of the bundle's org
CREATE POLICY indicator_bundle_items_insert
  ON public.indicator_bundle_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.indicator_bundles ib
      WHERE ib.bundle_id = indicator_bundle_items.bundle_id
        AND ib.org_id IS NOT NULL
        AND is_org_admin(ib.org_id)
    )
  );

-- DELETE: platform admins or org admins of the bundle's org
CREATE POLICY indicator_bundle_items_delete
  ON public.indicator_bundle_items
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.indicator_bundles ib
      WHERE ib.bundle_id = indicator_bundle_items.bundle_id
        AND ib.org_id IS NOT NULL
        AND is_org_admin(ib.org_id)
    )
  );

-- =====================================================
-- TRIGGERS: updated_at for indicator_bundles
-- =====================================================

DROP TRIGGER IF EXISTS update_indicator_bundles_updated_at ON public.indicator_bundles;
CREATE TRIGGER update_indicator_bundles_updated_at
  BEFORE UPDATE ON public.indicator_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: Indicator Bundles
-- =====================================================

-- ----- Segment Bundles -----

-- 1. Policymaker Engagement Pack
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-SEG-POLICY',
  'Policymaker Engagement Pack',
  'Essential indicators for projects targeting policy influence and engagement with decision-makers.',
  'segment',
  '🏛️',
  'blue',
  1,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- 2. Research Community Pack
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-SEG-RESEARCH',
  'Research Community Pack',
  'Track scientific dissemination through publications, open access, citations, and conference engagement.',
  'segment',
  '🔬',
  'purple',
  2,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- 3. Industry Engagement Pack
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-SEG-INDUSTRY',
  'Industry Engagement Pack',
  'Monitor commercial exploitation pathways including agreements, implementations, IP, and economic impact.',
  'segment',
  '🏭',
  'amber',
  3,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- 4. Public Awareness Kit
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-SEG-PUBLIC',
  'Public Awareness Kit',
  'Measure public reach and engagement through digital channels, multimedia, and multilingual content.',
  'segment',
  '👥',
  'green',
  4,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- ----- Purpose Bundles -----

-- 5. Quick Start - Minimum Viable CDE
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-PUR-STARTER',
  'Quick Start – Minimum Viable CDE',
  'The essentials for any EU project. Cover all three CDE domains with minimal setup — perfect for getting started quickly.',
  'purpose',
  '🚀',
  'emerald',
  5,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- 6. Horizon Europe Compliance Pack
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-PUR-HORIZON',
  'Horizon Europe Compliance Pack',
  'Covers all mandatory reporting requirements for Horizon Europe projects including open access, exploitation agreements, and sustainability planning.',
  'purpose',
  '🇪🇺',
  'blue',
  6,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- 7. Impact Assessment Kit
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-PUR-IMPACT',
  'Impact Assessment Kit',
  'Measure real-world impact across knowledge uptake, behavior change, policy influence, and economic returns.',
  'purpose',
  '📊',
  'rose',
  7,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- 8. Digital Engagement Suite
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-PUR-DIGITAL',
  'Digital Engagement Suite',
  'Comprehensive digital presence tracking covering website, social media, email, and video engagement.',
  'purpose',
  '💻',
  'cyan',
  8,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- ----- Domain Bundles -----

-- 9. Communication Essentials
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-DOM-COMM',
  'Communication Essentials',
  'Core communication indicators covering reach, engagement, audience diversity, and content production.',
  'domain',
  '📢',
  'sky',
  9,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- 10. Exploitation Tracker
INSERT INTO public.indicator_bundles (
  code, name, description, bundle_type, icon, color, sort_order, is_active, is_system, org_id
) VALUES (
  'BUNDLE-DOM-EXPLOIT',
  'Exploitation Tracker',
  'End-to-end exploitation tracking from initial interest through formal agreements to sustainability and economic impact.',
  'domain',
  '🎯',
  'orange',
  10,
  true, true, null
) ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SEED DATA: Indicator Bundle Items
-- =====================================================

DO $$
DECLARE
  v_bundle_id uuid;
BEGIN

  -- ---------------------------------------------------------
  -- 1. BUNDLE-SEG-POLICY: Policymaker Engagement Pack
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-SEG-POLICY';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'COM-REACH-03', 1, false),
      (v_bundle_id, 'COM-PERC-02', 2, false),
      (v_bundle_id, 'DIS-KNO-05', 3, false),
      (v_bundle_id, 'EXP-POL-01', 4, false),
      (v_bundle_id, 'EXP-POL-02', 5, false),
      (v_bundle_id, 'EXP-POL-03', 6, false),
      (v_bundle_id, 'COM-REACH-06', 7, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 2. BUNDLE-SEG-RESEARCH: Research Community Pack
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-SEG-RESEARCH';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'DIS-KNO-01', 1, false),
      (v_bundle_id, 'DIS-KNO-02', 2, false),
      (v_bundle_id, 'DIS-KNO-04', 3, false),
      (v_bundle_id, 'DIS-OUT-01', 4, false),
      (v_bundle_id, 'DIS-OUT-02', 5, false),
      (v_bundle_id, 'DIS-CAP-03', 6, false),
      (v_bundle_id, 'DIS-KNO-07', 7, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 3. BUNDLE-SEG-INDUSTRY: Industry Engagement Pack
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-SEG-INDUSTRY';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'EXP-INT-01', 1, false),
      (v_bundle_id, 'EXP-INT-02', 2, false),
      (v_bundle_id, 'EXP-IMP-01', 3, false),
      (v_bundle_id, 'EXP-ECO-01', 4, false),
      (v_bundle_id, 'EXP-ECO-02', 5, false),
      (v_bundle_id, 'EXP-ECO-05', 6, false),
      (v_bundle_id, 'EXP-SUS-03', 7, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 4. BUNDLE-SEG-PUBLIC: Public Awareness Kit
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-SEG-PUBLIC';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'COM-REACH-01', 1, false),
      (v_bundle_id, 'COM-REACH-02', 2, false),
      (v_bundle_id, 'COM-ENG-01', 3, false),
      (v_bundle_id, 'COM-ENG-05', 4, false),
      (v_bundle_id, 'COM-MAT-01', 5, false),
      (v_bundle_id, 'COM-MAT-02', 6, false),
      (v_bundle_id, 'COM-DIG-03', 7, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 5. BUNDLE-PUR-STARTER: Quick Start - Minimum Viable CDE
  --    All items marked as is_required = true
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-PUR-STARTER';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'COM-REACH-01', 1, true),
      (v_bundle_id, 'COM-REACH-02', 2, true),
      (v_bundle_id, 'COM-ENG-01', 3, true),
      (v_bundle_id, 'DIS-KNO-01', 4, true),
      (v_bundle_id, 'DIS-TRA-01', 5, true),
      (v_bundle_id, 'EXP-INT-01', 6, true),
      (v_bundle_id, 'COM-MAT-01', 7, true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 6. BUNDLE-PUR-HORIZON: Horizon Europe Compliance Pack
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-PUR-HORIZON';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'COM-REACH-01', 1, false),
      (v_bundle_id, 'COM-REACH-03', 2, false),
      (v_bundle_id, 'DIS-KNO-01', 3, false),
      (v_bundle_id, 'DIS-KNO-02', 4, false),
      (v_bundle_id, 'DIS-KNO-03', 5, false),
      (v_bundle_id, 'DIS-CAP-01', 6, false),
      (v_bundle_id, 'EXP-INT-01', 7, false),
      (v_bundle_id, 'EXP-INT-02', 8, false),
      (v_bundle_id, 'EXP-IMP-01', 9, false),
      (v_bundle_id, 'EXP-SUS-01', 10, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 7. BUNDLE-PUR-IMPACT: Impact Assessment Kit
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-PUR-IMPACT';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'COM-PERC-01', 1, false),
      (v_bundle_id, 'COM-PERC-02', 2, false),
      (v_bundle_id, 'DIS-KNO-04', 3, false),
      (v_bundle_id, 'DIS-TRA-02', 4, false),
      (v_bundle_id, 'EXP-IMP-01', 5, false),
      (v_bundle_id, 'EXP-IMP-02', 6, false),
      (v_bundle_id, 'EXP-POL-01', 7, false),
      (v_bundle_id, 'EXP-ECO-01', 8, false),
      (v_bundle_id, 'EXP-ECO-04', 9, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 8. BUNDLE-PUR-DIGITAL: Digital Engagement Suite
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-PUR-DIGITAL';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'COM-REACH-01', 1, false),
      (v_bundle_id, 'COM-REACH-02', 2, false),
      (v_bundle_id, 'COM-REACH-04', 3, false),
      (v_bundle_id, 'COM-ENG-01', 4, false),
      (v_bundle_id, 'COM-ENG-02', 5, false),
      (v_bundle_id, 'COM-ENG-04', 6, false),
      (v_bundle_id, 'COM-ENG-05', 7, false),
      (v_bundle_id, 'COM-DIG-01', 8, false),
      (v_bundle_id, 'COM-DIG-02', 9, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 9. BUNDLE-DOM-COMM: Communication Essentials
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-DOM-COMM';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'COM-REACH-01', 1, false),
      (v_bundle_id, 'COM-REACH-02', 2, false),
      (v_bundle_id, 'COM-REACH-03', 3, false),
      (v_bundle_id, 'COM-ENG-01', 4, false),
      (v_bundle_id, 'COM-ENG-02', 5, false),
      (v_bundle_id, 'COM-AUD-01', 6, false),
      (v_bundle_id, 'COM-MAT-01', 7, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------
  -- 10. BUNDLE-DOM-EXPLOIT: Exploitation Tracker
  -- ---------------------------------------------------------
  SELECT bundle_id INTO v_bundle_id FROM public.indicator_bundles WHERE code = 'BUNDLE-DOM-EXPLOIT';
  IF v_bundle_id IS NOT NULL THEN
    INSERT INTO public.indicator_bundle_items (bundle_id, indicator_code, sort_order, is_required) VALUES
      (v_bundle_id, 'EXP-INT-01', 1, false),
      (v_bundle_id, 'EXP-INT-02', 2, false),
      (v_bundle_id, 'EXP-IMP-01', 3, false),
      (v_bundle_id, 'EXP-POL-01', 4, false),
      (v_bundle_id, 'EXP-ECO-01', 5, false),
      (v_bundle_id, 'EXP-SUS-01', 6, false),
      (v_bundle_id, 'EXP-SUS-02', 7, false)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
