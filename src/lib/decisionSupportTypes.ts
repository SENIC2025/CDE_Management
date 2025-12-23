export interface DecisionSupportSettings {
  hourly_rate_default: number;
  evidence_completeness_threshold: number;
  stakeholder_high_targeting_threshold: number;
  stakeholder_low_response_ratio_threshold: number;
  uptake_no_exploitation_days: number;
  inefficient_channel_effort_hours_threshold: number;
  objective_on_track_progress_threshold: number;
  objective_evidence_coverage_threshold: number;
  meaningful_engagement_weights: {
    survey_response_weight: number;
    qual_outcome_weight: number;
    uptake_opportunity_weight: number;
    agreement_weight: number;
  };
  definitions: {
    meaningful_engagement_definition: string;
    evidence_completeness_definition: string;
    uptake_lag_definition: string;
  };
}

export const DEFAULT_DECISION_SUPPORT_SETTINGS: DecisionSupportSettings = {
  hourly_rate_default: 50,
  evidence_completeness_threshold: 60,
  stakeholder_high_targeting_threshold: 3,
  stakeholder_low_response_ratio_threshold: 0.5,
  uptake_no_exploitation_days: 90,
  inefficient_channel_effort_hours_threshold: 20,
  objective_on_track_progress_threshold: 0.8,
  objective_evidence_coverage_threshold: 0.7,
  meaningful_engagement_weights: {
    survey_response_weight: 1,
    qual_outcome_weight: 1,
    uptake_opportunity_weight: 2,
    agreement_weight: 3,
  },
  definitions: {
    meaningful_engagement_definition:
      'Actions by stakeholders that demonstrate active consideration or adoption of project outputs, including survey responses, documented outcomes, uptake opportunities, and formal agreements.',
    evidence_completeness_definition:
      'A score (0-100) measuring the quality and appropriateness of evidence attached to activities. Score components: +40 for any evidence, +30 for evidence type matching activity domain, +30 for complete metadata (date, context/source).',
    uptake_lag_definition:
      'The time elapsed (in days) between the first dissemination of an asset and the first recorded uptake signal (opportunity or agreement).',
  },
};

export interface FlagOverride {
  id: string;
  project_id: string;
  period_id: string | null;
  entity_type: string;
  entity_id: string;
  flag_code: string;
  status: 'open' | 'acknowledged' | 'not_applicable' | 'false_positive' | 'resolved';
  rationale: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface MethodologyContent {
  cde_definitions: {
    communication: string;
    dissemination: string;
    exploitation: string;
  };
  application_notes: {
    communication: string;
    dissemination: string;
    exploitation: string;
  };
  logic_model_labeling: {
    inputs: string;
    activities: string;
    outputs: string;
    outcomes: string;
    uptake: string;
  };
  indicator_typology_notes: {
    output_indicators: string;
    outcome_indicators: string;
    uptake_indicators: string;
    sustainability_indicators: string;
  };
  meaningful_engagement_definition: string;
  evidence_policy: string;
}

export const DEFAULT_METHODOLOGY_CONTENT: MethodologyContent = {
  cde_definitions: {
    communication:
      'Planned activities to raise awareness and share project progress with defined stakeholder groups.',
    dissemination:
      'Strategic activities to ensure project results reach appropriate audiences and are made accessible for use.',
    exploitation:
      'Activities to maximize the value of project results through uptake, commercialization, or integration into practice.',
  },
  application_notes: {
    communication: 'This project applies communication through...',
    dissemination: 'This project applies dissemination through...',
    exploitation: 'This project applies exploitation through...',
  },
  logic_model_labeling: {
    inputs: 'Resources, expertise, and funding invested in the project.',
    activities: 'Actions carried out to achieve project objectives.',
    outputs: 'Tangible deliverables produced by activities.',
    outcomes: 'Changes in awareness, behavior, or practice resulting from outputs.',
    uptake: 'Adoption and sustained use of outputs by target stakeholders.',
  },
  indicator_typology_notes: {
    output_indicators:
      'Measure deliverables produced (e.g., publications, tools, datasets). Limit: do not measure impact.',
    outcome_indicators:
      'Measure changes in stakeholder awareness or behavior. Limit: difficult to attribute causality.',
    uptake_indicators:
      'Measure adoption and sustained use. Limit: may require long observation periods.',
    sustainability_indicators:
      'Measure post-project viability and maintenance. Limit: measured after project completion.',
  },
  meaningful_engagement_definition:
    'Stakeholder actions demonstrating active consideration of project results.',
  evidence_policy:
    'All public-facing activities require photographic or documentary evidence. All data-related activities require extraction records.',
};

export interface ProjectMethodology {
  id: string;
  project_id: string;
  version: number;
  status: 'draft' | 'approved';
  content_json: MethodologyContent;
  change_rationale: string;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function validateSettings(settings: any): DecisionSupportSettings {
  const validated: DecisionSupportSettings = { ...DEFAULT_DECISION_SUPPORT_SETTINGS };

  if (typeof settings.hourly_rate_default === 'number' && settings.hourly_rate_default > 0) {
    validated.hourly_rate_default = settings.hourly_rate_default;
  }

  if (
    typeof settings.evidence_completeness_threshold === 'number' &&
    settings.evidence_completeness_threshold >= 0 &&
    settings.evidence_completeness_threshold <= 100
  ) {
    validated.evidence_completeness_threshold = settings.evidence_completeness_threshold;
  }

  if (
    typeof settings.stakeholder_high_targeting_threshold === 'number' &&
    settings.stakeholder_high_targeting_threshold > 0
  ) {
    validated.stakeholder_high_targeting_threshold = settings.stakeholder_high_targeting_threshold;
  }

  if (
    typeof settings.stakeholder_low_response_ratio_threshold === 'number' &&
    settings.stakeholder_low_response_ratio_threshold >= 0 &&
    settings.stakeholder_low_response_ratio_threshold <= 1
  ) {
    validated.stakeholder_low_response_ratio_threshold =
      settings.stakeholder_low_response_ratio_threshold;
  }

  if (
    typeof settings.uptake_no_exploitation_days === 'number' &&
    settings.uptake_no_exploitation_days > 0
  ) {
    validated.uptake_no_exploitation_days = settings.uptake_no_exploitation_days;
  }

  if (
    typeof settings.inefficient_channel_effort_hours_threshold === 'number' &&
    settings.inefficient_channel_effort_hours_threshold > 0
  ) {
    validated.inefficient_channel_effort_hours_threshold =
      settings.inefficient_channel_effort_hours_threshold;
  }

  if (
    typeof settings.objective_on_track_progress_threshold === 'number' &&
    settings.objective_on_track_progress_threshold >= 0 &&
    settings.objective_on_track_progress_threshold <= 1
  ) {
    validated.objective_on_track_progress_threshold = settings.objective_on_track_progress_threshold;
  }

  if (
    typeof settings.objective_evidence_coverage_threshold === 'number' &&
    settings.objective_evidence_coverage_threshold >= 0 &&
    settings.objective_evidence_coverage_threshold <= 1
  ) {
    validated.objective_evidence_coverage_threshold = settings.objective_evidence_coverage_threshold;
  }

  if (settings.meaningful_engagement_weights) {
    validated.meaningful_engagement_weights = {
      ...DEFAULT_DECISION_SUPPORT_SETTINGS.meaningful_engagement_weights,
      ...settings.meaningful_engagement_weights,
    };
  }

  if (settings.definitions) {
    validated.definitions = {
      ...DEFAULT_DECISION_SUPPORT_SETTINGS.definitions,
      ...settings.definitions,
    };
  }

  return validated;
}

export function getSettingsFromProject(project: any): DecisionSupportSettings {
  if (!project || !project.settings_json) {
    return DEFAULT_DECISION_SUPPORT_SETTINGS;
  }

  return validateSettings(project.settings_json);
}
