import { supabase } from './supabase';
import { getTemplateByCode, type StrategyTemplate } from './strategyTemplates';

export interface CDEStrategy {
  strategy_id: string;
  project_id: string;
  status: 'not_started' | 'draft' | 'ready_for_review' | 'approved';
  template_code: string | null;
  focus_json: {
    emphasis?: string[];
    target_audiences?: string[];
    key_results?: string[];
    assumptions?: string[];
    constraints?: string[];
  };
  cadence_json: {
    periods?: number;
    months?: number;
    channel_frequencies?: Record<string, any>;
    key_moments?: string[];
  };
  roles_json: {
    cde_lead_user_id?: string;
    contributors?: string[];
    approval_mode?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CDEStrategyObjective {
  strategy_objective_id: string;
  strategy_id: string;
  activity_id: string | null;
  objective_type: 'awareness' | 'engagement' | 'capacity_building' | 'uptake' | 'policy_influence' | 'sustainability';
  priority: 'high' | 'medium' | 'low';
  stakeholder_types: string[];
  expected_outcome: 'visibility' | 'knowledge' | 'capability' | 'adoption' | 'policy_reference' | 'sustainability';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CDEStrategyChannelPlan {
  channel_plan_id: string;
  strategy_id: string;
  channel_type: string;
  intensity: 'low' | 'medium' | 'high';
  frequency_json: {
    per_month?: number;
    description?: string;
  };
  linked_objective_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CDEStrategyGeneratedItem {
  generated_id: string;
  strategy_id: string;
  entity_type: 'activity' | 'objective' | 'kpi';
  entity_id: string;
  created_at: string;
}

export class StrategyService {
  static async getOrCreateStrategy(projectId: string): Promise<CDEStrategy> {
    const { data: existing, error: fetchError } = await supabase
      .from('cde_strategies')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing) return existing;

    const { data: newStrategy, error: createError } = await supabase
      .from('cde_strategies')
      .insert({
        project_id: projectId,
        status: 'draft',
        focus_json: {},
        cadence_json: {},
        roles_json: {}
      })
      .select()
      .single();

    if (createError) throw createError;

    return newStrategy;
  }

  static async updateStrategy(
    strategyId: string,
    updates: Partial<Pick<CDEStrategy, 'status' | 'focus_json' | 'cadence_json' | 'roles_json' | 'template_code'>>
  ): Promise<CDEStrategy> {
    const { data, error } = await supabase
      .from('cde_strategies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('strategy_id', strategyId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  static async applyTemplate(projectId: string, templateCode: string): Promise<{
    strategy: CDEStrategy;
    objectives: CDEStrategyObjective[];
    channels: CDEStrategyChannelPlan[];
  }> {
    const template = getTemplateByCode(templateCode);
    if (!template) throw new Error(`Template ${templateCode} not found`);

    const strategy = await this.getOrCreateStrategy(projectId);

    const updatedStrategy = await this.updateStrategy(strategy.strategy_id, {
      template_code: templateCode,
      focus_json: {
        emphasis: template.focus_guidance.emphasis,
        key_results: template.focus_guidance.key_results,
        assumptions: template.focus_guidance.assumptions,
        target_audiences: template.default_stakeholder_groups
      },
      cadence_json: {}
    });

    const objectives = await this.createObjectivesFromTemplate(strategy.strategy_id, template);
    const channels = await this.createChannelsFromTemplate(strategy.strategy_id, template);

    return { strategy: updatedStrategy, objectives, channels };
  }

  private static async createObjectivesFromTemplate(
    strategyId: string,
    template: StrategyTemplate
  ): Promise<CDEStrategyObjective[]> {
    const { data: existing } = await supabase
      .from('cde_strategy_objectives')
      .select('*')
      .eq('strategy_id', strategyId);

    if (existing && existing.length > 0) {
      return existing;
    }

    const { data, error } = await supabase
      .from('cde_strategy_objectives')
      .insert(
        template.default_objectives.map(obj => ({
          strategy_id: strategyId,
          objective_type: obj.objective_type,
          priority: obj.priority,
          stakeholder_types: obj.stakeholder_types,
          expected_outcome: obj.expected_outcome,
          notes: obj.notes
        }))
      )
      .select();

    if (error) throw error;
    return data;
  }

  private static async createChannelsFromTemplate(
    strategyId: string,
    template: StrategyTemplate
  ): Promise<CDEStrategyChannelPlan[]> {
    const { data: existing } = await supabase
      .from('cde_strategy_channel_plan')
      .select('*')
      .eq('strategy_id', strategyId);

    if (existing && existing.length > 0) {
      return existing;
    }

    const { data, error } = await supabase
      .from('cde_strategy_channel_plan')
      .insert(
        template.default_channel_mix.map(ch => ({
          strategy_id: strategyId,
          channel_type: ch.channel_type,
          intensity: ch.intensity,
          frequency_json: ch.frequency_json,
          linked_objective_ids: []
        }))
      )
      .select();

    if (error) throw error;
    return data;
  }

  static async getStrategyObjectives(strategyId: string): Promise<CDEStrategyObjective[]> {
    const { data, error } = await supabase
      .from('cde_strategy_objectives')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('priority', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async updateObjective(
    objectiveId: string,
    updates: Partial<CDEStrategyObjective>
  ): Promise<CDEStrategyObjective> {
    const { data, error } = await supabase
      .from('cde_strategy_objectives')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('strategy_objective_id', objectiveId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getChannelPlan(strategyId: string): Promise<CDEStrategyChannelPlan[]> {
    const { data, error } = await supabase
      .from('cde_strategy_channel_plan')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('intensity', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateChannelPlan(
    channelPlanId: string,
    updates: Partial<CDEStrategyChannelPlan>
  ): Promise<CDEStrategyChannelPlan> {
    const { data, error } = await supabase
      .from('cde_strategy_channel_plan')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('channel_plan_id', channelPlanId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async generatePlannedActivities(strategyId: string, projectId: string): Promise<{
    created: number;
    skipped: number;
  }> {
    const { data: existingGenerated } = await supabase
      .from('cde_strategy_generated_items')
      .select('entity_id')
      .eq('strategy_id', strategyId)
      .eq('entity_type', 'activity');

    const existingActivityIds = new Set((existingGenerated || []).map(item => item.entity_id));

    const objectives = await this.getStrategyObjectives(strategyId);
    const channels = await this.getChannelPlan(strategyId);

    const activitiesToCreate: any[] = [];

    for (const channel of channels) {
      for (const objective of objectives) {
        const title = `${channel.channel_type.replace(/_/g, ' ')} – ${objective.objective_type.replace(/_/g, ' ')}`;

        activitiesToCreate.push({
          project_id: projectId,
          title,
          description: `${objective.notes || ''}\nChannel: ${channel.channel_type}\nIntensity: ${channel.intensity}`,
          domain: this.mapObjectiveTypeToDomain(objective.objective_type),
          status: 'planned',
          start_date: new Date().toISOString(),
          channel: channel.channel_type
        });
      }
    }

    let created = 0;
    let skipped = 0;
    const generatedItems: any[] = [];

    for (const activity of activitiesToCreate) {
      const { data: existingActivity } = await supabase
        .from('activities')
        .select('id')
        .eq('project_id', projectId)
        .eq('title', activity.title)
        .maybeSingle();

      if (existingActivity && existingActivityIds.has(existingActivity.id)) {
        skipped++;
        continue;
      }

      const { data: newActivity, error } = await supabase
        .from('activities')
        .insert(activity)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating activity:', error);
        skipped++;
        continue;
      }

      generatedItems.push({
        strategy_id: strategyId,
        entity_type: 'activity',
        entity_id: newActivity.id
      });

      created++;
    }

    if (generatedItems.length > 0) {
      await supabase
        .from('cde_strategy_generated_items')
        .insert(generatedItems);
    }

    return { created, skipped };
  }

  private static mapObjectiveTypeToDomain(
    objectiveType: string
  ): 'communication' | 'dissemination' | 'exploitation' {
    switch (objectiveType) {
      case 'awareness':
      case 'engagement':
        return 'communication';
      case 'capacity_building':
      case 'uptake':
        return 'dissemination';
      case 'policy_influence':
      case 'sustainability':
        return 'exploitation';
      default:
        return 'communication';
    }
  }

  static async generateStrategySummary(strategyId: string, projectId: string): Promise<{
    html: string;
    text: string;
  }> {
    const { data: strategy } = await supabase
      .from('cde_strategies')
      .select('*')
      .eq('strategy_id', strategyId)
      .single();

    if (!strategy) throw new Error('Strategy not found');

    const objectives = await this.getStrategyObjectives(strategyId);
    const channels = await this.getChannelPlan(strategyId);

    const { data: project } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single();

    const template = strategy.template_code ? getTemplateByCode(strategy.template_code) : null;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px;">
          CDE Strategy Summary
        </h1>

        <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <h2 style="margin-top: 0; color: #374151;">Project: ${project?.name || 'Unknown'}</h2>
          <p style="color: #6b7280;">${project?.description || ''}</p>
          <p><strong>Template:</strong> ${template?.name || 'Custom'}</p>
          <p><strong>Status:</strong> ${strategy.status.replace(/_/g, ' ').toUpperCase()}</p>
        </div>

        <h2 style="color: #1e40af; margin-top: 30px;">Strategic Focus</h2>
        <div style="margin-bottom: 20px;">
          ${strategy.focus_json.emphasis ? `
            <p><strong>Emphasis:</strong> ${strategy.focus_json.emphasis.join(', ')}</p>
          ` : ''}
          ${strategy.focus_json.target_audiences ? `
            <p><strong>Target Audiences:</strong> ${strategy.focus_json.target_audiences.join(', ')}</p>
          ` : ''}
          ${strategy.focus_json.key_results ? `
            <p><strong>Key Results:</strong> ${strategy.focus_json.key_results.join(', ')}</p>
          ` : ''}
        </div>

        <h2 style="color: #1e40af; margin-top: 30px;">Objectives</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Type</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Priority</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Expected Outcome</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Stakeholders</th>
            </tr>
          </thead>
          <tbody>
            ${objectives.map(obj => `
              <tr>
                <td style="padding: 10px; border: 1px solid #d1d5db;">${obj.objective_type.replace(/_/g, ' ')}</td>
                <td style="padding: 10px; border: 1px solid #d1d5db;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${
                    obj.priority === 'high' ? '#fecaca' : obj.priority === 'medium' ? '#fde68a' : '#d1fae5'
                  }; color: ${
                    obj.priority === 'high' ? '#991b1b' : obj.priority === 'medium' ? '#92400e' : '#065f46'
                  };">
                    ${obj.priority}
                  </span>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db;">${obj.expected_outcome.replace(/_/g, ' ')}</td>
                <td style="padding: 10px; border: 1px solid #d1d5db;">${obj.stakeholder_types.slice(0, 2).join(', ')}${obj.stakeholder_types.length > 2 ? '...' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2 style="color: #1e40af; margin-top: 30px;">Channel Plan</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Channel</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Intensity</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Frequency</th>
            </tr>
          </thead>
          <tbody>
            ${channels.map(ch => `
              <tr>
                <td style="padding: 10px; border: 1px solid #d1d5db;">${ch.channel_type.replace(/_/g, ' ')}</td>
                <td style="padding: 10px; border: 1px solid #d1d5db;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${
                    ch.intensity === 'high' ? '#10b981' : ch.intensity === 'medium' ? '#fbbf24' : '#9ca3af'
                  }; color: white;">
                    ${ch.intensity}
                  </span>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db;">
                  ${ch.frequency_json.per_month ? `${ch.frequency_json.per_month}/month` : ''}
                  ${ch.frequency_json.description || ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding: 15px; background: #eff6ff; border-left: 4px solid #1e40af; border-radius: 4px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Generated on:</strong> ${new Date().toLocaleDateString()} |
            <strong>Objectives:</strong> ${objectives.length} |
            <strong>Channels:</strong> ${channels.length}
          </p>
        </div>
      </div>
    `;

    const text = `
CDE STRATEGY SUMMARY
=====================

Project: ${project?.name || 'Unknown'}
${project?.description || ''}

Template: ${template?.name || 'Custom'}
Status: ${strategy.status.replace(/_/g, ' ').toUpperCase()}

STRATEGIC FOCUS
---------------
${strategy.focus_json.emphasis ? `Emphasis: ${strategy.focus_json.emphasis.join(', ')}` : ''}
${strategy.focus_json.target_audiences ? `Target Audiences: ${strategy.focus_json.target_audiences.join(', ')}` : ''}
${strategy.focus_json.key_results ? `Key Results: ${strategy.focus_json.key_results.join(', ')}` : ''}

OBJECTIVES
----------
${objectives.map(obj => `
- ${obj.objective_type.replace(/_/g, ' ')} (${obj.priority})
  Expected Outcome: ${obj.expected_outcome.replace(/_/g, ' ')}
  Stakeholders: ${obj.stakeholder_types.join(', ')}
`).join('')}

CHANNEL PLAN
------------
${channels.map(ch => `
- ${ch.channel_type.replace(/_/g, ' ')} (${ch.intensity} intensity)
  Frequency: ${ch.frequency_json.per_month ? `${ch.frequency_json.per_month}/month` : ''} ${ch.frequency_json.description || ''}
`).join('')}

Generated on: ${new Date().toLocaleDateString()}
Objectives: ${objectives.length} | Channels: ${channels.length}
    `.trim();

    return { html, text };
  }
}

export const strategyService = StrategyService;
