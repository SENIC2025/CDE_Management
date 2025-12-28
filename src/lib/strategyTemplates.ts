export interface StrategyTemplate {
  template_code: string;
  name: string;
  description: string;
  programme_type: 'horizon' | 'erasmus' | 'interreg' | 'generic';
  recommended_kpi_bundle_name: string;
  default_objectives: Array<{
    objective_type: 'awareness' | 'engagement' | 'capacity_building' | 'uptake' | 'policy_influence' | 'sustainability';
    priority: 'high' | 'medium' | 'low';
    stakeholder_types: string[];
    expected_outcome: 'visibility' | 'knowledge' | 'capability' | 'adoption' | 'policy_reference' | 'sustainability';
    notes: string;
  }>;
  default_stakeholder_groups: string[];
  default_channel_mix: Array<{
    channel_type: string;
    intensity: 'low' | 'medium' | 'high';
    frequency_json: {
      per_month?: number;
      description?: string;
    };
  }>;
  focus_guidance: {
    emphasis: string[];
    key_results: string[];
    assumptions: string[];
  };
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    template_code: 'HORIZON_STANDARD',
    name: 'Horizon Standard (Balanced C/D/E)',
    description: 'Balanced Communication, Dissemination, and Exploitation strategy for Horizon Europe projects',
    programme_type: 'horizon',
    recommended_kpi_bundle_name: 'Standard Horizon WP Communication Set',
    default_objectives: [
      {
        objective_type: 'awareness',
        priority: 'high',
        stakeholder_types: ['scientific_community', 'policy_makers', 'general_public'],
        expected_outcome: 'visibility',
        notes: 'Raise awareness of project activities and results'
      },
      {
        objective_type: 'engagement',
        priority: 'high',
        stakeholder_types: ['scientific_community', 'industry', 'civil_society'],
        expected_outcome: 'knowledge',
        notes: 'Engage stakeholders in project activities and knowledge transfer'
      },
      {
        objective_type: 'uptake',
        priority: 'medium',
        stakeholder_types: ['industry', 'practitioners', 'policy_makers'],
        expected_outcome: 'adoption',
        notes: 'Facilitate adoption of project results by relevant stakeholders'
      },
      {
        objective_type: 'policy_influence',
        priority: 'medium',
        stakeholder_types: ['policy_makers', 'regulators'],
        expected_outcome: 'policy_reference',
        notes: 'Influence policy development and regulatory frameworks'
      },
      {
        objective_type: 'sustainability',
        priority: 'high',
        stakeholder_types: ['all_stakeholders'],
        expected_outcome: 'sustainability',
        notes: 'Ensure long-term impact and sustainability beyond project duration'
      }
    ],
    default_stakeholder_groups: ['scientific_community', 'industry', 'policy_makers', 'general_public', 'civil_society'],
    default_channel_mix: [
      { channel_type: 'website', intensity: 'high', frequency_json: { per_month: 4, description: 'Weekly updates' } },
      { channel_type: 'social_media', intensity: 'high', frequency_json: { per_month: 12, description: '3x per week' } },
      { channel_type: 'newsletter', intensity: 'medium', frequency_json: { per_month: 1, description: 'Monthly newsletter' } },
      { channel_type: 'scientific_publications', intensity: 'medium', frequency_json: { description: 'As results emerge' } },
      { channel_type: 'workshops_events', intensity: 'medium', frequency_json: { description: '1-2 per year' } },
      { channel_type: 'policy_briefs', intensity: 'low', frequency_json: { description: 'At milestones' } }
    ],
    focus_guidance: {
      emphasis: ['Scientific excellence', 'Stakeholder engagement', 'Impact creation'],
      key_results: ['Publications', 'Policy uptake', 'Industry partnerships', 'Public awareness'],
      assumptions: ['Adequate resources', 'Stakeholder availability', 'Clear impact pathways']
    }
  },
  {
    template_code: 'ERASMUS_UPTAKE',
    name: 'Erasmus+ Dissemination & Uptake',
    description: 'Dissemination and uptake-focused strategy for Erasmus+ education and training projects',
    programme_type: 'erasmus',
    recommended_kpi_bundle_name: 'Erasmus+ Dissemination & Uptake Core Set',
    default_objectives: [
      {
        objective_type: 'awareness',
        priority: 'high',
        stakeholder_types: ['educators', 'students', 'education_institutions'],
        expected_outcome: 'visibility',
        notes: 'Raise awareness among education and training stakeholders'
      },
      {
        objective_type: 'capacity_building',
        priority: 'high',
        stakeholder_types: ['educators', 'trainers'],
        expected_outcome: 'capability',
        notes: 'Build capacity of educators and trainers to use project outputs'
      },
      {
        objective_type: 'uptake',
        priority: 'high',
        stakeholder_types: ['education_institutions', 'training_providers'],
        expected_outcome: 'adoption',
        notes: 'Facilitate adoption of project outputs in educational settings'
      },
      {
        objective_type: 'sustainability',
        priority: 'medium',
        stakeholder_types: ['all_stakeholders'],
        expected_outcome: 'sustainability',
        notes: 'Ensure long-term use and sustainability of outputs'
      }
    ],
    default_stakeholder_groups: ['educators', 'students', 'education_institutions', 'training_providers', 'policy_makers'],
    default_channel_mix: [
      { channel_type: 'project_website', intensity: 'high', frequency_json: { per_month: 4, description: 'Regular updates' } },
      { channel_type: 'social_media', intensity: 'high', frequency_json: { per_month: 8, description: '2x per week' } },
      { channel_type: 'training_materials', intensity: 'high', frequency_json: { description: 'Throughout project' } },
      { channel_type: 'workshops_events', intensity: 'high', frequency_json: { description: 'Multiple per year' } },
      { channel_type: 'peer_learning', intensity: 'medium', frequency_json: { description: 'Ongoing' } },
      { channel_type: 'dissemination_platform', intensity: 'medium', frequency_json: { description: 'At key milestones' } }
    ],
    focus_guidance: {
      emphasis: ['Practitioner engagement', 'Capacity building', 'Practical uptake'],
      key_results: ['Training materials used', 'Educators trained', 'Institutions adopting', 'Peer exchanges'],
      assumptions: ['Access to target groups', 'Materials meet needs', 'Institutional support']
    }
  },
  {
    template_code: 'INTERREG_POLICY',
    name: 'Interreg Policy Influence & Territorial Uptake',
    description: 'Policy influence and territorial uptake strategy for Interreg cross-border cooperation',
    programme_type: 'interreg',
    recommended_kpi_bundle_name: 'Interreg Stakeholder & Policy Influence Set',
    default_objectives: [
      {
        objective_type: 'awareness',
        priority: 'high',
        stakeholder_types: ['regional_authorities', 'local_communities', 'cross_border_partners'],
        expected_outcome: 'visibility',
        notes: 'Raise awareness among regional and cross-border stakeholders'
      },
      {
        objective_type: 'engagement',
        priority: 'high',
        stakeholder_types: ['regional_authorities', 'practitioners', 'civil_society'],
        expected_outcome: 'knowledge',
        notes: 'Engage stakeholders in territorial cooperation activities'
      },
      {
        objective_type: 'policy_influence',
        priority: 'high',
        stakeholder_types: ['regional_authorities', 'policy_makers'],
        expected_outcome: 'policy_reference',
        notes: 'Influence regional and cross-border policy development'
      },
      {
        objective_type: 'uptake',
        priority: 'high',
        stakeholder_types: ['regional_authorities', 'practitioners', 'local_communities'],
        expected_outcome: 'adoption',
        notes: 'Facilitate territorial uptake and implementation of solutions'
      }
    ],
    default_stakeholder_groups: ['regional_authorities', 'local_communities', 'practitioners', 'cross_border_partners', 'policy_makers'],
    default_channel_mix: [
      { channel_type: 'project_website', intensity: 'high', frequency_json: { per_month: 4, description: 'Regular updates' } },
      { channel_type: 'stakeholder_meetings', intensity: 'high', frequency_json: { description: 'Quarterly' } },
      { channel_type: 'policy_documents', intensity: 'high', frequency_json: { description: 'At milestones' } },
      { channel_type: 'regional_events', intensity: 'medium', frequency_json: { description: 'Multiple per year' } },
      { channel_type: 'cross_border_exchange', intensity: 'medium', frequency_json: { description: 'Ongoing' } },
      { channel_type: 'territorial_media', intensity: 'medium', frequency_json: { per_month: 2, description: 'Regular coverage' } }
    ],
    focus_guidance: {
      emphasis: ['Policy influence', 'Territorial cooperation', 'Stakeholder engagement'],
      key_results: ['Policy uptake', 'Cross-border solutions', 'Regional implementation', 'Stakeholder networks'],
      assumptions: ['Political support', 'Cross-border coordination', 'Regional capacity']
    }
  },
  {
    template_code: 'LIGHTWEIGHT',
    name: 'Lightweight (SME / Practitioner Projects)',
    description: 'Simplified, practical strategy for smaller projects with limited capacity',
    programme_type: 'generic',
    recommended_kpi_bundle_name: 'Lightweight SME / Practitioner Project Set',
    default_objectives: [
      {
        objective_type: 'awareness',
        priority: 'high',
        stakeholder_types: ['target_users', 'practitioners'],
        expected_outcome: 'visibility',
        notes: 'Make target users aware of project and outputs'
      },
      {
        objective_type: 'engagement',
        priority: 'medium',
        stakeholder_types: ['target_users', 'practitioners'],
        expected_outcome: 'knowledge',
        notes: 'Engage users with project outputs and learning'
      },
      {
        objective_type: 'uptake',
        priority: 'high',
        stakeholder_types: ['target_users', 'practitioners'],
        expected_outcome: 'adoption',
        notes: 'Facilitate practical use of project outputs'
      }
    ],
    default_stakeholder_groups: ['target_users', 'practitioners', 'partners'],
    default_channel_mix: [
      { channel_type: 'website', intensity: 'medium', frequency_json: { per_month: 2, description: 'Bi-weekly updates' } },
      { channel_type: 'social_media', intensity: 'medium', frequency_json: { per_month: 4, description: 'Weekly posts' } },
      { channel_type: 'email', intensity: 'low', frequency_json: { description: 'At key moments' } },
      { channel_type: 'practical_tools', intensity: 'high', frequency_json: { description: 'Throughout project' } },
      { channel_type: 'webinars', intensity: 'low', frequency_json: { description: '2-3 per year' } }
    ],
    focus_guidance: {
      emphasis: ['Practical outputs', 'Direct user engagement', 'Simple communication'],
      key_results: ['Users reached', 'Tools downloaded', 'Feedback received', 'Outputs applied'],
      assumptions: ['Limited resources', 'Clear target audience', 'Practical focus']
    }
  }
];

export function getTemplateByCode(code: string): StrategyTemplate | undefined {
  return STRATEGY_TEMPLATES.find(t => t.template_code === code);
}
