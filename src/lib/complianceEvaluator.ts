/**
 * Compliance Rule Evaluation Engine
 *
 * Replaces the simulated random pass/fail with REAL data queries.
 * Each evaluator checks actual project data against compliance requirements.
 */
import { supabase } from './supabase';

export interface EvaluationResult {
  ruleId: string;
  ruleCode: string;
  ruleSeverity: string;
  ruleTitle: string;
  passed: boolean;
  description: string;
  module: string;
  affectedEntities: Array<{ type: string; id: string; name: string }>;
  remediationSuggestion: string;
  evaluationDetails: {
    evaluator: string;
    queriedTable: string;
    found: number;
    required: number | string;
    [key: string]: any;
  };
}

interface Rule {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: string;
  applies_to?: string;
  scope?: string;
  conditions?: any;
  programme_profile?: string;
}

// ---------- Module evaluators ----------
// Each evaluator queries real Supabase data and returns pass/fail with details

async function evaluateObjectives(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data, error } = await supabase
    .from('cde_objectives')
    .select('id, title, domain, status')
    .eq('project_id', projectId);

  const objectives = data || [];
  const activeObjectives = objectives.filter((o: any) => o.status !== 'archived');
  const hasCommunication = activeObjectives.some((o: any) => o.domain === 'communication');
  const hasDissemination = activeObjectives.some((o: any) => o.domain === 'dissemination');
  const hasExploitation = activeObjectives.some((o: any) => o.domain === 'exploitation');
  const allDomainsCovered = hasCommunication && hasDissemination && hasExploitation;

  // Check if rule is about domain coverage or just existence
  const isAboutDomains = rule.code?.includes('DOMAIN') || rule.title?.toLowerCase().includes('domain') || rule.title?.toLowerCase().includes('three');
  const passed = isAboutDomains ? allDomainsCovered : activeObjectives.length >= 1;

  const missingDomains: string[] = [];
  if (!hasCommunication) missingDomains.push('Communication');
  if (!hasDissemination) missingDomains.push('Dissemination');
  if (!hasExploitation) missingDomains.push('Exploitation');

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - Requirement met (${activeObjectives.length} active objectives)`
      : isAboutDomains
        ? `${rule.title} - Missing domains: ${missingDomains.join(', ')}`
        : `${rule.title} - No active objectives defined`,
    module: 'objectives',
    affectedEntities: passed ? [] : missingDomains.map(d => ({
      type: 'objective',
      id: d.toLowerCase(),
      name: `Missing ${d} objective`
    })),
    remediationSuggestion: passed
      ? ''
      : isAboutDomains
        ? `Add objectives for: ${missingDomains.join(', ')}. Go to Objectives and create at least one objective per CDE domain.`
        : 'Create at least one active objective in the Objectives module.',
    evaluationDetails: {
      evaluator: 'evaluateObjectives',
      queriedTable: 'cde_objectives',
      found: activeObjectives.length,
      required: isAboutDomains ? '3 domains' : '1+',
      domains: { communication: hasCommunication, dissemination: hasDissemination, exploitation: hasExploitation }
    }
  };
}

async function evaluateStakeholders(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data: groups } = await supabase
    .from('stakeholder_groups')
    .select('id, name, role')
    .eq('project_id', projectId);

  const { data: individual } = await supabase
    .from('stakeholders')
    .select('id, name, role')
    .eq('project_id', projectId);

  const stakeholderGroups = groups || [];
  const stakeholders = individual || [];
  const total = stakeholderGroups.length + stakeholders.length;
  const passed = total >= 2;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - ${total} stakeholder groups/entities defined`
      : `${rule.title} - Insufficient stakeholder mapping (${total} found, need at least 2)`,
    module: 'stakeholders',
    affectedEntities: passed ? [] : [{ type: 'stakeholder', id: 'missing', name: 'Need more stakeholder groups' }],
    remediationSuggestion: passed
      ? ''
      : 'Define at least 2 stakeholder groups in the Stakeholders module. EU projects require clear target audience identification.',
    evaluationDetails: {
      evaluator: 'evaluateStakeholders',
      queriedTable: 'stakeholder_groups, stakeholders',
      found: total,
      required: '2+',
      groups: stakeholderGroups.length,
      individual: stakeholders.length
    }
  };
}

async function evaluateActivities(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data } = await supabase
    .from('activities')
    .select('id, name, status, start_date, end_date, description')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  const activities = data || [];
  const planned = activities.filter((a: any) => a.status === 'planned');
  const inProgress = activities.filter((a: any) => a.status === 'in_progress');
  const completed = activities.filter((a: any) => a.status === 'completed');
  const withoutDates = activities.filter((a: any) => !a.start_date);

  const isAboutScheduling = rule.title?.toLowerCase().includes('schedul') || rule.title?.toLowerCase().includes('date') || rule.title?.toLowerCase().includes('plan');
  const passed = isAboutScheduling
    ? activities.length > 0 && withoutDates.length === 0
    : activities.length >= 3;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - ${activities.length} activities defined (${completed.length} completed, ${inProgress.length} in progress)`
      : isAboutScheduling
        ? `${rule.title} - ${withoutDates.length} activities without scheduled dates`
        : `${rule.title} - Insufficient activities (${activities.length} found, need at least 3)`,
    module: 'activities',
    affectedEntities: isAboutScheduling
      ? withoutDates.map((a: any) => ({ type: 'activity', id: a.id, name: a.name || 'Unnamed activity' }))
      : [],
    remediationSuggestion: passed
      ? ''
      : isAboutScheduling
        ? `Set start and end dates for all activities in the Activities module. ${withoutDates.length} activities need dates.`
        : 'Create at least 3 CDE activities. EU projects require a comprehensive activity plan covering communication, dissemination, and exploitation.',
    evaluationDetails: {
      evaluator: 'evaluateActivities',
      queriedTable: 'activities',
      found: activities.length,
      required: isAboutScheduling ? 'all with dates' : '3+',
      breakdown: { planned: planned.length, in_progress: inProgress.length, completed: completed.length },
      withoutDates: withoutDates.length
    }
  };
}

async function evaluateIndicators(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data: projectIndicators } = await supabase
    .from('project_indicators')
    .select('project_indicator_id, indicator_id, target, current_value, status')
    .eq('project_id', projectId)
    .eq('status', 'active');

  const { data: legacyIndicators } = await supabase
    .from('indicators')
    .select('id, name, target_value')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  const indicators = projectIndicators || [];
  const legacy = legacyIndicators || [];
  const totalIndicators = indicators.length + legacy.length;
  const withoutTargets = indicators.filter((i: any) => !i.target && i.target !== 0);
  const legacyWithoutTargets = legacy.filter((i: any) => !i.target_value && i.target_value !== 0);
  const allMissingTargets = withoutTargets.length + legacyWithoutTargets.length;

  const isAboutTargets = rule.title?.toLowerCase().includes('target') || rule.title?.toLowerCase().includes('kpi');
  const passed = isAboutTargets
    ? totalIndicators > 0 && allMissingTargets === 0
    : totalIndicators >= 2;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - ${totalIndicators} indicators with targets set`
      : isAboutTargets
        ? `${rule.title} - ${allMissingTargets} indicators without target values`
        : `${rule.title} - Insufficient indicators (${totalIndicators} found)`,
    module: 'indicators',
    affectedEntities: withoutTargets.map((i: any) => ({
      type: 'indicator',
      id: i.project_indicator_id || i.id,
      name: `Indicator missing target`
    })),
    remediationSuggestion: passed
      ? ''
      : isAboutTargets
        ? `Set target values for all indicators in the Monitoring module. ${allMissingTargets} indicators need targets.`
        : 'Add at least 2 monitoring indicators. These are required for EU reporting.',
    evaluationDetails: {
      evaluator: 'evaluateIndicators',
      queriedTable: 'project_indicators, indicators',
      found: totalIndicators,
      required: isAboutTargets ? 'all with targets' : '2+',
      projectIndicators: indicators.length,
      legacyIndicators: legacy.length,
      missingTargets: allMissingTargets
    }
  };
}

async function evaluateEvidence(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data: items } = await supabase
    .from('evidence_items')
    .select('id, title, type')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  const evidenceItems = items || [];

  // Only query links if we have evidence items (empty .in() causes PostgREST error)
  let evidenceLinks: any[] = [];
  if (evidenceItems.length > 0) {
    const { data: links } = await supabase
      .from('evidence_links')
      .select('id, evidence_item_id, activity_id, indicator_id')
      .in('evidence_item_id', evidenceItems.map((i: any) => i.id));
    evidenceLinks = links || [];
  }
  const linkedItems = new Set(evidenceLinks.map((l: any) => l.evidence_item_id));
  const unlinkedItems = evidenceItems.filter((i: any) => !linkedItems.has(i.id));

  const isAboutLinking = rule.title?.toLowerCase().includes('link') || rule.title?.toLowerCase().includes('attach');
  const passed = isAboutLinking
    ? evidenceItems.length > 0 && unlinkedItems.length === 0
    : evidenceItems.length >= 1;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - ${evidenceItems.length} evidence items, all linked`
      : isAboutLinking
        ? `${rule.title} - ${unlinkedItems.length} evidence items not linked to activities or indicators`
        : `${rule.title} - No evidence items uploaded`,
    module: 'evidence',
    affectedEntities: unlinkedItems.map((i: any) => ({
      type: 'evidence',
      id: i.id,
      name: i.title || 'Untitled evidence'
    })),
    remediationSuggestion: passed
      ? ''
      : isAboutLinking
        ? `Link all evidence items to activities or indicators in the Monitoring module. ${unlinkedItems.length} items need linking.`
        : 'Upload evidence to support your CDE activities and claims. Evidence is required for EU audit compliance.',
    evaluationDetails: {
      evaluator: 'evaluateEvidence',
      queriedTable: 'evidence_items, evidence_links',
      found: evidenceItems.length,
      required: isAboutLinking ? 'all linked' : '1+',
      linked: linkedItems.size,
      unlinked: unlinkedItems.length
    }
  };
}

async function evaluateMessages(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data } = await supabase
    .from('messages')
    .select('id, title, domain, status')
    .eq('project_id', projectId);

  const messages = data || [];
  const published = messages.filter((m: any) => m.status === 'published');
  const passed = messages.length >= 1;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - ${messages.length} messages defined (${published.length} published)`
      : `${rule.title} - No key messages defined`,
    module: 'messages',
    affectedEntities: [],
    remediationSuggestion: passed
      ? ''
      : 'Create key messages for your project in the Messages module. Clear messaging is essential for effective communication.',
    evaluationDetails: {
      evaluator: 'evaluateMessages',
      queriedTable: 'messages',
      found: messages.length,
      required: '1+',
      published: published.length
    }
  };
}

async function evaluateChannels(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data } = await supabase
    .from('channels')
    .select('id, name, type')
    .eq('project_id', projectId);

  const channels = data || [];
  const passed = channels.length >= 2;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - ${channels.length} channels configured`
      : `${rule.title} - Insufficient channels (${channels.length} found, need at least 2)`,
    module: 'channels',
    affectedEntities: [],
    remediationSuggestion: passed
      ? ''
      : 'Define at least 2 communication channels in the Channel Catalog. Consider using a mix of digital and traditional channels.',
    evaluationDetails: {
      evaluator: 'evaluateChannels',
      queriedTable: 'channels',
      found: channels.length,
      required: '2+'
    }
  };
}

async function evaluateExploitation(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data: assets } = await supabase
    .from('result_assets')
    .select('id, title, type')
    .eq('project_id', projectId);

  const { data: opportunities } = await supabase
    .from('uptake_opportunities')
    .select('id, organisation_name, stage, asset_id')
    .eq('project_id', projectId);

  const resultAssets = assets || [];
  const uptakeOpps = opportunities || [];
  const assetsWithOpps = new Set(uptakeOpps.filter((o: any) => o.asset_id).map((o: any) => o.asset_id));
  const assetsWithoutExploitation = resultAssets.filter((a: any) => !assetsWithOpps.has(a.id));

  const isAboutAssetCoverage = rule.title?.toLowerCase().includes('asset') || rule.title?.toLowerCase().includes('exploit');
  const passed = isAboutAssetCoverage
    ? resultAssets.length > 0 && assetsWithoutExploitation.length === 0
    : uptakeOpps.length >= 1;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - ${resultAssets.length} assets with exploitation pathways, ${uptakeOpps.length} opportunities tracked`
      : isAboutAssetCoverage
        ? `${rule.title} - ${assetsWithoutExploitation.length} result assets without exploitation opportunities`
        : `${rule.title} - No uptake opportunities tracked`,
    module: 'exploitation',
    affectedEntities: assetsWithoutExploitation.map((a: any) => ({
      type: 'result_asset',
      id: a.id,
      name: a.title || 'Unnamed asset'
    })),
    remediationSuggestion: passed
      ? ''
      : isAboutAssetCoverage
        ? `Create exploitation opportunities for ${assetsWithoutExploitation.length} unlinked assets in the Uptake module.`
        : 'Track at least one uptake opportunity in the Exploitation & Uptake Pipeline.',
    evaluationDetails: {
      evaluator: 'evaluateExploitation',
      queriedTable: 'result_assets, uptake_opportunities',
      found: uptakeOpps.length,
      required: isAboutAssetCoverage ? 'all assets covered' : '1+',
      totalAssets: resultAssets.length,
      coveredAssets: assetsWithOpps.size,
      uncoveredAssets: assetsWithoutExploitation.length
    }
  };
}

async function evaluateStrategy(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data } = await supabase
    .from('cde_strategies')
    .select('*')
    .eq('project_id', projectId)
    .limit(1);

  const strategy = data && data.length > 0 ? data[0] : null;
  const hasApproved = strategy?.status === 'approved' || strategy?.status === 'ready_for_review';
  const passed = !!strategy;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - CDE strategy defined (status: ${strategy?.status})`
      : `${rule.title} - No CDE strategy defined for this project`,
    module: 'strategy',
    affectedEntities: [],
    remediationSuggestion: passed
      ? ''
      : 'Define a CDE strategy for your project. This is a fundamental requirement for EU-funded projects.',
    evaluationDetails: {
      evaluator: 'evaluateStrategy',
      queriedTable: 'cde_strategies',
      found: strategy ? 1 : 0,
      required: '1',
      status: strategy?.status || 'none',
      isApproved: hasApproved
    }
  };
}

async function evaluatePublications(projectId: string, rule: Rule): Promise<EvaluationResult> {
  const { data } = await supabase
    .from('publication_items')
    .select('id, title, type')
    .eq('project_id', projectId);

  const publications = data || [];
  const passed = publications.length >= 1;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - ${publications.length} publications recorded`
      : `${rule.title} - No publications or reports recorded`,
    module: 'publications',
    affectedEntities: [],
    remediationSuggestion: passed
      ? ''
      : 'Record your project publications in the Reports module. Open access publications are a key requirement.',
    evaluationDetails: {
      evaluator: 'evaluatePublications',
      queriedTable: 'publication_items',
      found: publications.length,
      required: '1+'
    }
  };
}

// ---------- Generic fallback evaluator ----------
async function evaluateGeneric(projectId: string, rule: Rule): Promise<EvaluationResult> {
  // For rules we don't have a specific evaluator for, check if the module has any data
  const module = rule.applies_to || 'other';
  let found = 0;
  let queriedTable = 'none';

  // Try to query the most relevant table
  const tableMap: Record<string, string> = {
    report: 'reports',
    reports: 'reports',
    survey: 'surveys',
    surveys: 'surveys',
    partner: 'partners',
    partners: 'partners',
    agreement: 'agreement_records',
    agreements: 'agreement_records',
  };

  const tableName = tableMap[module.toLowerCase()];
  if (tableName) {
    try {
      const { data } = await supabase
        .from(tableName)
        .select('id')
        .eq('project_id', projectId)
        .limit(1);
      found = data?.length || 0;
      queriedTable = tableName;
    } catch {
      // Table might not exist — treat as no data found
      found = 0;
      queriedTable = `${tableName} (not accessible)`;
    }
  }

  const passed = found > 0 || !tableName;

  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleSeverity: rule.severity,
    ruleTitle: rule.title,
    passed,
    description: passed
      ? `${rule.title} - Requirement met`
      : `${rule.title} - Requirement not met`,
    module,
    affectedEntities: [],
    remediationSuggestion: passed ? '' : `Review and address: ${rule.title}`,
    evaluationDetails: {
      evaluator: 'evaluateGeneric',
      queriedTable,
      found,
      required: '1+',
      note: tableName ? 'Checked via table query' : 'No specific evaluator available — manual review recommended'
    }
  };
}

// ---------- Module router ----------
const EVALUATOR_MAP: Record<string, (projectId: string, rule: Rule) => Promise<EvaluationResult>> = {
  objectives: evaluateObjectives,
  objective: evaluateObjectives,
  stakeholders: evaluateStakeholders,
  stakeholder: evaluateStakeholders,
  activities: evaluateActivities,
  activity: evaluateActivities,
  indicators: evaluateIndicators,
  indicator: evaluateIndicators,
  monitoring: evaluateIndicators,
  evidence: evaluateEvidence,
  messages: evaluateMessages,
  message: evaluateMessages,
  channels: evaluateChannels,
  channel: evaluateChannels,
  exploitation: evaluateExploitation,
  uptake: evaluateExploitation,
  strategy: evaluateStrategy,
  publications: evaluatePublications,
  publication: evaluatePublications,
  reports: evaluatePublications,
  report: evaluatePublications,
};

// ---------- Main evaluation function ----------
export async function evaluateRules(
  projectId: string,
  rules: Rule[]
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  // Group rules by module to batch queries where possible
  for (const rule of rules) {
    try {
      const module = (rule.applies_to || '').toLowerCase();
      const evaluator = EVALUATOR_MAP[module] || evaluateGeneric;
      const result = await evaluator(projectId, rule);
      results.push(result);
    } catch (error: any) {
      console.error(`[Compliance] Error evaluating rule ${rule.code}:`, error);
      // If evaluation fails, report as a warning rather than crashing
      results.push({
        ruleId: rule.id,
        ruleCode: rule.code,
        ruleSeverity: rule.severity,
        ruleTitle: rule.title,
        passed: false,
        description: `${rule.title} - Evaluation error: could not check this rule`,
        module: rule.applies_to || 'other',
        affectedEntities: [],
        remediationSuggestion: 'This rule could not be evaluated automatically. Please check manually.',
        evaluationDetails: {
          evaluator: 'error',
          queriedTable: 'none',
          found: 0,
          required: 'unknown',
          error: error.message
        }
      });
    }
  }

  return results;
}

// ---------- Score calculation ----------
export function calculateComplianceScore(results: EvaluationResult[]): {
  score: number;
  passed: number;
  failed: number;
  total: number;
  bySeverity: Record<string, { passed: number; failed: number }>;
  byModule: Record<string, { passed: number; failed: number; total: number }>;
} {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  const bySeverity: Record<string, { passed: number; failed: number }> = {};
  const byModule: Record<string, { passed: number; failed: number; total: number }> = {};

  for (const result of results) {
    // By severity
    if (!bySeverity[result.ruleSeverity]) {
      bySeverity[result.ruleSeverity] = { passed: 0, failed: 0 };
    }
    if (result.passed) bySeverity[result.ruleSeverity].passed++;
    else bySeverity[result.ruleSeverity].failed++;

    // By module
    if (!byModule[result.module]) {
      byModule[result.module] = { passed: 0, failed: 0, total: 0 };
    }
    byModule[result.module].total++;
    if (result.passed) byModule[result.module].passed++;
    else byModule[result.module].failed++;
  }

  return { score, passed, failed, total, bySeverity, byModule };
}
