import { supabase } from './supabase';

export interface StrategyTemplateObjective {
  objective_type: 'awareness' | 'engagement' | 'capacity_building' | 'uptake' | 'policy_influence' | 'sustainability';
  priority: 'high' | 'medium' | 'low';
  stakeholder_types: string[];
  expected_outcome: 'visibility' | 'knowledge' | 'capability' | 'adoption' | 'policy_reference' | 'sustainability';
  notes: string;
}

export interface StrategyTemplateChannel {
  channel_type: string;
  intensity: 'low' | 'medium' | 'high';
  frequency_json: {
    per_month?: number;
    description?: string;
  };
  linked_objective_ids: string[];
}

export interface StrategyTemplateJSON {
  focus?: {
    emphasis?: string[];
    target_audiences?: string[];
    key_results?: string[];
    assumptions?: string[];
    constraints?: string[];
  };
  objectives?: StrategyTemplateObjective[];
  channels?: StrategyTemplateChannel[];
  cadence?: {
    periods?: number;
    months?: number;
    key_moments?: string[];
  };
  roles?: {
    requires_cde_lead?: boolean;
    responsibilities?: Record<string, string[]>;
  };
  kpis?: {
    bundle_id?: string;
    bundle_name?: string;
    extra_indicator_codes?: string[];
  };
}

export interface CDEStrategyTemplate {
  template_id: string;
  org_id: string;
  name: string;
  description: string | null;
  template_json: StrategyTemplateJSON;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface ApplyTemplateResult {
  objectives_added: number;
  channels_added: number;
  kpis_added: number;
  kpis_skipped: number;
}

export type ApplyMode = 'replace' | 'merge' | 'kpis_only';

export class TemplateService {
  static async listTemplates(orgId: string): Promise<CDEStrategyTemplate[]> {
    const { data, error } = await supabase
      .rpc('list_strategy_templates', { p_org_id: orgId });

    if (error) throw error;
    return data || [];
  }

  static async getTemplate(templateId: string): Promise<CDEStrategyTemplate | null> {
    const { data, error } = await supabase
      .from('cde_strategy_templates')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createTemplate(
    orgId: string,
    name: string,
    description: string,
    templateJson: StrategyTemplateJSON
  ): Promise<string> {
    const { data, error } = await supabase.rpc('upsert_strategy_template', {
      p_template_id: null,
      p_org_id: orgId,
      p_name: name,
      p_description: description,
      p_template_json: templateJson
    });

    if (error) throw error;
    return data;
  }

  static async updateTemplate(
    templateId: string,
    name: string,
    description: string,
    templateJson: StrategyTemplateJSON
  ): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const { data, error } = await supabase.rpc('upsert_strategy_template', {
      p_template_id: templateId,
      p_org_id: template.org_id,
      p_name: name,
      p_description: description,
      p_template_json: templateJson
    });

    if (error) throw error;
    return data;
  }

  static async duplicateTemplate(templateId: string, newName: string): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const { data, error } = await supabase.rpc('upsert_strategy_template', {
      p_template_id: null,
      p_org_id: template.org_id,
      p_name: newName,
      p_description: template.description,
      p_template_json: template.template_json
    });

    if (error) throw error;
    return data;
  }

  static async archiveTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('cde_strategy_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('template_id', templateId);

    if (error) throw error;
  }

  static async applyTemplateToProject(
    projectId: string,
    templateId: string,
    mode: ApplyMode = 'merge',
    options: Record<string, any> = {}
  ): Promise<ApplyTemplateResult> {
    const { data, error } = await supabase.rpc('apply_strategy_template_to_project', {
      p_project_id: projectId,
      p_template_id: templateId,
      p_mode: mode,
      p_options: options
    });

    if (error) throw error;
    return data;
  }

  static getTemplateStats(template: CDEStrategyTemplate): {
    objectiveCount: number;
    channelCount: number;
    kpiCount: number;
  } {
    return {
      objectiveCount: template.template_json.objectives?.length || 0,
      channelCount: template.template_json.channels?.length || 0,
      kpiCount: (template.template_json.kpis?.extra_indicator_codes?.length || 0) +
                (template.template_json.kpis?.bundle_id ? 1 : 0)
    };
  }

  static validateTemplateJson(templateJson: StrategyTemplateJSON): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (templateJson.objectives) {
      for (let i = 0; i < templateJson.objectives.length; i++) {
        const obj = templateJson.objectives[i];
        if (!obj.objective_type) {
          errors.push(`Objective ${i + 1}: objective_type is required`);
        }
        if (!obj.expected_outcome) {
          errors.push(`Objective ${i + 1}: expected_outcome is required`);
        }
        if (!obj.priority) {
          errors.push(`Objective ${i + 1}: priority is required`);
        }
      }
    }

    if (templateJson.channels) {
      for (let i = 0; i < templateJson.channels.length; i++) {
        const ch = templateJson.channels[i];
        if (!ch.channel_type) {
          errors.push(`Channel ${i + 1}: channel_type is required`);
        }
        if (!ch.intensity) {
          errors.push(`Channel ${i + 1}: intensity is required`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const templateService = TemplateService;
