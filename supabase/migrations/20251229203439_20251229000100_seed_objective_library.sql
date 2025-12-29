/*
  # Seed Objective Library with EU-Ready Objectives

  1. Communication Objectives (5)
    - Stakeholder dialogue and engagement
    - Two-way communication establishment
    - Awareness raising among target audiences

  2. Dissemination Objectives (7)
    - Knowledge transfer and diffusion
    - Research output publication
    - Results communication to wider audiences

  3. Exploitation Objectives (6)
    - Impact generation and uptake
    - Policy influence and systems change
    - Sustainability and lasting change

  4. Policy & Systems Objectives (4)
    - Policy integration and influence
    - Systemic impact and transformation

  Total: 22 production-grade objectives with KPI suggestions
*/

-- Temporarily disable RLS for seeding
SET session_replication_role = replica;

-- Communication Objectives
INSERT INTO objective_library (
  code, title, description, domain, outcome_type, maturity_level,
  programme_relevance, default_stakeholder_types, suggested_channel_types, suggested_indicator_codes
) VALUES
('OBJ-COM-01', 
 'Establish Two-Way Dialogue with Key Stakeholders',
 'Create sustained dialogue channels with policymakers, practitioners and end-users to co-create solutions and gather actionable feedback on project outputs.',
 'communication', 'engagement', 'basic',
 ARRAY['horizon', 'erasmus', 'interreg', 'generic'],
 ARRAY['policymakers', 'practitioners', 'researchers'],
 ARRAY['workshops', 'events', 'online_meetings'],
 ARRAY['COM-001', 'COM-005', 'ENG-002']),

('OBJ-COM-02',
 'Build Awareness of Project Results Among Target Groups',
 'Increase visibility and recognition of project innovations and findings among identified stakeholder communities through targeted outreach campaigns.',
 'communication', 'visibility', 'basic',
 ARRAY['horizon', 'erasmus', 'generic'],
 ARRAY['public', 'practitioners', 'industry'],
 ARRAY['social_media', 'website', 'newsletters'],
 ARRAY['VIS-001', 'VIS-003', 'COM-002']),

('OBJ-COM-03',
 'Engage Civil Society in Co-Design Activities',
 'Mobilize civil society organizations and community groups in participatory design and validation of project solutions to ensure relevance and social acceptance.',
 'communication', 'engagement', 'advanced',
 ARRAY['horizon', 'interreg', 'generic'],
 ARRAY['civil_society', 'public', 'practitioners'],
 ARRAY['workshops', 'focus_groups', 'community_events'],
 ARRAY['ENG-001', 'ENG-003', 'CAP-004']),

('OBJ-COM-04',
 'Foster Multi-Stakeholder Partnerships for Knowledge Exchange',
 'Cultivate collaborative networks linking research, policy, industry and practice communities to facilitate cross-sector knowledge exchange and mutual learning.',
 'communication', 'engagement', 'advanced',
 ARRAY['horizon', 'erasmus', 'interreg'],
 ARRAY['researchers', 'policymakers', 'industry', 'practitioners'],
 ARRAY['conferences', 'networking_events', 'workshops'],
 ARRAY['ENG-002', 'DIS-003', 'POL-001']),

('OBJ-COM-05',
 'Maintain Transparent Communication with Consortium and Funders',
 'Ensure clear, timely and accountable communication with project partners and funding bodies on progress, challenges and strategic decisions.',
 'communication', 'visibility', 'basic',
 ARRAY['horizon', 'erasmus', 'interreg', 'generic'],
 ARRAY['consortium', 'funders'],
 ARRAY['reports', 'meetings', 'newsletters'],
 ARRAY['COM-004', 'GOV-001']),

-- Dissemination Objectives
('OBJ-DIS-01',
 'Publish Project Results in Peer-Reviewed Journals',
 'Disseminate research findings through high-impact open-access publications to contribute to scientific knowledge advancement and enhance project credibility.',
 'dissemination', 'knowledge', 'basic',
 ARRAY['horizon', 'erasmus', 'generic'],
 ARRAY['researchers', 'academics'],
 ARRAY['publications', 'repositories'],
 ARRAY['KNO-001', 'DIS-001', 'VIS-002']),

('OBJ-DIS-02',
 'Present Findings at International Scientific Conferences',
 'Showcase project innovations and research outcomes at major academic and professional conferences to reach specialist audiences and build reputation.',
 'dissemination', 'visibility', 'basic',
 ARRAY['horizon', 'erasmus', 'generic'],
 ARRAY['researchers', 'academics', 'practitioners'],
 ARRAY['conferences', 'webinars'],
 ARRAY['VIS-001', 'DIS-002', 'KNO-002']),

('OBJ-DIS-03',
 'Transfer Knowledge to Practitioners Through Training Materials',
 'Develop and distribute accessible training resources, toolkits and guidelines that translate research into actionable knowledge for professional practice.',
 'dissemination', 'knowledge', 'advanced',
 ARRAY['horizon', 'erasmus', 'interreg', 'generic'],
 ARRAY['practitioners', 'professionals', 'educators'],
 ARRAY['training', 'webinars', 'resources'],
 ARRAY['KNO-003', 'CAP-001', 'DIS-004']),

('OBJ-DIS-04',
 'Communicate Results to Policy Audiences via Policy Briefs',
 'Produce evidence-based policy briefs and executive summaries that distill key findings into policy-relevant recommendations for decision-makers.',
 'dissemination', 'knowledge', 'advanced',
 ARRAY['horizon', 'interreg', 'generic'],
 ARRAY['policymakers', 'government'],
 ARRAY['publications', 'policy_events'],
 ARRAY['POL-002', 'DIS-003', 'KNO-004']),

('OBJ-DIS-05',
 'Reach General Public Through Popular Media',
 'Translate complex project outcomes into engaging content for mainstream media channels to raise public awareness and understanding of project impact.',
 'dissemination', 'visibility', 'basic',
 ARRAY['horizon', 'erasmus', 'interreg', 'generic'],
 ARRAY['public', 'media'],
 ARRAY['press', 'social_media', 'website'],
 ARRAY['VIS-003', 'COM-003', 'DIS-005']),

('OBJ-DIS-06',
 'Create Open Educational Resources for Wider Adoption',
 'Develop freely accessible educational materials and learning modules that enable educators and trainers to integrate project outcomes into curricula.',
 'dissemination', 'knowledge', 'advanced',
 ARRAY['erasmus', 'horizon', 'generic'],
 ARRAY['educators', 'trainers', 'students'],
 ARRAY['elearning', 'repositories', 'moocs'],
 ARRAY['KNO-003', 'CAP-002', 'DIS-006']),

('OBJ-DIS-07',
 'Establish Digital Presence and Knowledge Repository',
 'Build comprehensive online platforms housing project outputs, data and interactive resources to ensure lasting accessibility and discoverability.',
 'dissemination', 'visibility', 'basic',
 ARRAY['horizon', 'erasmus', 'interreg', 'generic'],
 ARRAY['all'],
 ARRAY['website', 'repositories', 'social_media'],
 ARRAY['VIS-002', 'DIS-001', 'SUS-003']),

-- Exploitation Objectives
('OBJ-EXP-01',
 'Drive Uptake of Project Tools by Target End-Users',
 'Achieve documented adoption and integration of project tools, methods or technologies into the operational practices of target user groups.',
 'exploitation', 'adoption', 'advanced',
 ARRAY['horizon', 'interreg', 'generic'],
 ARRAY['practitioners', 'industry', 'organizations'],
 ARRAY['training', 'implementation_support', 'pilot_projects'],
 ARRAY['UPT-001', 'UPT-002', 'CAP-003']),

('OBJ-EXP-02',
 'Build Capacity of Practitioners to Apply Project Outcomes',
 'Enhance skills, competencies and confidence of professional communities to effectively implement and sustain project innovations in their contexts.',
 'exploitation', 'capability', 'advanced',
 ARRAY['horizon', 'erasmus', 'interreg'],
 ARRAY['practitioners', 'professionals', 'trainers'],
 ARRAY['training', 'mentoring', 'communities_of_practice'],
 ARRAY['CAP-001', 'CAP-002', 'UPT-003']),

('OBJ-EXP-03',
 'Secure Commercialization Pathways for Project Innovations',
 'Establish viable business models, IP strategies and market entry plans to enable commercial exploitation and revenue generation from project outputs.',
 'exploitation', 'adoption', 'expert',
 ARRAY['horizon', 'generic'],
 ARRAY['industry', 'investors', 'entrepreneurs'],
 ARRAY['pitch_events', 'business_networking', 'technology_transfer'],
 ARRAY['EXP-001', 'EXP-002', 'SUS-002']),

('OBJ-EXP-04',
 'Integrate Project Outcomes into Organizational Processes',
 'Embed project methodologies, frameworks or standards into the routine operations and governance structures of participating and target organizations.',
 'exploitation', 'adoption', 'advanced',
 ARRAY['horizon', 'erasmus', 'interreg'],
 ARRAY['organizations', 'management', 'decision_makers'],
 ARRAY['implementation_support', 'change_management', 'consultation'],
 ARRAY['UPT-002', 'SUS-001', 'POL-003']),

('OBJ-EXP-05',
 'Create Sustainable Mechanisms for Continued Project Impact',
 'Establish institutional arrangements, communities of practice or funding streams that ensure project outcomes continue to deliver value beyond project lifetime.',
 'exploitation', 'sustainability', 'expert',
 ARRAY['horizon', 'erasmus', 'interreg', 'generic'],
 ARRAY['organizations', 'funders', 'consortium'],
 ARRAY['networks', 'sustainability_plans', 'follow_on_projects'],
 ARRAY['SUS-001', 'SUS-002', 'GOV-002']),

('OBJ-EXP-06',
 'Scale Up Successful Pilots to Wider Geographic or Sectoral Coverage',
 'Replicate and adapt validated project interventions across additional regions, sectors or demographic groups to maximize impact reach.',
 'exploitation', 'adoption', 'expert',
 ARRAY['horizon', 'interreg', 'generic'],
 ARRAY['all'],
 ARRAY['scaling_programs', 'replication_support', 'partnerships'],
 ARRAY['UPT-003', 'SUS-001', 'POL-004']),

-- Policy & Systems Objectives
('OBJ-POL-01',
 'Influence Policy Development with Evidence-Based Recommendations',
 'Provide robust evidence and actionable recommendations that inform the design, revision or implementation of policies at local, national or EU level.',
 'exploitation', 'policy_influence', 'advanced',
 ARRAY['horizon', 'interreg', 'generic'],
 ARRAY['policymakers', 'government', 'eu_institutions'],
 ARRAY['policy_events', 'consultations', 'advocacy'],
 ARRAY['POL-001', 'POL-002', 'POL-003']),

('OBJ-POL-02',
 'Secure Formal Adoption of Project Outputs in Policy Instruments',
 'Achieve official integration of project recommendations, standards or tools into legislation, regulations, guidelines or funding programs.',
 'exploitation', 'policy_influence', 'expert',
 ARRAY['horizon', 'interreg'],
 ARRAY['policymakers', 'government', 'regulators'],
 ARRAY['policy_advocacy', 'consultations', 'roundtables'],
 ARRAY['POL-003', 'POL-004', 'SUS-002']),

('OBJ-POL-03',
 'Catalyze Systemic Change in Target Sectors or Communities',
 'Drive transformative shifts in attitudes, norms, practices or structures within targeted systems that enable sustained and scalable impact.',
 'exploitation', 'sustainability', 'expert',
 ARRAY['horizon', 'interreg'],
 ARRAY['all'],
 ARRAY['advocacy', 'coalitions', 'system_convening'],
 ARRAY['SYS-001', 'POL-004', 'SUS-001']),

('OBJ-POL-04',
 'Establish Multi-Level Governance Frameworks for Sustained Collaboration',
 'Create formal or informal governance structures spanning multiple stakeholder levels that institutionalize collaboration and coordination beyond the project.',
 'exploitation', 'sustainability', 'expert',
 ARRAY['horizon', 'interreg'],
 ARRAY['government', 'organizations', 'networks'],
 ARRAY['governance_design', 'stakeholder_forums', 'mous'],
 ARRAY['GOV-002', 'SUS-002', 'POL-004'])

ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  domain = EXCLUDED.domain,
  outcome_type = EXCLUDED.outcome_type,
  maturity_level = EXCLUDED.maturity_level,
  programme_relevance = EXCLUDED.programme_relevance,
  default_stakeholder_types = EXCLUDED.default_stakeholder_types,
  suggested_channel_types = EXCLUDED.suggested_channel_types,
  suggested_indicator_codes = EXCLUDED.suggested_indicator_codes,
  updated_at = now();

-- Re-enable RLS
SET session_replication_role = DEFAULT;
