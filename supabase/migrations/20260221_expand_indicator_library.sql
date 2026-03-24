/*
  # Expand Indicator Library to 60 Professional Indicators

  ## Overview
  Adds 35 new evaluator-grade indicators, expanding the library from 25 to 60 total:
  - 10 new Communication indicators (20 total)
  - 12 new Dissemination indicators (20 total)
  - 13 new Exploitation indicators (20 total)

  ## New Sub-categories Introduced
  - COM-DIG: Digital Performance (website/social analytics depth)
  - COM-MAT: Communication Materials (production outputs)
  - DIS-OUT: Outreach (conference/event-level dissemination)
  - EXP-SUS: Sustainability (post-project continuation)

  ## Quality Standards
  All indicators maintain evaluator-grade quality suitable for:
  - Horizon Europe periodic and final reporting
  - Erasmus+ and LIFE programme evaluations
  - Interreg cross-border impact assessments
  - Independent mid-term and ex-post evaluations
*/

-- =====================================================
-- NEW COMMUNICATION INDICATORS (10)
-- =====================================================

-- COM-REACH-05: Press Releases Distributed
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-REACH-05',
  'Press Releases Distributed',
  'communication',
  'Number of formal press releases issued through recognised distribution channels (wire services, institutional press offices, targeted media lists) during the reporting period.',
  'Measures proactive media engagement and structured outreach to journalists and news outlets. Indicates commitment to translating project milestones into newsworthy narratives.',
  'Distribution does not guarantee pickup or publication. Quality and newsworthiness of content varies. Wire service reach metrics may overstate actual journalist engagement.',
  'Typical EU projects issue 4-8 press releases over the project lifecycle, aligned with major milestones. Track pickup rate separately to assess effectiveness.',
  'number',
  'sum',
  'manual',
  'quarterly',
  8, 4, 1,
  0, 10,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-REACH-06: Media Mentions / Press Coverage
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-REACH-06',
  'Media Mentions / Press Coverage',
  'communication',
  'Number of distinct media articles, broadcasts, or online news pieces that mention the project by name or reference its key outputs, tracked via media monitoring services.',
  'Indicates earned media reach and third-party validation of project relevance. Earned coverage carries higher credibility than self-published content.',
  'Monitoring tools may miss niche or non-English outlets. Sentiment and accuracy of coverage not captured by count alone. Distinguishing substantive mentions from passing references is subjective.',
  'EU-funded projects typically achieve 10-50 media mentions. National/regional outlets more common than international. Track tier (national vs local) and sentiment for richer analysis.',
  'number',
  'sum',
  'analytics',
  'quarterly',
  30, 10, 3,
  0, 50,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-ENG-04: Newsletter Click-Through Rate
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-ENG-04',
  'Newsletter Click-Through Rate',
  'communication',
  'Percentage of newsletter recipients who clicked at least one link within the email, calculated as (unique clicks / delivered emails) x 100, tracked via email marketing platform.',
  'Measures content relevance and call-to-action effectiveness beyond simple opens. Indicates audience willingness to engage further with project outputs.',
  'Click tracking can be blocked by security software. Single metric does not reveal which content drives clicks. Low rates may reflect layout issues rather than content quality.',
  'Industry benchmark for research/NGO newsletters: 2-5% CTR. EU project newsletters achieving >5% indicate strong content-audience fit. Compare against open rate for funnel analysis.',
  'percentage',
  'average',
  'analytics',
  'per_activity',
  5.0, 2.5, 1.0,
  2.0, 5.0,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-ENG-05: Video Views
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-ENG-05',
  'Video Views',
  'communication',
  'Total number of views of project-produced video content across all hosting platforms (YouTube, Vimeo, social media native video), counting views that exceed the platform minimum threshold.',
  'Video is increasingly the primary content format for digital audiences. View counts indicate reach and accessibility of audiovisual communication outputs.',
  'Platform definitions of a "view" differ (e.g., YouTube 30s, Facebook 3s). Autoplay and embedded views inflate counts. Does not measure comprehension or watch-through rate.',
  'Project explainer videos: 500-5,000 views typical. Event recordings: 100-1,000. Viral potential is low for specialised content. Track average watch percentage for quality signal.',
  'number',
  'sum',
  'analytics',
  'monthly',
  5000, 1000, 200,
  0, 10000,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-ENG-06: Content Shares / Amplification
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-ENG-06',
  'Content Shares / Amplification',
  'communication',
  'Total number of times project content is shared, retweeted, reposted, or forwarded by external users across all digital platforms, indicating organic amplification by the audience.',
  'Shares represent the highest form of digital endorsement. Indicates audiences find content valuable enough to associate with their own networks and reputation.',
  'Share counts may be inflated by consortium partners. Cannot distinguish genuine advocacy from courtesy shares. Private sharing (email, messaging) is untrackable.',
  'Amplification ratio (shares per post) >2% is strong for niche content. Track which content types generate most shares to refine communication strategy.',
  'number',
  'sum',
  'analytics',
  'monthly',
  500, 100, 20,
  0, 1000,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-DIG-01: Website Pages per Session
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-DIG-01',
  'Website Pages per Session',
  'communication',
  'Average number of distinct pages viewed per visitor session on the project website, as reported by the web analytics platform.',
  'Measures content discoverability and internal navigation effectiveness. Higher values indicate visitors exploring multiple areas of project outputs.',
  'Single-page applications may undercount. Bot traffic skews averages. High page counts may also indicate poor information architecture forcing excessive navigation.',
  'EU project websites: 2-4 pages/session typical. Resource-rich sites may reach 5-7. If >8, investigate whether users are lost rather than engaged.',
  'number',
  'average',
  'analytics',
  'monthly',
  4.0, 2.0, 1.2,
  1.5, 4.0,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-DIG-02: Social Media Follower Growth Rate
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-DIG-02',
  'Social Media Follower Growth Rate',
  'communication',
  'Percentage change in total social media followers across all project channels during the reporting period, calculated as ((new followers - unfollows) / starting followers) x 100.',
  'Indicates sustained audience-building momentum and community growth. Differentiates between static and growing communication reach over time.',
  'Follower counts include inactive accounts. Paid promotion artificially inflates growth. Early-stage projects show higher percentage growth from small bases. Platform-specific norms differ.',
  'Healthy growth for EU project accounts: 3-8% per month in active periods. Stagnation (<1%) suggests content fatigue. Negative growth warrants strategy review.',
  'percentage',
  'average',
  'analytics',
  'monthly',
  5.0, 2.0, 0.5,
  0, 5.0,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-DIG-03: Multilingual Content Coverage
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-DIG-03',
  'Multilingual Content Coverage',
  'communication',
  'Number of languages in which key project communication materials (website, brochures, executive summaries) are made available, beyond the primary working language.',
  'Demonstrates inclusivity and commitment to reaching diverse European audiences. Particularly relevant for projects with cross-border or pan-European ambitions.',
  'Translation quality varies. Machine translation without review may undermine credibility. Not all materials need translation; prioritisation is key. Maintenance burden grows with each language.',
  'Horizon Europe projects typically cover 3-6 EU languages. Interreg projects should cover all partner languages. English-only is insufficient for public-facing projects.',
  'number',
  'max',
  'manual',
  'quarterly',
  5, 3, 1,
  1, 6,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-MAT-01: Communication Materials Produced
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-MAT-01',
  'Communication Materials Produced',
  'communication',
  'Total number of distinct communication materials produced during the reporting period, including brochures, factsheets, posters, flyers, project briefs, and roll-up banners.',
  'Tracks communication output volume and readiness for events and outreach. Ensures sufficient collateral exists to support dissemination and engagement activities.',
  'Counts production, not distribution or impact. Quality and design consistency not captured. Materials may become outdated quickly. Storage and version control can be challenging.',
  'Projects typically produce 10-25 distinct materials over their lifecycle. Front-load production before major events. Ensure materials align with EU visual identity guidelines.',
  'number',
  'sum',
  'manual',
  'quarterly',
  20, 10, 3,
  0, 25,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- COM-MAT-02: Infographics and Visual Assets Created
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'COM-MAT-02',
  'Infographics and Visual Assets Created',
  'communication',
  'Number of professionally designed infographics, data visualisations, diagrams, or visual summary assets created to communicate project findings or processes to non-specialist audiences.',
  'Visual content increases accessibility and shareability of complex research findings. Essential for policy and public audiences who may not engage with technical text.',
  'Production cost and time investment significant. Effectiveness depends on design quality and data accuracy. Requires regular updating as findings evolve.',
  'Aim for 5-10 key infographics aligned with major outputs. High-quality visuals generate 3-5x more social media engagement than text-only posts.',
  'number',
  'sum',
  'manual',
  'quarterly',
  8, 4, 1,
  0, 10,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- NEW DISSEMINATION INDICATORS (12)
-- =====================================================

-- DIS-KNO-05: Policy Briefs Published
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-KNO-05',
  'Policy Briefs Published',
  'dissemination',
  'Number of concise, evidence-based policy briefs produced to translate project research findings into actionable recommendations for policymakers and institutional decision-makers.',
  'Bridges the gap between research outputs and policy application. Demonstrates project commitment to knowledge translation beyond academic audiences.',
  'Policy brief quality varies significantly. Production does not guarantee readership or influence. Requires understanding of policy cycles and decision-making contexts.',
  'Target 2-4 policy briefs per project, timed to relevant policy windows. Co-creation with policy stakeholders increases uptake. Track distribution to targeted policymakers.',
  'number',
  'sum',
  'manual',
  'quarterly',
  4, 2, 1,
  0, 5,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-KNO-06: Best Practice Guides Produced
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-KNO-06',
  'Best Practice Guides Produced',
  'dissemination',
  'Number of structured best practice guides, handbooks, or implementation manuals published that synthesise project learnings into replicable methodologies for practitioners.',
  'Maximises practical value of project results by packaging knowledge for direct application. Supports sustainability and replication beyond the project context.',
  'Guide usability depends on target audience involvement in development. Shelf life limited without maintenance. Context-specificity may reduce transferability.',
  'Aim for 2-5 guides targeting different practitioner groups. Co-develop with end users for relevance. Include case studies and step-by-step workflows.',
  'number',
  'sum',
  'manual',
  'quarterly',
  4, 2, 1,
  0, 5,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-KNO-07: Datasets Made Openly Available
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-KNO-07',
  'Datasets Made Openly Available',
  'dissemination',
  'Number of structured datasets deposited in recognised open data repositories (e.g., Zenodo, Figshare, national data portals) with FAIR-compliant metadata and persistent identifiers.',
  'Fulfils EU Open Science requirements and maximises reuse potential of project-generated data. Enables secondary research and cross-project validation.',
  'FAIR compliance levels vary. Data sensitivity may restrict openness. Curation and documentation effort is substantial. Download counts do not equal meaningful reuse.',
  'Horizon Europe mandates data management plans with open-by-default principle. Target deposit within 6 months of data collection completion. Track DOI-based citations.',
  'number',
  'sum',
  'manual',
  'quarterly',
  5, 2, 1,
  0, 8,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-KNO-08: Technical Standards Contributed To
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-KNO-08',
  'Technical Standards Contributed To',
  'dissemination',
  'Number of formal technical standards, norms, or specifications (ISO, CEN, W3C, ETSI, or equivalent) to which the project has made documented contributions or submissions.',
  'Standards represent the highest form of knowledge codification with binding or normative force. Contributions indicate project outputs have reached maturity for standardisation.',
  'Standards development cycles are multi-year. Contribution acceptance is uncertain. Requires dedicated expertise and resources. Attribution may be diluted in committee processes.',
  'Even 1-2 standards contributions is significant for most projects. Track stage of contribution (proposal, working draft, published standard). National standards bodies count.',
  'number',
  'sum',
  'manual',
  'annually',
  3, 1, 0,
  0, 3,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-TRA-03: Training Participants (Total)
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-TRA-03',
  'Training Participants (Total)',
  'dissemination',
  'Total number of individuals who participated in project-delivered training activities across all formats (in-person, virtual, blended), counted as unique participants per training event.',
  'Aggregated reach metric for capacity-building activities. Complements session counts by showing actual human capital development scale.',
  'Unique counting across multiple events is challenging. Attendance does not equal completion or learning. Participant demographics and seniority affect impact significance.',
  'Target 100-500 trainees for mid-scale projects. Track repeat participants separately. Disaggregate by stakeholder type and geography for evaluation reporting.',
  'number',
  'sum',
  'manual',
  'per_activity',
  300, 100, 30,
  0, 500,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-TRA-04: Post-Training Application Rate
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-TRA-04',
  'Post-Training Application Rate',
  'dissemination',
  'Percentage of training participants who report applying learned skills or knowledge in their professional practice within 6 months of training, measured via follow-up survey.',
  'Measures training transfer and real-world impact beyond classroom satisfaction. Demonstrates that capacity building leads to behaviour change and operational improvement.',
  'Self-reported data subject to recall and desirability bias. Low response rates to follow-up surveys typical (20-40%). Attribution to specific training event difficult in complex work environments.',
  'Application rates of 40-60% indicate effective training design. <30% suggests disconnect between content and professional needs. Include specific application examples in survey.',
  'percentage',
  'average',
  'survey',
  'annually',
  50.0, 30.0, 15.0,
  20.0, 50.0,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-TRA-05: Train-the-Trainer Multiplier Events
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-TRA-05',
  'Train-the-Trainer Multiplier Events',
  'dissemination',
  'Number of training events delivered by individuals who were themselves trained by the project (second-generation or cascade training), indicating successful knowledge multiplication.',
  'Demonstrates scalability and sustainability of capacity-building approach. Multiplier events extend project reach exponentially beyond direct training activities.',
  'Quality control in cascade training is challenging. Content fidelity may degrade across generations. Tracking requires active network maintenance with trained trainers.',
  'Even 3-5 multiplier events represent significant scaling success. Calculate multiplication factor (trainees reached indirectly / direct trainees). Document quality assurance mechanisms.',
  'number',
  'sum',
  'manual',
  'quarterly',
  5, 2, 1,
  0, 8,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-OUT-01: Conference Presentations Delivered
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-OUT-01',
  'Conference Presentations Delivered',
  'dissemination',
  'Number of oral presentations, poster sessions, or demonstrations delivered at external conferences, symposia, or professional gatherings by project team members presenting project results.',
  'Indicates active participation in professional communities and peer-to-peer knowledge exchange. Conference settings provide credibility validation through peer selection processes.',
  'Accepted presentations do not guarantee audience size or engagement. Travel budget constraints limit participation. Poster sessions reach fewer people than oral presentations.',
  'Research-intensive projects: 15-30 presentations. Applied projects: 8-15. Prioritise high-impact, peer-reviewed conferences. Track audience size and feedback where available.',
  'number',
  'sum',
  'manual',
  'quarterly',
  15, 8, 3,
  0, 25,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-OUT-02: Invited Keynotes and Panels
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-OUT-02',
  'Invited Keynotes and Panels',
  'dissemination',
  'Number of invited keynote speeches, panel participations, or expert roundtable contributions where project team members are specifically requested to share project expertise.',
  'Invited contributions signal external recognition of project authority and relevance. Higher prestige than submitted presentations, indicating demand-side pull for project knowledge.',
  'Invitations may reflect personal networks rather than project merit alone. Typically fewer opportunities than submitted presentations. Quality of event and audience varies.',
  'Even 3-5 invited contributions over the project lifecycle indicates strong reputation building. High-level policy events and industry forums carry more weight than academic panels.',
  'number',
  'sum',
  'manual',
  'quarterly',
  5, 2, 1,
  0, 8,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-OUT-03: Cross-Project Collaborations
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-OUT-03',
  'Cross-Project Collaborations',
  'dissemination',
  'Number of formal or substantive collaborations established with other funded projects (joint publications, shared events, co-developed outputs, clustering activities) during the reporting period.',
  'Demonstrates synergy creation and avoidance of duplication within funding programmes. EU funders increasingly value clustering and cross-fertilisation between projects.',
  'Collaboration depth varies from token acknowledgement to deep integration. Coordination overhead can be significant. Measuring contribution balance between projects is subjective.',
  'Horizon Europe cluster projects expect 3-8 cross-project collaborations. Participate in programme-level clustering events. Document joint outputs explicitly.',
  'number',
  'sum',
  'manual',
  'quarterly',
  6, 3, 1,
  0, 8,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-CAP-03: Open Source Contributions
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-CAP-03',
  'Open Source Contributions',
  'dissemination',
  'Number of software tools, libraries, or code repositories made publicly available under recognised open-source licences (Apache 2.0, MIT, GPL, EUPL) with documentation and maintenance commitment.',
  'Maximises reuse potential of technical outputs. Aligns with EU Open Source Strategy and FAIR principles for software. Enables community-driven improvement and sustainability.',
  'Open sourcing without documentation or maintenance renders code unusable. Licence compatibility issues may limit adoption. Community building requires sustained effort beyond code release.',
  'Even 1-2 well-documented, actively maintained repositories is valuable. Track stars, forks, and external pull requests as adoption signals. Use Software Heritage for archival.',
  'number',
  'sum',
  'manual',
  'quarterly',
  3, 1, 0,
  0, 5,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- DIS-CAP-04: Educational Curriculum Integrations
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'DIS-CAP-04',
  'Educational Curriculum Integrations',
  'dissemination',
  'Number of formal integrations of project outputs into educational curricula at university, vocational, or professional development programme level, evidenced by syllabus references or course materials.',
  'Represents deep, sustained knowledge transfer into educational systems. Ensures project knowledge reaches future generations of professionals and researchers.',
  'Curriculum change cycles are slow (1-3 years). Attribution to a single project is often shared. Informal use in teaching harder to track than formal syllabus changes.',
  'Even 1-2 curriculum integrations demonstrate significant educational impact. Erasmus+ projects should actively target this. Provide ready-to-use teaching modules to facilitate adoption.',
  'number',
  'sum',
  'evidence-linked',
  'annually',
  3, 1, 0,
  0, 5,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- NEW EXPLOITATION INDICATORS (13)
-- =====================================================

-- EXP-INT-03: Letters of Support Collected
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-INT-03',
  'Letters of Support Collected',
  'exploitation',
  'Number of formal letters of support, endorsement, or intent received from external organisations expressing commitment to use, adopt, or promote project results.',
  'Tangible evidence of stakeholder buy-in and exploitation readiness. Letters provide documented proof of demand for evaluators and future funding applications.',
  'Letters may be obtained through professional courtesy without genuine commitment. Quality and specificity of commitments varies. Follow-up on stated intentions is essential.',
  'Collect 5-15 letters from diverse stakeholder types. Specific, time-bound commitments carry more weight than generic endorsements. Update letters annually to maintain relevance.',
  'number',
  'sum',
  'manual',
  'quarterly',
  10, 5, 2,
  0, 15,
  'basic', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-INT-04: Pilot Adoption Agreements
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-INT-04',
  'Pilot Adoption Agreements',
  'exploitation',
  'Number of signed agreements with external organisations to pilot, test, or trial project outputs in their operational context, including memoranda of understanding and pilot protocols.',
  'Represents the critical bridge between interest and implementation. Pilots provide real-world validation data essential for scaling exploitation activities.',
  'Pilot agreements may not progress to full adoption. Resource commitments from pilot partners vary. Pilot scope and duration affect comparability across projects.',
  'Target 3-8 pilot agreements with diverse organisations. Define success criteria upfront. Document lessons learned from each pilot for exploitation strategy refinement.',
  'number',
  'sum',
  'manual',
  'quarterly',
  5, 2, 1,
  0, 8,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-IMP-03: Market Validation Studies Completed
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-IMP-03',
  'Market Validation Studies Completed',
  'exploitation',
  'Number of structured market analysis, feasibility study, or user needs assessment exercises completed to validate commercial or operational viability of project outputs.',
  'Demonstrates evidence-based approach to exploitation planning. Reduces risk of misaligned exploitation strategies by grounding decisions in empirical market data.',
  'Study quality and methodology vary. Rapidly changing markets may render findings obsolete. Positive validation does not guarantee commercial success. Cost of professional studies is significant.',
  'Aim for 1-3 validation studies covering target markets/sectors. Include both demand-side (user willingness) and supply-side (competitive landscape) analysis.',
  'number',
  'sum',
  'manual',
  'annually',
  3, 1, 0,
  0, 3,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-IMP-04: Technology Readiness Level Advancement
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-IMP-04',
  'Technology Readiness Level Advancement',
  'exploitation',
  'Number of TRL levels advanced by the primary project technology or innovation during the project lifecycle, measured against the EU-standard 9-level TRL scale at project start and end.',
  'Standard EU metric for innovation maturity progression. Demonstrates tangible progress from concept to market-ready solution. Required reporting metric for many Horizon Europe calls.',
  'TRL assessment can be subjective without independent validation. Different components may advance at different rates. TRL is technology-focused and does not capture social or process innovation.',
  'Typical Horizon Europe projects target 2-3 TRL advancement (e.g., TRL 3-4 to TRL 6-7). Document evidence for each TRL gate. Commission independent TRL assessment for credibility.',
  'number',
  'max',
  'evidence-linked',
  'annually',
  3, 2, 1,
  0, 3,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-IMP-05: User Adoption Rate
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-IMP-05',
  'User Adoption Rate',
  'exploitation',
  'Percentage of target users within pilot or early-adopter organisations who actively use project outputs after initial deployment, measured at defined intervals post-introduction.',
  'Measures actual uptake beyond installation or access provision. Critical for distinguishing between theoretical availability and real-world integration into workflows.',
  'Definition of "active use" must be operationalised per context. Measurement infrastructure may be intrusive. Adoption curves vary by innovation complexity and organisational culture.',
  'Adoption rates >30% within 6 months indicate strong product-market fit. 10-30% is typical. <10% signals usability or relevance issues requiring intervention.',
  'percentage',
  'average',
  'analytics',
  'quarterly',
  30.0, 15.0, 5.0,
  0, 30.0,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-POL-02: Policy Consultations Participated In
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-POL-02',
  'Policy Consultations Participated In',
  'exploitation',
  'Number of formal policy consultations, regulatory reviews, or governmental advisory processes in which project team members participated and submitted evidence or recommendations.',
  'Demonstrates active engagement with policy-making processes. Participation provides direct channels to influence regulatory and strategic frameworks with project evidence.',
  'Participation does not guarantee influence on final policy. Consultation processes are time-intensive. Project contributions may be diluted among many respondents.',
  'Target 2-5 relevant consultations per year during active policy windows. EU-level consultations (European Commission) carry highest weight. Document specific contributions made.',
  'number',
  'sum',
  'manual',
  'quarterly',
  5, 2, 1,
  0, 8,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-POL-03: Standards Contributions Accepted
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-POL-03',
  'Standards Contributions Accepted',
  'exploitation',
  'Number of project-originated contributions formally accepted into published or draft technical standards, norms, or regulatory frameworks by recognised standardisation bodies.',
  'Represents the highest level of technical exploitation, where project knowledge becomes codified into binding or normative instruments with industry-wide or sector-wide application.',
  'Acceptance timelines extend beyond typical project duration. Committee politics influence outcomes. Contribution specificity may be diluted through consensus processes.',
  'Even a single accepted contribution to a major standard (ISO, CEN, ETSI) represents exceptional impact. Track contribution through standardisation pipeline stages.',
  'number',
  'sum',
  'evidence-linked',
  'annually',
  2, 1, 0,
  0, 3,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-ECO-03: Investment / Funding Attracted Post-Project
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-ECO-03',
  'Investment / Funding Attracted Post-Project',
  'exploitation',
  'Total value (EUR) of follow-on funding, venture capital, public grants, or institutional investment secured to further develop or scale project results after the initial funding period.',
  'Strongest signal of exploitation viability and external confidence in project outputs. Demonstrates that results are compelling enough to attract independent financial commitment.',
  'Attribution to original project versus team reputation is complex. Investment timelines may extend well beyond reporting periods. Confidentiality may limit disclosure.',
  'Follow-on public funding (500k-2M EUR) common for successful projects. Private investment (100k-5M EUR) indicates commercial potential. Track leverage ratio (follow-on / original grant).',
  'currency',
  'sum',
  'manual',
  'annually',
  1000000, 250000, 50000,
  0, 2000000,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-ECO-04: Cost Savings Demonstrated
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-ECO-04',
  'Cost Savings Demonstrated',
  'exploitation',
  'Total documented cost savings (EUR) achieved by adopting organisations through implementation of project outputs, calculated against established baselines using agreed methodology.',
  'Provides compelling economic evidence for exploitation and scaling decisions. Cost savings are universally understood and highly persuasive for policymakers and industry adopters.',
  'Baseline establishment and counterfactual reasoning challenging. Attribution to specific project outputs versus other operational changes is complex. Requires cooperation from adopting organisations.',
  'Document methodology transparently. Even 50-100k EUR in demonstrated savings provides strong business case. Distinguish one-time savings from recurring annual savings.',
  'currency',
  'sum',
  'evidence-linked',
  'annually',
  200000, 50000, 10000,
  0, 500000,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-ECO-05: Patents or IP Registrations Filed
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-ECO-05',
  'Patents or IP Registrations Filed',
  'exploitation',
  'Number of patent applications, trademark registrations, design rights, or other formal intellectual property protections filed based on project-generated innovations or outputs.',
  'Indicates commercially valuable innovation outputs. IP protection is a prerequisite for certain exploitation routes (licensing, spin-off creation, technology transfer).',
  'Filing does not guarantee grant. Patent prosecution is multi-year and expensive. Not all innovations are patentable. Open science objectives may conflict with IP protection strategies.',
  'Typical innovation projects: 1-3 patent filings. Software projects may prefer open-source licensing. Track filing status (provisional, national, PCT/EP). Align with consortium IP agreement.',
  'number',
  'sum',
  'manual',
  'annually',
  3, 1, 0,
  0, 5,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-SUS-01: Sustainability Plans Developed
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-SUS-01',
  'Sustainability Plans Developed',
  'exploitation',
  'Number of formal sustainability plans or business continuity strategies developed for key project outputs, specifying governance, funding models, and operational arrangements beyond the project period.',
  'Demonstrates forward planning for post-project viability. EU evaluators specifically assess whether projects have credible plans for sustaining results beyond funding.',
  'Plan existence does not guarantee execution. Plans may be aspirational without secured resources. Quality and specificity vary significantly across projects.',
  'Develop sustainability plans for each key exploitable result. Include revenue model, governance structure, and risk mitigation. Review and update annually. Present to advisory board.',
  'number',
  'sum',
  'manual',
  'annually',
  3, 1, 0,
  0, 5,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-SUS-02: Continuation Partnerships Secured
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-SUS-02',
  'Continuation Partnerships Secured',
  'exploitation',
  'Number of formal partnership agreements secured with organisations committed to maintaining, scaling, or further developing project outputs after the funded period concludes.',
  'Provides structural foundation for sustainability. Partners bring resources, networks, and legitimacy needed to sustain results beyond initial project investment.',
  'Partnership commitments may be contingent on conditions not yet met. Institutional priorities change. Partnership quality matters more than quantity.',
  'Target 2-5 continuation partnerships with complementary capabilities. Prioritise partners with operational capacity and aligned strategic interests. Formalise with MoUs or contracts.',
  'number',
  'sum',
  'manual',
  'annually',
  4, 2, 1,
  0, 5,
  'advanced', true, null
) ON CONFLICT (code) DO NOTHING;

-- EXP-SUS-03: Spin-off Companies Created
INSERT INTO public.indicator_library (
  code, name, domain, definition, rationale, limitations, interpretation_notes,
  unit, aggregation_method, data_source, collection_frequency,
  good_threshold, warning_threshold, poor_threshold,
  default_baseline, default_target, maturity_level, is_system, org_id
) VALUES (
  'EXP-SUS-03',
  'Spin-off Companies Created',
  'exploitation',
  'Number of new legal entities (companies, cooperatives, social enterprises) established specifically to commercialise or operationalise project results, with direct lineage to project outputs.',
  'Highest-impact exploitation outcome demonstrating commercial viability and entrepreneurial translation of research. Creates sustainable vehicles for long-term exploitation.',
  'Spin-off creation is resource-intensive and high-risk. Survival rates for research spin-offs are 50-60% at 5 years. Requires entrepreneurial talent beyond research capabilities.',
  'Even 1 spin-off is a significant project outcome. Track company stage (incorporated, funded, revenue-generating). Connect with incubators and accelerators early. Survival beyond 2 years is the key metric.',
  'number',
  'sum',
  'manual',
  'annually',
  2, 1, 0,
  0, 3,
  'expert', true, null
) ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- TAXONOMY LINKS FOR ALL NEW INDICATORS
-- =====================================================

DO $$
DECLARE
  v_ind_id uuid;
BEGIN

-- =====================================================
-- NEW COMMUNICATION INDICATORS - TAXONOMY LINKS
-- =====================================================

-- COM-REACH-05: Press Releases Distributed
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-REACH-05';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'media'),
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- COM-REACH-06: Media Mentions / Press Coverage
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-REACH-06';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'media') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- COM-ENG-04: Newsletter Click-Through Rate
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-ENG-04';
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

-- COM-ENG-05: Video Views
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-ENG-05';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'social_media'),
    (v_ind_id, 'website') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- COM-ENG-06: Content Shares / Amplification
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-ENG-06';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'engagement'),
    (v_ind_id, 'awareness') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'social_media') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- COM-DIG-01: Website Pages per Session
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-DIG-01';
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

-- COM-DIG-02: Social Media Follower Growth Rate
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-DIG-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'social_media') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- COM-DIG-03: Multilingual Content Coverage
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-DIG-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'website'),
    (v_ind_id, 'publications') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- COM-MAT-01: Communication Materials Produced
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-MAT-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'events'),
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

-- COM-MAT-02: Infographics and Visual Assets Created
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'COM-MAT-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'social_media'),
    (v_ind_id, 'website'),
    (v_ind_id, 'publications') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'public'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- =====================================================
-- NEW DISSEMINATION INDICATORS - TAXONOMY LINKS
-- =====================================================

-- DIS-KNO-05: Policy Briefs Published
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-KNO-05';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'policy_influence'),
    (v_ind_id, 'capacity_building') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'publications'),
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'practitioners') ON CONFLICT DO NOTHING;
END IF;

-- DIS-KNO-06: Best Practice Guides Produced
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-KNO-06';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'publications'),
    (v_ind_id, 'website') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- DIS-KNO-07: Datasets Made Openly Available
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-KNO-07';
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
    (v_ind_id, 'public') ON CONFLICT DO NOTHING;
END IF;

-- DIS-KNO-08: Technical Standards Contributed To
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-KNO-08';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'policy_influence'),
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'policymakers') ON CONFLICT DO NOTHING;
END IF;

-- DIS-TRA-03: Training Participants (Total)
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-TRA-03';
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
    (v_ind_id, 'industry'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- DIS-TRA-04: Post-Training Application Rate
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-TRA-04';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'training') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- DIS-TRA-05: Train-the-Trainer Multiplier Events
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-TRA-05';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'training'),
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

-- DIS-OUT-01: Conference Presentations Delivered
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-OUT-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'researchers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- DIS-OUT-02: Invited Keynotes and Panels
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-OUT-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'awareness'),
    (v_ind_id, 'policy_influence') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'events'),
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry') ON CONFLICT DO NOTHING;
END IF;

-- DIS-OUT-03: Cross-Project Collaborations
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-OUT-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement'),
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'researchers'),
    (v_ind_id, 'consortium'),
    (v_ind_id, 'practitioners') ON CONFLICT DO NOTHING;
END IF;

-- DIS-CAP-03: Open Source Contributions
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-CAP-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'sustainability'),
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'website'),
    (v_ind_id, 'publications') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'researchers'),
    (v_ind_id, 'industry'),
    (v_ind_id, 'practitioners') ON CONFLICT DO NOTHING;
END IF;

-- DIS-CAP-04: Educational Curriculum Integrations
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'DIS-CAP-04';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'capacity_building'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'training'),
    (v_ind_id, 'publications') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'researchers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'public') ON CONFLICT DO NOTHING;
END IF;

-- =====================================================
-- NEW EXPLOITATION INDICATORS - TAXONOMY LINKS
-- =====================================================

-- EXP-INT-03: Letters of Support Collected
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-INT-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'civil_society') ON CONFLICT DO NOTHING;
END IF;

-- EXP-INT-04: Pilot Adoption Agreements
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-INT-04';
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

-- EXP-IMP-03: Market Validation Studies Completed
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-IMP-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

-- EXP-IMP-04: Technology Readiness Level Advancement
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-IMP-04';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

-- EXP-IMP-05: User Adoption Rate
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-IMP-05';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement'),
    (v_ind_id, 'website') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'industry'),
    (v_ind_id, 'public') ON CONFLICT DO NOTHING;
END IF;

-- EXP-POL-02: Policy Consultations Participated In
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-POL-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'policy_influence'),
    (v_ind_id, 'engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement'),
    (v_ind_id, 'events') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'researchers') ON CONFLICT DO NOTHING;
END IF;

-- EXP-POL-03: Standards Contributions Accepted
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-POL-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'policy_influence'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'policymakers') ON CONFLICT DO NOTHING;
END IF;

-- EXP-ECO-03: Investment / Funding Attracted Post-Project
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-ECO-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'sustainability'),
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'consortium'),
    (v_ind_id, 'policymakers') ON CONFLICT DO NOTHING;
END IF;

-- EXP-ECO-04: Cost Savings Demonstrated
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-ECO-04';
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

-- EXP-ECO-05: Patents or IP Registrations Filed
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-ECO-05';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'uptake'),
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

-- EXP-SUS-01: Sustainability Plans Developed
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-SUS-01';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'sustainability') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement'),
    (v_ind_id, 'publications') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'consortium'),
    (v_ind_id, 'industry'),
    (v_ind_id, 'policymakers') ON CONFLICT DO NOTHING;
END IF;

-- EXP-SUS-02: Continuation Partnerships Secured
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-SUS-02';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'sustainability'),
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'practitioners'),
    (v_ind_id, 'policymakers'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

-- EXP-SUS-03: Spin-off Companies Created
SELECT indicator_id INTO v_ind_id FROM indicator_library WHERE code = 'EXP-SUS-03';
IF v_ind_id IS NOT NULL THEN
  INSERT INTO indicator_objective_types (indicator_id, objective_type) VALUES
    (v_ind_id, 'sustainability'),
    (v_ind_id, 'uptake') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_channels (indicator_id, channel_type) VALUES
    (v_ind_id, 'direct_engagement') ON CONFLICT DO NOTHING;
  INSERT INTO indicator_stakeholders (indicator_id, stakeholder_type) VALUES
    (v_ind_id, 'industry'),
    (v_ind_id, 'researchers'),
    (v_ind_id, 'consortium') ON CONFLICT DO NOTHING;
END IF;

END $$;
