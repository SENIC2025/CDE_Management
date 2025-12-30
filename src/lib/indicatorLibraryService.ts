import { supabase } from './supabase';

export interface IndicatorLibrary {
  indicator_id: string;
  code: string;
  name: string;
  domain: 'communication' | 'dissemination' | 'exploitation';
  definition: string;
  rationale: string | null;
  limitations: string | null;
  interpretation_notes: string | null;
  unit: string;
  aggregation_method: string;
  data_source: string;
  collection_frequency: string;
  maturity_level: 'basic' | 'advanced' | 'expert';
  is_system: boolean;
  is_active: boolean;
  default_baseline: number | null;
  default_target: number | null;
}

export interface IndicatorLibraryFilters {
  domain?: string;
  maturity_level?: string;
  programme?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AddIndicatorsResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

export class IndicatorLibraryService {
  static async listLibraryIndicators(filters: IndicatorLibraryFilters = {}): Promise<IndicatorLibrary[]> {
    try {
      console.log('[IndicatorLibraryService] Loading indicators with filters:', filters);

      let query = supabase
        .from('indicator_library')
        .select('*')
        .eq('is_active', true)
        .order('domain', { ascending: true })
        .order('code', { ascending: true });

      if (filters.domain && filters.domain !== 'all') {
        query = query.eq('domain', filters.domain);
      }

      if (filters.maturity_level && filters.maturity_level !== 'all') {
        query = query.eq('maturity_level', filters.maturity_level);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,definition.ilike.%${filters.search}%`);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('[IndicatorLibraryService] Error loading indicators:', error);
      throw error;
    }
  }

  static async getIndicatorById(indicatorId: string): Promise<IndicatorLibrary | null> {
    try {
      const { data, error } = await supabase
        .from('indicator_library')
        .select('*')
        .eq('indicator_id', indicatorId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('[IndicatorLibraryService] Error fetching indicator:', error);
      throw error;
    }
  }

  static async addIndicatorsToProject(
    projectId: string,
    indicatorIds: string[],
    defaults?: {
      baseline?: number | null;
      target?: number | null;
      responsible_role?: string | null;
      notes?: string | null;
    }
  ): Promise<AddIndicatorsResult> {
    const result: AddIndicatorsResult = {
      inserted: 0,
      skipped: 0,
      errors: []
    };

    try {
      console.log('[IndicatorLibraryService] Adding indicators to project:', { projectId, indicatorIds });

      const { data: existing, error: checkError } = await supabase
        .from('project_indicators')
        .select('indicator_id')
        .eq('project_id', projectId);

      if (checkError) throw checkError;

      const existingIds = new Set(existing?.map(pi => pi.indicator_id) || []);

      const toInsert = indicatorIds.filter(id => !existingIds.has(id));
      result.skipped = indicatorIds.length - toInsert.length;

      if (toInsert.length === 0) {
        console.log('[IndicatorLibraryService] All indicators already added, skipping');
        return result;
      }

      const records = toInsert.map(indicatorId => ({
        project_id: projectId,
        indicator_id: indicatorId,
        baseline: defaults?.baseline || null,
        target: defaults?.target || null,
        responsible_role: defaults?.responsible_role || null,
        notes: defaults?.notes || null,
        status: 'active',
        current_value: null
      }));

      const { data, error } = await supabase
        .from('project_indicators')
        .insert(records)
        .select();

      if (error) {
        if (error.code === '23505') {
          console.warn('[IndicatorLibraryService] Duplicate key detected, some indicators already added');
          result.skipped += toInsert.length;
        } else {
          throw error;
        }
      } else {
        result.inserted = data?.length || 0;
        console.log('[IndicatorLibraryService] Successfully added indicators:', result.inserted);
      }

      return result;
    } catch (error: any) {
      console.error('[IndicatorLibraryService] Error adding indicators:', error);
      result.errors.push(error.message || 'Unknown error');
      return result;
    }
  }

  static getLibraryRoute(indicatorId?: string): string {
    if (indicatorId) {
      return `/library?indicatorId=${indicatorId}`;
    }
    return '/library';
  }

  static getDomainOptions() {
    return [
      { value: 'all', label: 'All Domains' },
      { value: 'communication', label: 'Communication' },
      { value: 'dissemination', label: 'Dissemination' },
      { value: 'exploitation', label: 'Exploitation' }
    ];
  }

  static getMaturityLevelOptions() {
    return [
      { value: 'all', label: 'All Levels' },
      { value: 'basic', label: 'Basic' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'expert', label: 'Expert' }
    ];
  }
}

export const indicatorLibraryService = IndicatorLibraryService;
