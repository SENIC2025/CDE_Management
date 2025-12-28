/*
  # Link Indicators to Taxonomy Categories

  ## Overview
  Creates many-to-many relationships between indicators and their:
  - Objective types (awareness, engagement, capacity_building, etc.)
  - Channel types (events, website, social_media, etc.)
  - Stakeholder types (policymakers, practitioners, researchers, etc.)

  This enables rich filtering and discovery in the Indicator Library UI.
*/

-- =====================================================
-- HELPER: Get indicator ID by code
-- =====================================================

DO $$
DECLARE
  v_ind_id uuid;
BEGIN

-- =====================================================
-- COMMUNICATION INDICATORS - TAXONOMY LINKS
-- =====================================================

-- COM-REACH-01: Website Unique Visitors
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-REACH-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'website') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers') ON CONFLICT DO NOTHING;
END IF;

-- COM-REACH-02: Social Media Impressions
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-REACH-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'social_media') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'civil_society'),
    (v_ind_id, 'practitioners') ON CONFLICT DO NOTHING;
END IF;

-- COM-REACH-03: Event Participants (In-person)
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-REACH-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- COM-REACH-04: Event Participants (Virtual)
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-REACH-04';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- COM-ENG-01: Social Media Engagement Rate
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-ENG-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'social_media') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- COM-ENG-02: Newsletter Open Rate
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-ENG-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'researchers') ON CONFLICT DO NOTHING;
END IF;

-- COM-ENG-03: Average Session Duration
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-ENG-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'website') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'practitioners') ON CONFLICT DO NOTHING;
END IF;

-- COM-AUD-01: Stakeholder Group Diversity
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-AUD-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'events'),
    (v_ind_id, 'direct_engagement'),
    (v_ind_id, 'media') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry'),
    (v_ind_id, 'civil_society'),
    (v_ind_id, 'public') ON CONFLICT DO NOTHING;
END IF;

-- COM-PERC-01: Brand Recognition
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-PERC-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'social_media'),
    (v_ind_id, 'media'),
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'practitioners') ON CONFLICT DO NOTHING;
END IF;

-- COM-PERC-02: Message Comprehension
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-PERC-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'events'),
    (v_ind_id, 'training') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'public') ON CONFLICT DO NOTHING;
END IF;

-- =====================================================
-- DISSEMINATION INDICATORS - TAXONOMY LINKS
-- =====================================================

-- DIS-KNO-01: Knowledge Assets Published
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-KNO-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'publications'),
    (v_ind_id, 'website') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'researchers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'policymakers') ON CONFLICT DO NOTHING;
END IF;

-- DIS-KNO-02: Open Access Publications
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-KNO-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'publications') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'researchers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'public') ON CONFLICT DO NOTHING;
END IF;

-- DIS-KNO-03: Knowledge Asset Downloads
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-KNO-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'engagement'),
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'publications'),
    (v_ind_id, 'website') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'researchers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- DIS-KNO-04: Citations in External Publications
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-KNO-04';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'policy_influence') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'publications') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'researchers'),
    (v_ind_id, 'policymakers') ON CONFLICT DO NOTHING;
END IF;

-- DIS-TRA-01: Training Sessions Delivered
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-TRA-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'training'),
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- DIS-TRA-02: Trainees Reporting Improved Understanding
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-TRA-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'training') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- DIS-CAP-01: Reusable Tools/Frameworks Created
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-CAP-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'publications'),
    (v_ind_id, 'website') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- DIS-CAP-02: Stakeholder Networks Established
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-CAP-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement'),
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- =====================================================
-- EXPLOITATION INDICATORS - TAXONOMY LINKS
-- =====================================================

-- EXP-INT-01: Expressions of Interest
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-INT-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement'),
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'practitioners') ON CONFLICT DO NOTHING;
END IF;

-- EXP-INT-02: Formal Exploitation Agreements
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-INT-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'practitioners') ON CONFLICT DO NOTHING;
END IF;

-- EXP-IMP-01: Implementations in Operational Settings
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-IMP-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'policymakers') ON CONFLICT DO NOTHING;
END IF;

-- EXP-IMP-02: Geographic Replication
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-IMP-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- EXP-POL-01: Policy References
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-POL-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'policy_influence'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'publications'),
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'policymakers') ON CONFLICT DO NOTHING;
END IF;

-- EXP-ECO-01: Jobs Created/Safeguarded
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-ECO-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

-- EXP-ECO-02: Revenue from Exploitation
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-ECO-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

END $$;
