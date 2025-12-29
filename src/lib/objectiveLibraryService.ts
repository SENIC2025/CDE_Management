import { supabase } from './supabase';

export interface ObjectiveLibrary {
  objective_lib_id: string;
  code: string;
  title: string;
  description: string;
  domain: 'communication' | 'dissemination' | 'exploitation';
  outcome_type: 'visibility' | 'knowledge' | 'capability' | 'engagement' | 'adoption' | 'policy_influence' | 'sustainability';
  maturity_level: 'basic' | 'advanced' | 'expert';
  programme_relevance: string[];
  default_stakeholder_types: string[];
  suggested_channel_types: string[];
  suggested_kpi_bundle_id: string | null;
  suggested_indicator_codes: string[];
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObjectiveLibraryFilters {
  domain?: string;
  outcome_type?: string;
  maturity_level?: string;
  programme?: string;
  search?: string;
}

export interface ObjectiveSuggestions {
  kpi_bundle_id: string | null;
  indicator_codes: string[];
  channel_types: string[];
  stakeholder_types: string[];
}

export class ObjectiveLibraryService {
  static async listObjectives(filters: ObjectiveLibraryFilters = {}): Promise<ObjectiveLibrary[]> {
    let query = supabase
      .from('objective_library')
      .select('*')
      .eq('is_active', true)
      .order('domain', { ascending: true })
      .order('title', { ascending: true });

    if (filters.domain) {
      query = query.eq('domain', filters.domain);
    }

    if (filters.outcome_type) {
      query = query.eq('outcome_type', filters.outcome_type);
    }

    if (filters.maturity_level) {
      query = query.eq('maturity_level', filters.maturity_level);
    }

    if (filters.programme) {
      query = query.contains('programme_relevance', [filters.programme]);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  static async getObjectiveById(objectiveLibId: string): Promise<ObjectiveLibrary | null> {
    const { data, error } = await supabase
      .from('objective_library')
      .select('*')
      .eq('objective_lib_id', objectiveLibId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getSuggestions(objectiveLibId: string): Promise<ObjectiveSuggestions> {
    const objective = await this.getObjectiveById(objectiveLibId);

    if (!objective) {
      throw new Error('Objective not found');
    }

    return {
      kpi_bundle_id: objective.suggested_kpi_bundle_id,
      indicator_codes: objective.suggested_indicator_codes || [],
      channel_types: objective.suggested_channel_types || [],
      stakeholder_types: objective.default_stakeholder_types || []
    };
  }

  static getDomainOptions() {
    return [
      { value: 'communication', label: 'Communication', description: 'Two-way dialogue and engagement' },
      { value: 'dissemination', label: 'Dissemination', description: 'Knowledge transfer and diffusion' },
      { value: 'exploitation', label: 'Exploitation', description: 'Impact generation and uptake' }
    ];
  }

  static getOutcomeTypeOptions() {
    return [
      { value: 'visibility', label: 'Visibility', description: 'Awareness and recognition' },
      { value: 'knowledge', label: 'Knowledge', description: 'Understanding and learning' },
      { value: 'capability', label: 'Capability', description: 'Skills and competencies' },
      { value: 'engagement', label: 'Engagement', description: 'Active participation' },
      { value: 'adoption', label: 'Adoption', description: 'Implementation and use' },
      { value: 'policy_influence', label: 'Policy Influence', description: 'Policy change and integration' },
      { value: 'sustainability', label: 'Sustainability', description: 'Long-term continuation' }
    ];
  }

  static getMaturityLevelOptions() {
    return [
      { value: 'basic', label: 'Basic', description: 'Essential foundational objectives' },
      { value: 'advanced', label: 'Advanced', description: 'Strategic objectives requiring coordination' },
      { value: 'expert', label: 'Expert', description: 'Complex transformational objectives' }
    ];
  }

  static getProgrammeOptions() {
    return [
      { value: 'horizon', label: 'Horizon Europe' },
      { value: 'erasmus', label: 'Erasmus+' },
      { value: 'interreg', label: 'Interreg' },
      { value: 'generic', label: 'Generic / All Programmes' }
    ];
  }
}

export const objectiveLibraryService = ObjectiveLibraryService;
