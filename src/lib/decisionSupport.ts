import { supabase } from './supabase';
import {
  DecisionSupportSettings,
  DEFAULT_DECISION_SUPPORT_SETTINGS,
  FlagOverride,
  getSettingsFromProject,
} from './decisionSupportTypes';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ChannelEffectiveness {
  channel_id: string;
  channel_name: string;
  channel_type: string;
  domain?: string;
  effort_hours_total: number;
  cost_proxy_total: number;
  reach_total: number;
  evidence_completeness_avg: number;
  meaningful_engagement_total: number;
  effectiveness_score: number;
  activity_count: number;
}

export interface StakeholderResponsiveness {
  stakeholder_group_id: string;
  stakeholder_group_name: string;
  targeted_activities_count: number;
  response_events_count: number;
  responsiveness_ratio: number;
  flag_high_targeting_low_response: boolean;
}

export interface ObjectiveDiagnostic {
  objective_id: string;
  objective_title: string;
  objective_domain: string;
  linked_activities_count: number;
  linked_activities_by_domain: Record<string, number>;
  linked_assets_count: number;
  linked_indicators_count: number;
  indicator_progress_ratio: number | null;
  evidence_coverage_ratio: number;
  status: 'On track' | 'At risk' | 'Blocked';
  reasons: string[];
  recommended_actions: RecommendedAction[];
}

export interface RecommendedAction {
  title: string;
  description: string;
  link?: string;
}

export interface RecommendationFlag {
  id: string;
  flag_code: string;
  title: string;
  severity: 'info' | 'warn' | 'high';
  entity_type: string;
  entity_id: string;
  entity_name: string;
  explanation: string;
  suggested_action: string;
  deep_link_url: string;
  override?: FlagOverride;
}

export interface DerivedMetrics {
  cost_per_meaningful_engagement_overall: number | null;
  cost_per_meaningful_engagement_by_channel: Record<string, number>;
  evidence_adjusted_reach_overall: number;
  evidence_adjusted_reach_by_channel: Record<string, number>;
  uptake_lag_median_days: number | null;
  uptake_lag_by_asset_type: Record<string, number>;
}

export class DecisionSupportService {
  private settings: DecisionSupportSettings = DEFAULT_DECISION_SUPPORT_SETTINGS;
  private overrides: Map<string, FlagOverride> = new Map();

  constructor(
    private projectId: string,
    private periodId?: string,
    private dateRange?: DateRange
  ) {}

  async initialize() {
    await this.loadSettings();
    await this.loadOverrides();
  }

  private async loadSettings() {
    const { data } = await supabase
      .from('projects')
      .select('settings_json')
      .eq('id', this.projectId)
      .maybeSingle();

    if (data && data.settings_json) {
      this.settings = getSettingsFromProject(data);
    }
  }

  private async loadOverrides() {
    let query = supabase
      .from('decision_flag_overrides')
      .select('*')
      .eq('project_id', this.projectId);

    if (this.periodId) {
      query = query.eq('period_id', this.periodId);
    }

    const { data } = await query;

    if (data) {
      data.forEach((override: any) => {
        const key = `${override.entity_type}-${override.entity_id}-${override.flag_code}`;
        this.overrides.set(key, override);
      });
    }
  }

  private getOverride(entityType: string, entityId: string, flagCode: string): FlagOverride | undefined {
    const key = `${entityType}-${entityId}-${flagCode}`;
    return this.overrides.get(key);
  }

  getSettings(): DecisionSupportSettings {
    return { ...this.settings };
  }

  async calculateChannelEffectiveness(
    filters?: { domain?: string; stakeholder_group_id?: string }
  ): Promise<ChannelEffectiveness[]> {

    const { data: channels } = await supabase
      .from('channels')
      .select('*')
      .eq('project_id', this.projectId);

    if (!channels) return [];

    const results: ChannelEffectiveness[] = [];

    for (const channel of channels) {
      let activityQuery = supabase
        .from('activities')
        .select('*, evidence_links(id)')
        .eq('project_id', this.projectId)
        .contains('channels', [channel.id])
        .is('deleted_at', null);

      if (this.dateRange) {
        activityQuery = activityQuery
          .gte('end_date', this.dateRange.start.toISOString().split('T')[0])
          .lte('end_date', this.dateRange.end.toISOString().split('T')[0]);
      }

      if (filters?.domain) {
        activityQuery = activityQuery.eq('domain', filters.domain);
      }

      if (filters?.stakeholder_group_id) {
        activityQuery = activityQuery.contains('stakeholder_groups', [filters.stakeholder_group_id]);
      }

      const { data: activities } = await activityQuery;

      if (!activities || activities.length === 0) {
        continue;
      }

      const effort_hours_total = activities.reduce((sum, a) => sum + (Number(a.effort_hours) || 0), 0);
      const cost_proxy_total = activities.reduce(
        (sum, a) => sum + (Number(a.budget_estimate) || Number(a.effort_hours) * this.settings.hourly_rate_default || 0),
        0
      );

      const activity_ids = activities.map(a => a.id);

      const { data: reachIndicatorValues } = await supabase
        .from('indicator_values')
        .select('value, indicator:indicators!inner(category)')
        .in('indicator.project_id', [this.projectId])
        .eq('indicator.category', 'reach');

      let reach_total = 0;
      if (reachIndicatorValues) {
        reach_total = reachIndicatorValues.reduce((sum, iv) => sum + Number(iv.value || 0), 0);
      }

      const evidence_completeness_avg =
        activities.reduce((sum, a) => sum + (a.completeness_score || 0), 0) / activities.length || 0;

      const { data: surveyResponses } = await supabase
        .from('survey_responses')
        .select('id, survey:surveys!inner(activity_id)')
        .in('survey.activity_id', activity_ids);

      const { data: qualOutcomes } = await supabase
        .from('qualitative_outcome_logs')
        .select('id')
        .in('activity_id', activity_ids);

      const { data: uptakeOpps } = await supabase
        .from('uptake_opportunities')
        .select('id, asset_id')
        .eq('project_id', this.projectId);

      const meaningful_engagement_total =
        (surveyResponses?.length || 0) + (qualOutcomes?.length || 0) + (uptakeOpps?.length || 0);

      const effectiveness_score = cost_proxy_total > 0 ? meaningful_engagement_total / cost_proxy_total : 0;

      results.push({
        channel_id: channel.id,
        channel_name: channel.name,
        channel_type: channel.type,
        domain: filters?.domain,
        effort_hours_total,
        cost_proxy_total,
        reach_total,
        evidence_completeness_avg,
        meaningful_engagement_total,
        effectiveness_score,
        activity_count: activities.length,
      });
    }

    return results.sort((a, b) => b.effectiveness_score - a.effectiveness_score);
  }

  async calculateStakeholderResponsiveness(
    filters?: { domain?: string }
  ): Promise<StakeholderResponsiveness[]> {
    const { data: stakeholderGroups } = await supabase
      .from('stakeholder_groups')
      .select('*')
      .eq('project_id', this.projectId);

    if (!stakeholderGroups) return [];

    const results: StakeholderResponsiveness[] = [];

    for (const sg of stakeholderGroups) {
      let activityQuery = supabase
        .from('activities')
        .select('id')
        .eq('project_id', this.projectId)
        .contains('stakeholder_groups', [sg.id])
        .is('deleted_at', null);

      if (this.dateRange) {
        activityQuery = activityQuery
          .gte('end_date', this.dateRange.start.toISOString().split('T')[0])
          .lte('end_date', this.dateRange.end.toISOString().split('T')[0]);
      }

      if (filters?.domain) {
        activityQuery = activityQuery.eq('domain', filters.domain);
      }

      const { data: activities } = await activityQuery;
      const targeted_activities_count = activities?.length || 0;

      if (targeted_activities_count === 0) continue;

      const activity_ids = activities.map(a => a.id);

      const { data: surveyResponses } = await supabase
        .from('survey_responses')
        .select('id, survey:surveys!inner(activity_id)')
        .in('survey.activity_id', activity_ids);

      const { data: qualOutcomes } = await supabase
        .from('qualitative_outcome_logs')
        .select('id')
        .in('activity_id', activity_ids);

      const response_events_count = (surveyResponses?.length || 0) + (qualOutcomes?.length || 0);
      const responsiveness_ratio = targeted_activities_count > 0 ? response_events_count / targeted_activities_count : 0;
      const flag_high_targeting_low_response =
        targeted_activities_count >= this.settings.stakeholder_high_targeting_threshold &&
        responsiveness_ratio < this.settings.stakeholder_low_response_ratio_threshold;

      results.push({
        stakeholder_group_id: sg.id,
        stakeholder_group_name: sg.name,
        targeted_activities_count,
        response_events_count,
        responsiveness_ratio,
        flag_high_targeting_low_response,
      });
    }

    return results.sort((a, b) => b.responsiveness_ratio - a.responsiveness_ratio);
  }

  async calculateObjectiveDiagnostics(): Promise<ObjectiveDiagnostic[]> {
    const { data: objectives } = await supabase
      .from('cde_objectives')
      .select('*')
      .eq('project_id', this.projectId);

    if (!objectives) return [];

    const results: ObjectiveDiagnostic[] = [];

    for (const obj of objectives) {
      let activityQuery = supabase
        .from('activities')
        .select('id, domain, completeness_score')
        .eq('project_id', this.projectId)
        .contains('objectives', [obj.id])
        .is('deleted_at', null);

      if (this.dateRange) {
        activityQuery = activityQuery
          .gte('end_date', this.dateRange.start.toISOString().split('T')[0])
          .lte('end_date', this.dateRange.end.toISOString().split('T')[0]);
      }

      const { data: activities } = await activityQuery;
      const linked_activities_count = activities?.length || 0;

      const linked_activities_by_domain: Record<string, number> = {};
      activities?.forEach(a => {
        linked_activities_by_domain[a.domain] = (linked_activities_by_domain[a.domain] || 0) + 1;
      });

      let assetQuery = supabase
        .from('activities')
        .select('assets')
        .eq('project_id', this.projectId)
        .contains('objectives', [obj.id])
        .is('deleted_at', null);

      const { data: activitiesWithAssets } = await assetQuery;
      const assetIds = new Set<string>();
      activitiesWithAssets?.forEach(a => {
        const assets = (a.assets as any[]) || [];
        assets.forEach(assetId => assetIds.add(assetId));
      });
      const linked_assets_count = assetIds.size;

      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, target, indicator_values(*)')
        .eq('project_id', this.projectId)
        .is('deleted_at', null);

      const linked_indicators_count = indicators?.length || 0;

      let indicator_progress_ratio: number | null = null;
      if (indicators && indicators.length > 0) {
        let totalProgress = 0;
        let countWithTarget = 0;
        indicators.forEach(ind => {
          const target = Number(ind.target) || 0;
          if (target > 0) {
            const values = (ind.indicator_values as any[]) || [];
            const latestValue = values[values.length - 1];
            if (latestValue) {
              const actual = Number(latestValue.value) || 0;
              totalProgress += actual / target;
              countWithTarget++;
            }
          }
        });
        if (countWithTarget > 0) {
          indicator_progress_ratio = totalProgress / countWithTarget;
        }
      }

      const activitiesWithGoodEvidence = activities?.filter(a => (a.completeness_score || 0) >= this.settings.evidence_completeness_threshold).length || 0;
      const evidence_coverage_ratio = linked_activities_count > 0 ? activitiesWithGoodEvidence / linked_activities_count : 0;

      const { data: surveyResponses } = await supabase
        .from('survey_responses')
        .select('id, survey:surveys!inner(activity_id)')
        .in('survey.activity_id', activities?.map(a => a.id) || []);

      const { data: qualOutcomes } = await supabase
        .from('qualitative_outcome_logs')
        .select('id')
        .in('activity_id', activities?.map(a => a.id) || []);

      const meaningful_engagement_exists = (surveyResponses?.length || 0) + (qualOutcomes?.length || 0) > 0;

      let status: 'On track' | 'At risk' | 'Blocked' = 'On track';
      const reasons: string[] = [];
      const recommended_actions: RecommendedAction[] = [];

      if (linked_activities_count === 0) {
        status = 'Blocked';
        reasons.push('No activities linked to this objective');
        recommended_actions.push({
          title: 'Create activities',
          description: 'Add activities to progress this objective',
          link: `/activities?objective=${obj.id}`,
        });
      } else {
        if (indicator_progress_ratio !== null && indicator_progress_ratio >= this.settings.objective_on_track_progress_threshold) {
          status = 'On track';
        } else if (evidence_coverage_ratio >= this.settings.objective_evidence_coverage_threshold && meaningful_engagement_exists) {
          status = 'On track';
        } else {
          status = 'At risk';

          if (linked_assets_count > 0 && (linked_activities_by_domain['dissemination'] || 0) === 0) {
            reasons.push('Dissemination coverage gap: objective has assets but no dissemination activities');
            recommended_actions.push({
              title: 'Plan dissemination',
              description: 'Create dissemination activities for the linked assets',
              link: `/activities?domain=dissemination`,
            });
          }

          if (evidence_coverage_ratio < 0.5) {
            reasons.push('Execution gap: activities exist but evidence coverage is low');
            recommended_actions.push({
              title: 'Add evidence',
              description: 'Upload evidence for completed activities',
              link: `/monitoring`,
            });
          }

          if (evidence_coverage_ratio >= 0.5 && !meaningful_engagement_exists) {
            reasons.push('Effectiveness gap: evidence exists but no meaningful engagement or outcomes recorded');
            recommended_actions.push({
              title: 'Record outcomes',
              description: 'Log qualitative outcomes or survey responses',
              link: `/monitoring`,
            });
          }

          if ((linked_activities_by_domain['dissemination'] || 0) > 0) {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const { data: recentDissemination } = await supabase
              .from('activities')
              .select('id')
              .eq('project_id', this.projectId)
              .eq('domain', 'dissemination')
              .contains('objectives', [obj.id])
              .gte('end_date', threeMonthsAgo.toISOString().split('T')[0])
              .is('deleted_at', null);

            const { data: uptakeOpps } = await supabase
              .from('uptake_opportunities')
              .select('id')
              .eq('project_id', this.projectId);

            if (recentDissemination && recentDissemination.length > 0 && (!uptakeOpps || uptakeOpps.length === 0)) {
              reasons.push('Exploitation gap: dissemination exists but no uptake signals within 3 months');
              recommended_actions.push({
                title: 'Track uptake',
                description: 'Record uptake opportunities or exploitation plans',
                link: `/uptake`,
              });
            }
          }
        }
      }

      results.push({
        objective_id: obj.id,
        objective_title: obj.title,
        objective_domain: obj.domain,
        linked_activities_count,
        linked_activities_by_domain,
        linked_assets_count,
        linked_indicators_count,
        indicator_progress_ratio,
        evidence_coverage_ratio,
        status,
        reasons,
        recommended_actions,
      });
    }

    return results;
  }

  async calculateEvidenceCompleteness(activityId: string): Promise<number> {
    const { data: activity } = await supabase
      .from('activities')
      .select('domain, evidence_links(evidence_item:evidence_items(*))')
      .eq('id', activityId)
      .single();

    if (!activity) return 0;

    let score = 0;
    const evidenceLinks = (activity.evidence_links as any[]) || [];

    if (evidenceLinks.length > 0) {
      score += 40;

      const activityDomain = activity.domain;
      const evidenceTypes = evidenceLinks.map((el: any) => el.evidence_item?.type).filter(Boolean);

      if (activityDomain === 'dissemination') {
        if (evidenceTypes.includes('photo') || evidenceTypes.includes('video')) {
          score += 30;
        }
      } else if (activityDomain === 'communication') {
        if (evidenceTypes.includes('document') || evidenceTypes.includes('screenshot')) {
          score += 30;
        }
      }

      const hasMetadata = evidenceLinks.some((el: any) => {
        const item = el.evidence_item;
        return item && item.evidence_date && (item.context || item.source_url);
      });

      if (hasMetadata) {
        score += 30;
      }
    }

    return Math.min(score, 100);
  }

  async calculateDerivedMetrics(): Promise<DerivedMetrics> {
    const channelEffectiveness = await this.calculateChannelEffectiveness();

    const totalCost = channelEffectiveness.reduce((sum, c) => sum + c.cost_proxy_total, 0);
    const totalEngagement = channelEffectiveness.reduce((sum, c) => sum + c.meaningful_engagement_total, 0);
    const totalReach = channelEffectiveness.reduce((sum, c) => sum + c.reach_total, 0);
    const totalEvidenceAdjustedReach = channelEffectiveness.reduce(
      (sum, c) => sum + c.reach_total * (c.evidence_completeness_avg / 100),
      0
    );

    const cost_per_meaningful_engagement_overall =
      totalEngagement > 0 ? totalCost / totalEngagement : null;

    const cost_per_meaningful_engagement_by_channel: Record<string, number> = {};
    const evidence_adjusted_reach_by_channel: Record<string, number> = {};

    channelEffectiveness.forEach(c => {
      cost_per_meaningful_engagement_by_channel[c.channel_name] =
        c.meaningful_engagement_total > 0 ? c.cost_proxy_total / c.meaningful_engagement_total : 0;
      evidence_adjusted_reach_by_channel[c.channel_name] =
        c.reach_total * (c.evidence_completeness_avg / 100);
    });

    const { data: assets } = await supabase
      .from('result_assets')
      .select('id, type')
      .eq('project_id', this.projectId);

    const uptakeLags: number[] = [];
    const uptakeLagsByType: Record<string, number[]> = {};

    if (assets) {
      for (const asset of assets) {
        const { data: disseminationActivities } = await supabase
          .from('activities')
          .select('end_date')
          .eq('project_id', this.projectId)
          .eq('domain', 'dissemination')
          .contains('assets', [asset.id])
          .is('deleted_at', null)
          .order('end_date', { ascending: true })
          .limit(1);

        const { data: uptakeOpps } = await supabase
          .from('uptake_opportunities')
          .select('created_at')
          .eq('asset_id', asset.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (disseminationActivities && disseminationActivities.length > 0 && uptakeOpps && uptakeOpps.length > 0) {
          const dissemDate = new Date(disseminationActivities[0].end_date);
          const uptakeDate = new Date(uptakeOpps[0].created_at);
          const lagDays = Math.floor((uptakeDate.getTime() - dissemDate.getTime()) / (1000 * 60 * 60 * 24));

          if (lagDays >= 0) {
            uptakeLags.push(lagDays);
            if (!uptakeLagsByType[asset.type]) {
              uptakeLagsByType[asset.type] = [];
            }
            uptakeLagsByType[asset.type].push(lagDays);
          }
        }
      }
    }

    const median = (arr: number[]) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };

    const uptake_lag_by_asset_type: Record<string, number> = {};
    Object.entries(uptakeLagsByType).forEach(([type, lags]) => {
      const med = median(lags);
      if (med !== null) {
        uptake_lag_by_asset_type[type] = med;
      }
    });

    return {
      cost_per_meaningful_engagement_overall,
      cost_per_meaningful_engagement_by_channel,
      evidence_adjusted_reach_overall: totalEvidenceAdjustedReach,
      evidence_adjusted_reach_by_channel,
      uptake_lag_median_days: median(uptakeLags),
      uptake_lag_by_asset_type,
    };
  }

  async generateRecommendationFlags(): Promise<RecommendationFlag[]> {
    const flags: RecommendationFlag[] = [];

    const objectiveDiagnostics = await this.calculateObjectiveDiagnostics();
    objectiveDiagnostics
      .filter(od => od.status === 'At risk' || od.status === 'Blocked')
      .forEach(od => {
        const flagCode = od.status === 'Blocked' ? 'objective_blocked' : 'objective_at_risk';
        const flag: RecommendationFlag = {
          id: `obj-${od.objective_id}`,
          flag_code: flagCode,
          title: `Objective "${od.objective_title}" is ${od.status}`,
          severity: od.status === 'Blocked' ? 'high' : 'warn',
          entity_type: 'objective',
          entity_id: od.objective_id,
          entity_name: od.objective_title,
          explanation: od.reasons.join('; '),
          suggested_action: od.recommended_actions.map(a => a.title).join(', '),
          deep_link_url: `/objectives/${od.objective_id}`,
        };
        const override = this.getOverride('objective', od.objective_id, flagCode);
        if (override) {
          flag.override = override;
        }
        flags.push(flag);
      });

    const { data: assets } = await supabase
      .from('result_assets')
      .select('id, title, type')
      .eq('project_id', this.projectId);

    if (assets) {
      for (const asset of assets) {
        const { data: disseminationActivities } = await supabase
          .from('activities')
          .select('id, end_date')
          .eq('project_id', this.projectId)
          .eq('domain', 'dissemination')
          .contains('assets', [asset.id])
          .is('deleted_at', null)
          .order('end_date', { ascending: true })
          .limit(1);

        if (disseminationActivities && disseminationActivities.length > 0) {
          const dissemDate = new Date(disseminationActivities[0].end_date);
          const daysSince = Math.floor((Date.now() - dissemDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSince > this.settings.uptake_no_exploitation_days) {
            const { data: uptakeOpps } = await supabase
              .from('uptake_opportunities')
              .select('id')
              .eq('asset_id', asset.id);

            const { data: sustainPlan } = await supabase
              .from('sustainability_plans')
              .select('id')
              .eq('asset_id', asset.id)
              .maybeSingle();

            if ((!uptakeOpps || uptakeOpps.length === 0) && !sustainPlan) {
              const flagCode = 'asset_no_exploitation';
              const flag: RecommendationFlag = {
                id: `asset-${asset.id}`,
                flag_code: flagCode,
                title: `Asset "${asset.title}" has no exploitation pathway`,
                severity: 'warn',
                entity_type: 'asset',
                entity_id: asset.id,
                entity_name: asset.title,
                explanation: `Asset was disseminated ${daysSince} days ago but has no uptake opportunities or sustainability plan`,
                suggested_action: 'Create uptake opportunity or sustainability plan',
                deep_link_url: `/assets/${asset.id}`,
              };
              const override = this.getOverride('asset', asset.id, flagCode);
              if (override) {
                flag.override = override;
              }
              flags.push(flag);
            }
          }
        }
      }
    }

    const channelEffectiveness = await this.calculateChannelEffectiveness();
    channelEffectiveness.forEach(c => {
      if (c.effort_hours_total > this.settings.inefficient_channel_effort_hours_threshold && c.meaningful_engagement_total === 0) {
        const flagCode = 'channel_inefficient';
        const flag: RecommendationFlag = {
          id: `channel-${c.channel_id}`,
          flag_code: flagCode,
          title: `Channel "${c.channel_name}" is inefficient`,
          severity: 'warn',
          entity_type: 'channel',
          entity_id: c.channel_id,
          entity_name: c.channel_name,
          explanation: `High effort (${c.effort_hours_total}h) but no meaningful engagement`,
          suggested_action: 'Review channel strategy or add engagement tracking',
          deep_link_url: `/channels/${c.channel_id}`,
        };
        const override = this.getOverride('channel', c.channel_id, flagCode);
        if (override) {
          flag.override = override;
        }
        flags.push(flag);
      }
    });

    let activityQuery = supabase
      .from('activities')
      .select('id, title, domain, completeness_score')
      .eq('project_id', this.projectId)
      .in('domain', ['dissemination', 'communication'])
      .eq('status', 'completed')
      .is('deleted_at', null);

    const { data: publicActivities } = await activityQuery;

    if (publicActivities) {
      publicActivities.forEach(a => {
        if ((a.completeness_score || 0) < this.settings.evidence_completeness_threshold) {
          const flagCode = 'activity_evidence_gap';
          const flag: RecommendationFlag = {
            id: `activity-${a.id}`,
            flag_code: flagCode,
            title: `Activity "${a.title}" has evidence gap`,
            severity: 'info',
            entity_type: 'activity',
            entity_id: a.id,
            entity_name: a.title,
            explanation: `Public ${a.domain} activity with evidence completeness < ${this.settings.evidence_completeness_threshold}%`,
            suggested_action: 'Upload evidence (photos, documents, etc.)',
            deep_link_url: `/activities/${a.id}`,
          };
          const override = this.getOverride('activity', a.id, flagCode);
          if (override) {
            flag.override = override;
          }
          flags.push(flag);
        }
      });
    }

    return flags.sort((a, b) => {
      const severityOrder = { high: 0, warn: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
}
