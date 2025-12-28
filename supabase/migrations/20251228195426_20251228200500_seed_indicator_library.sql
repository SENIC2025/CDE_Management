/*
  # Seed Indicator Library with Professional Indicators

  ## Overview
  Seeds 25 evaluator-grade indicators across Communication, Dissemination, and Exploitation domains.
  Each indicator includes complete metadata: definitions, rationale, limitations, thresholds.

  ## Indicator Breakdown
  - 10 Communication indicators
  - 8 Dissemination indicators
  - 7 Exploitation indicators

  ## Quality Standards
  All indicators include:
  - Unique codes following domain convention
  - Professional definitions suitable for EU evaluators
  - Clear limitations and interpretation notes
  - Appropriate units and aggregation methods
  - Maturity level classification
  - Linked objective types, channels, and stakeholders
*/

-- =====================================================
-- COMMUNICATION INDICATORS (10)
-- =====================================================

-- COM-REACH-01: Website Unique Visitors
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-REACH-01',
  'Website Unique Visitors',
  'communication',
  'Number of unique individuals visiting project website during reporting period, measured via analytics platform using cookie/session identification.',
  'Indicates breadth of digital reach and initial awareness generation. Essential baseline for digital communication strategy.',
  'Does not measure depth of engagement, content consumption quality, or conversion to action. Subject to bot traffic and privacy settings affecting tracking accuracy.',
  'Baseline should reflect pre-campaign traffic. Growth >50% indicates successful awareness campaigns. Compare against similar projects in same domain.',
  'number',
  'sum',
  'analytics',
  'monthly',
  5000, 2000, 500,
  1000, 10000,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-REACH-02: Social Media Impressions
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-REACH-02',
  'Social Media Impressions',
  'communication',
  'Total number of times project-related content appeared in social media feeds across all platforms (organic and paid), regardless of clicks or engagement.',
  'Measures potential exposure and visibility of communication messages. Critical for understanding amplification effectiveness.',
  'Impressions do not equal views or attention. Platform algorithms heavily influence distribution. Does not indicate message comprehension or acceptance.',
  'Expect 10-30x multiplier from followers count. Paid promotion significantly increases impressions but may reduce engagement rate.',
  'number',
  'sum',
  'analytics',
  'monthly',
  50000, 10000, 2000,
  5000, 100000,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-REACH-03: Event Participants (In-person)
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-REACH-03',
  'Event Participants (In-person)',
  'communication',
  'Number of individuals physically attending project-organized or co-organized communication events, verified through registration systems or attendance records.',
  'Direct engagement indicator demonstrating ability to mobilize target audiences and create face-to-face communication opportunities.',
  'Attendance does not guarantee active participation or learning outcomes. Quality of engagement varies significantly by event format and facilitation.',
  'Typical EU project events range 30-200 participants. Academic events skew higher (100-300), policy events lower but higher quality (20-80).',
  'number',
  'sum',
  'manual',
  'per_activity',
  200, 50, 20,
  0, 500,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-REACH-04: Event Participants (Virtual)
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-REACH-04',
  'Event Participants (Virtual)',
  'communication',
  'Number of individuals attending project online events (webinars, virtual conferences, online workshops) tracked through platform analytics.',
  'Measures digital event reach. Lower cost per participant than in-person but typically lower engagement depth.',
  'High drop-off rates common (30-50% leave early). Passive attendance easy. Recorded sessions complicate unique participant counting.',
  'Expect 2-5x higher registration than in-person, but 40-60% actual attendance rate. Engagement rate (questions, polls) typically 10-20% of attendees.',
  'number',
  'sum',
  'analytics',
  'per_activity',
  300, 100, 30,
  0, 1000,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-ENG-01: Social Media Engagement Rate
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-ENG-01',
  'Social Media Engagement Rate',
  'communication',
  'Percentage of social media impressions that generated active engagement (likes, shares, comments, clicks) calculated as (total engagements / total impressions) × 100.',
  'Indicates message resonance and content quality. More meaningful than raw reach for assessing communication effectiveness.',
  'Algorithm changes affect baseline rates. Paid content typically has lower engagement rate than organic. Platform-specific norms vary widely.',
  'EU project typical rates: LinkedIn 2-4%, Twitter 0.5-2%, Facebook 1-3%. Rates >5% indicate exceptional content. Rates <0.5% suggest poor targeting or content.',
  'percentage',
  'average',
  'analytics',
  'monthly',
  3.0, 1.0, 0.5,
  1.0, 3.0,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-ENG-02: Newsletter Open Rate
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-ENG-02',
  'Newsletter Open Rate',
  'communication',
  'Percentage of delivered newsletters that were opened by recipients, calculated as (unique opens / delivered emails) × 100, tracked via email marketing platform.',
  'Measures subject line effectiveness and sender reputation. Indicates maintained interest from subscribed audience.',
  'Apple Mail Privacy Protection inflates open rates. B2B audiences have higher rates than B2C. Time-of-send significantly affects rates.',
  'EU project benchmarks: 20-30% good, 15-20% acceptable, <15% problematic. Academic audiences higher (25-35%), policy audiences lower (15-25%).',
  'percentage',
  'average',
  'analytics',
  'per_activity',
  25.0, 15.0, 10.0,
  20.0, 30.0,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-ENG-03: Average Session Duration (Website)
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-ENG-03',
  'Average Session Duration (Website)',
  'communication',
  'Mean time in minutes that visitors spend on project website per session, measured from landing to exit or timeout.',
  'Indicates content relevance and engagement depth. Longer sessions suggest visitors finding valuable information.',
  'Session timeout settings affect calculation. Does not measure active vs. idle time. Technical users may use site differently than general public.',
  'Typical EU project sites: 2-4 minutes average. <1 minute suggests poor content relevance. >5 minutes indicates strong content or research usage.',
  'number',
  'average',
  'analytics',
  'monthly',
  4.0, 2.0, 1.0,
  2.0, 4.0,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-AUD-01: Stakeholder Group Diversity
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-AUD-01',
  'Stakeholder Group Diversity',
  'communication',
  'Number of distinct stakeholder categories reached through communication activities, based on predefined taxonomy (policymakers, practitioners, researchers, industry, civil society, public, consortium).',
  'Ensures communication strategy reaches intended variety of audiences, not just echo chamber. Critical for systemic impact projects.',
  'Counts categories, not individuals. Does not measure depth of reach within each category. Self-reported categorization may be imprecise.',
  'Projects should target 3-5 stakeholder groups. Reaching all 7 is rare and may indicate lack of focus. Monitor whether priority groups are being reached.',
  'number',
  'max',
  'manual',
  'quarterly',
  5, 3, 2,
  2, 5,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-PERC-01: Brand Recognition
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-PERC-01',
  'Brand Recognition',
  'communication',
  'Percentage of surveyed target audience members who can correctly identify project name, logo, or core message when prompted, measured via awareness survey.',
  'Indicates communication cut-through and memorability. Essential for projects requiring sustained engagement or behavior change.',
  'Requires survey infrastructure. Sample size and representativeness critical. Prompted recall easier than unprompted. Geographic and temporal decay significant.',
  'Baseline typically near zero for new projects. 15-25% recognition after 1 year indicates successful awareness campaign. 40%+ exceptional.',
  'percentage',
  'latest',
  'survey',
  'annually',
  25.0, 10.0, 5.0,
  5.0, 25.0,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-PERC-02: Message Comprehension
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-PERC-02',
  'Message Comprehension',
  'communication',
  'Percentage of event participants or survey respondents who can accurately explain core project message or value proposition in own words, assessed against rubric.',
  'Measures communication quality beyond reach. Tests whether audiences actually understand what project does and why it matters.',
  'Requires qualitative assessment and scoring rubric. Labor-intensive. Small sample sizes common. Self-selection bias in respondents.',
  'Comprehension typically 30-50% lower than awareness. 60%+ indicates exceptional message clarity. Track which message elements are most/least understood.',
  'percentage',
  'average',
  'survey',
  'per_activity',
  60.0, 40.0, 20.0,
  30.0, 70.0,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- DISSEMINATION INDICATORS (8)
-- =====================================================

-- DIS-KNO-01: Knowledge Assets Published
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-KNO-01',
  'Knowledge Assets Published',
  'dissemination',
  'Number of structured knowledge products published and made accessible to target audiences (publications, guidelines, toolkits, datasets, policy briefs, training materials).',
  'Core dissemination output. Represents project contribution to knowledge base and usability for stakeholders.',
  'Counts outputs, not quality or impact. Does not measure actual usage. Publication does not guarantee discoverability or accessibility.',
  'Typical EU project: 8-15 assets over lifecycle. Research projects higher (15-30), demonstration projects lower (5-10). Quality over quantity critical.',
  'number',
  'sum',
  'manual',
  'quarterly',
  15, 8, 3,
  0, 20,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-KNO-02: Open Access Publications
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-KNO-02',
  'Open Access Publications',
  'dissemination',
  'Number of peer-reviewed publications made available via open access channels (Gold, Green, or Diamond OA) within 6 months of publication.',
  'EU mandate for publicly-funded research. Maximizes knowledge dissemination and societal return on investment.',
  'OA status can change over time (embargo periods). Predatory OA journals complicate quality assessment. Does not measure actual readership.',
  'Horizon Europe requires immediate OA for all publications. 100% OA should be target. Green OA (repository) acceptable if Gold unavailable.',
  'number',
  'sum',
  'manual',
  'quarterly',
  null, null, null,
  0, 10,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-KNO-03: Knowledge Asset Downloads
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-KNO-03',
  'Knowledge Asset Downloads',
  'dissemination',
  'Total number of complete downloads of project knowledge products from project website, repositories, or publication platforms.',
  'Indicates active knowledge seeking behavior. More meaningful than webpage views for assessing dissemination effectiveness.',
  'Bots inflate numbers. Download does not equal reading or use. Multi-chapter documents may have partial downloads. Cannot track secondary distribution.',
  'Expect 50-200 downloads per asset in first 6 months. Policy briefs 100-500, technical reports 20-100, datasets 10-50. Long tail effect significant.',
  'number',
  'sum',
  'analytics',
  'monthly',
  1000, 200, 50,
  0, 2000,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-KNO-04: Citations in External Publications
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-KNO-04',
  'Citations in External Publications',
  'dissemination',
  'Number of times project outputs are cited in external scholarly publications, policy documents, or professional reports, tracked via citation databases.',
  'Gold standard for knowledge uptake in research communities. Indicates project findings deemed credible and useful by peers.',
  'Time lag of 2-5 years for citations to accumulate. Discipline-specific norms vary widely. Non-academic impact not captured. Self-citations must be excluded.',
  'Research projects: 50-200 citations over 5 years post-project is good. Policy-focused projects: 10-30 citations in gray literature. Patience required.',
  'number',
  'sum',
  'manual',
  'annually',
  50, 15, 5,
  0, 100,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-TRA-01: Training Sessions Delivered
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-TRA-01',
  'Training Sessions Delivered',
  'dissemination',
  'Number of structured training activities delivered to target audiences (workshops, webinars, train-the-trainer sessions, masterclasses).',
  'Active dissemination through capacity building. Indicates commitment to supporting knowledge application, not just publishing.',
  'Counts sessions not participants. Does not measure learning outcomes. One-off training has limited lasting impact without follow-up.',
  'Typical projects: 5-12 training sessions. Complex methodologies require more. Include both direct training and train-the-trainer multiplier events.',
  'number',
  'sum',
  'manual',
  'quarterly',
  12, 5, 2,
  0, 15,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-TRA-02: Trainees Reporting Improved Understanding
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-TRA-02',
  'Trainees Reporting Improved Understanding',
  'dissemination',
  'Percentage of training participants who report improved understanding of topic via post-training survey (5-point Likert scale, aggregating "agree" and "strongly agree").',
  'Measures training effectiveness and immediate learning outcomes. Essential for capacity building credibility.',
  'Self-reported perception, not objective knowledge test. Social desirability bias inflates scores. Immediate assessment misses retention decay.',
  'Expect 70-85% positive response for good training. <60% indicates delivery problems. Compare pre/post knowledge tests for robust evidence.',
  'percentage',
  'average',
  'survey',
  'per_activity',
  80.0, 65.0, 50.0,
  70.0, 85.0,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-CAP-01: Reusable Tools/Frameworks Created
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-CAP-01',
  'Reusable Tools/Frameworks Created',
  'dissemination',
  'Number of operational tools, methodologies, or frameworks developed by project that are designed for replication/adaptation by external users (software, templates, assessment frameworks).',
  'Highest value dissemination outputs. Enable stakeholders to apply project knowledge independently. Multiplier effect potential.',
  'Creation does not guarantee adoption. Usability and documentation quality critical. Maintenance and support requirements often underestimated.',
  'Quality over quantity. 2-3 well-documented, actively maintained tools more valuable than 10 abandoned ones. Track adoption separately.',
  'number',
  'sum',
  'manual',
  'quarterly',
  5, 2, 1,
  0, 5,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-CAP-02: Stakeholder Networks Established
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-CAP-02',
  'Stakeholder Networks Established',
  'dissemination',
  'Number of formal or informal stakeholder networks, communities of practice, or professional groups established or significantly strengthened through project activities.',
  'Sustainable dissemination mechanism beyond project lifetime. Creates infrastructure for continued knowledge exchange.',
  'Network sustainability uncertain post-project. Counting methodology subjective. Network activity level varies widely. Attribute causality difficult.',
  'Even 1-2 active networks represent success. Track network characteristics: size, activity level, governance. Plan sustainability from start.',
  'number',
  'sum',
  'manual',
  'annually',
  3, 1, 0,
  0, 3,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- EXPLOITATION INDICATORS (7)
-- =====================================================

-- EXP-INT-01: Expressions of Interest
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-INT-01',
  'Expressions of Interest',
  'exploitation',
  'Number of documented, substantive expressions of interest from potential adopters, licensees, investors, or implementation partners regarding project outputs.',
  'Early signal of exploitation potential. Indicates market/stakeholder appetite for project results. Pipeline metric for formal agreements.',
  'Expression does not equal commitment. Requires follow-up conversion effort. Definition of "substantive" needs operationalization. Time-bound relevance.',
  'Track source (industry vs public sector vs research), type of interest (adoption, licensing, investment), and conversion rate to formal agreements.',
  'number',
  'sum',
  'manual',
  'quarterly',
  20, 8, 3,
  0, 25,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-INT-02: Formal Exploitation Agreements
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-INT-02',
  'Formal Exploitation Agreements',
  'exploitation',
  'Number of signed legal agreements for exploitation of project results (licensing, collaboration, commercialization, implementation contracts, spin-off creation).',
  'Concrete exploitation outcome. Represents successful transition from research to application. Key performance indicator for innovation projects.',
  'Agreement does not guarantee implementation or revenue. Some exploitation happens without formal agreements. Confidentiality limits public reporting.',
  'Even 2-3 formal agreements represent project success. Track agreement type, financial terms, implementation timeline. Multi-year conversion cycle typical.',
  'number',
  'sum',
  'manual',
  'quarterly',
  5, 2, 1,
  0, 5,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-IMP-01: Implementations in Operational Settings
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-IMP-01',
  'Implementations in Operational Settings',
  'exploitation',
  'Number of documented instances where project outputs are deployed in real-world operational settings beyond project pilots (public services, commercial products, policy frameworks).',
  'Ultimate exploitation goal: real-world application. Demonstrates project outputs are fit-for-purpose and deliver value.',
  'Attribution challenges when project contributes to larger initiative. Implementation quality varies. Requires ongoing monitoring post-project.',
  'Pilot-to-operational transition typically 2-4 years. Track implementation depth (pilot, partial, full), scale (local, regional, national), and sustainability.',
  'number',
  'sum',
  'manual',
  'annually',
  8, 3, 1,
  0, 10,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-IMP-02: Geographic Replication
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-IMP-02',
  'Geographic Replication',
  'exploitation',
  'Number of distinct countries or regions where project outputs have been adopted or adapted for implementation, beyond original project scope.',
  'Measures transferability and scalability. Indicates outputs are not context-specific. EU projects expected to demonstrate cross-border relevance.',
  'Replication depth varies (full adoption vs superficial adaptation). Cultural and regulatory context affects transferability. Tracking requires active monitoring.',
  'Target 3-5 countries for projects with EU scope. Global projects should reach 8-12. Distinguish between consortium countries and external replication.',
  'number',
  'sum',
  'manual',
  'annually',
  5, 3, 1,
  1, 8,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-POL-01: Policy References
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-POL-01',
  'Policy References',
  'exploitation',
  'Number of policy documents, strategies, regulations, or legislative texts that explicitly reference or incorporate project findings or recommendations.',
  'Highest-level policy exploitation. Indicates project shaped policy discourse and decision-making. Strong evidence of societal impact.',
  'Reference does not equal adoption or implementation. Attribution difficult with multiple evidence sources. Time lag can be 3-7 years. Geographic scope matters.',
  'Even 1-2 policy references at EU or national level is significant success. Track document type (strategy vs regulation), implementation status, policy level.',
  'number',
  'sum',
  'manual',
  'annually',
  3, 1, 0,
  0, 5,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-ECO-01: Jobs Created/Safeguarded
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-ECO-01',
  'Jobs Created/Safeguarded',
  'exploitation',
  'Number of full-time equivalent (FTE) jobs created or safeguarded through commercial exploitation of project results (spin-offs, licensing leading to production, service delivery).',
  'Economic impact indicator. Demonstrates employment and economic growth resulting from project innovation.',
  'Attribution extremely challenging. Timeframe must be specified. Temporary vs permanent jobs. Requires counterfactual assessment. Self-reported data.',
  'Even 10-20 jobs is meaningful for research projects. Innovation projects target 50-100+. Distinguish direct jobs (spin-offs) from indirect (supply chain).',
  'number',
  'sum',
  'manual',
  'annually',
  50, 15, 5,
  0, 100,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-ECO-02: Revenue from Exploitation
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-ECO-02',
  'Revenue from Exploitation',
  'exploitation',
  'Total revenue (EUR) generated through commercial exploitation of project intellectual property or results (licensing fees, sales, service contracts).',
  'Financial sustainability and return on investment indicator. Demonstrates market validation and economic viability of project outputs.',
  'Confidentiality restrictions limit reporting. Multi-year revenue streams complicate attribution. Does not capture non-monetary value. Currency fluctuations.',
  'Public sector projects: licensing fees 10-50k EUR. Commercial projects: target 200k-1M EUR within 3 years post-project. Track revenue trajectory.',
  'currency',
  'sum',
  'manual',
  'annually',
  500000, 100000, 10000,
  0, 1000000,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;
