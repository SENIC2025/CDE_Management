import { supabase } from './supabase';
import { BUNDLE_CATALOG, toIndicatorBundle } from './bundleCatalog';
import { INDICATOR_CATALOG } from './indicatorCatalog';

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

export interface IndicatorBundle {
  bundle_id: string;
  code: string;
  name: string;
  description: string;
  bundle_type: 'segment' | 'purpose' | 'domain' | 'maturity';
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_system: boolean;
  items?: IndicatorBundleItem[];
}

export interface IndicatorBundleItem {
  id: string;
  bundle_id: string;
  indicator_code: string;
  sort_order: number;
  is_required: boolean;
  indicator?: IndicatorLibrary;
}

// Build a lookup map from the static catalog for quick access
const indicatorByCode = new Map(INDICATOR_CATALOG.map(ind => [ind.code, ind]));
const indicatorById = new Map(INDICATOR_CATALOG.map(ind => [ind.indicator_id, ind]));

export class IndicatorLibraryService {

  // =====================================================
  // INDICATOR LIBRARY METHODS (static catalog primary)
  // =====================================================

  static async listLibraryIndicators(filters: IndicatorLibraryFilters = {}): Promise<IndicatorLibrary[]> {
    console.log('[IndicatorLibraryService] Loading indicators with filters:', filters);

    // Use static catalog — instant, no DB dependency
    let results = [...INDICATOR_CATALOG];

    if (filters.domain && filters.domain !== 'all') {
      results = results.filter(ind => ind.domain === filters.domain);
    }

    if (filters.maturity_level && filters.maturity_level !== 'all') {
      results = results.filter(ind => ind.maturity_level === filters.maturity_level);
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      results = results.filter(ind =>
        ind.name.toLowerCase().includes(term) ||
        ind.code.toLowerCase().includes(term) ||
        ind.definition.toLowerCase().includes(term)
      );
    }

    // Sort by domain then code
    results.sort((a, b) => {
      if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
      return a.code.localeCompare(b.code);
    });

    if (filters.offset) {
      results = results.slice(filters.offset);
    }

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  static async getIndicatorById(indicatorId: string): Promise<IndicatorLibrary | null> {
    return indicatorById.get(indicatorId) || null;
  }

  static getIndicatorByCode(code: string): IndicatorLibrary | null {
    return indicatorByCode.get(code) || null;
  }

  // =====================================================
  // ADD TO PROJECT (inserts directly into `indicators` table)
  // =====================================================
  // The `indicators` table has proper RLS for authenticated project members.
  // We embed the library code as a [CODE] prefix in the description
  // so we can reverse-lookup full details from the static catalog.

  /** Extract library code from a description string, e.g. "[COM-REACH-01] ..." → "COM-REACH-01" */
  static extractCodeFromDescription(description: string | null): string | null {
    if (!description) return null;
    const match = description.match(/^\[([A-Z]{3}-[A-Z]+-\d+)\]/);
    return match ? match[1] : null;
  }

  static async addIndicatorsToProject(
    projectId: string,
    indicatorIds: string[],
    _defaults?: {
      baseline?: number | null;
      target?: number | null;
      responsible_role?: string | null;
      notes?: string | null;
    }
  ): Promise<AddIndicatorsResult> {
    const result: AddIndicatorsResult = { inserted: 0, skipped: 0, errors: [] };

    try {
      console.log('[IndicatorLibraryService] Adding indicators to project:', { projectId, count: indicatorIds.length });

      // Step 1: Resolve static catalog entries from selected IDs
      const catalogEntries = indicatorIds
        .map(id => indicatorById.get(id))
        .filter((entry): entry is IndicatorLibrary => !!entry);

      if (catalogEntries.length === 0) {
        result.errors.push('No valid indicators selected');
        return result;
      }

      // Step 2: Check existing indicators in this project by extracting codes from descriptions
      const { data: existing, error: checkError } = await supabase
        .from('indicators')
        .select('id, description')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (checkError) {
        console.error('[IndicatorLibraryService] Check existing error:', checkError);
        result.errors.push('Could not check existing project indicators: ' + checkError.message);
        return result;
      }

      // Build a set of codes already in the project
      const existingCodes = new Set<string>();
      (existing || []).forEach((row: any) => {
        const code = this.extractCodeFromDescription(row.description);
        if (code) existingCodes.add(code);
      });

      // Filter out already-added indicators
      const toInsert = catalogEntries.filter(entry => !existingCodes.has(entry.code));
      result.skipped = catalogEntries.length - toInsert.length;

      if (toInsert.length === 0) {
        console.log('[IndicatorLibraryService] All indicators already in project');
        return result;
      }

      // Step 3: Insert into `indicators` table
      // DB columns: id (auto), project_id, title, description, measurement_unit, target_value, status, locked
      const records = toInsert.map(entry => ({
        project_id: projectId,
        title: entry.name,
        description: `[${entry.code}] ${entry.definition}`,
        measurement_unit: entry.unit,
        target_value: entry.default_target,
        status: 'active',
        locked: false,
      }));

      const { data: insertData, error: insertError } = await supabase
        .from('indicators')
        .insert(records)
        .select();

      if (insertError) {
        console.error('[IndicatorLibraryService] Insert error:', insertError);
        result.errors.push(insertError.message);
      } else {
        result.inserted = insertData?.length || 0;
        console.log('[IndicatorLibraryService] Successfully added:', result.inserted, 'indicators');
      }

      return result;
    } catch (error: any) {
      console.error('[IndicatorLibraryService] Error adding indicators:', error);
      result.errors.push(error.message || 'Unknown error');
      return result;
    }
  }

  // =====================================================
  // BUNDLE METHODS (static catalog primary)
  // =====================================================

  static async listBundles(bundleType?: string): Promise<IndicatorBundle[]> {
    console.log('[IndicatorLibraryService] Loading bundles from static catalog');

    // Use static catalog directly — no DB needed
    let bundles = BUNDLE_CATALOG.map(toIndicatorBundle);
    if (bundleType && bundleType !== 'all') {
      bundles = bundles.filter(b => b.bundle_type === bundleType);
    }
    return bundles;
  }

  static async getBundleWithIndicators(bundleId: string): Promise<IndicatorBundle | null> {
    // Resolve from static catalog
    const staticDef = BUNDLE_CATALOG.find(b => b.code === bundleId);
    if (!staticDef) return null;

    const bundle = toIndicatorBundle(staticDef);

    // Resolve indicator details from the static indicator catalog
    bundle.items = staticDef.indicator_codes.map((ic, idx) => ({
      id: `${staticDef.code}-item-${idx}`,
      bundle_id: staticDef.code,
      indicator_code: ic.code,
      sort_order: idx + 1,
      is_required: ic.is_required,
      indicator: indicatorByCode.get(ic.code),
    }));

    return bundle;
  }

  static async addBundleToProject(
    projectId: string,
    bundleId: string
  ): Promise<AddIndicatorsResult> {
    try {
      console.log('[IndicatorLibraryService] Adding bundle to project:', { projectId, bundleId });

      const bundle = await this.getBundleWithIndicators(bundleId);
      if (!bundle || !bundle.items) {
        return { inserted: 0, skipped: 0, errors: ['Bundle not found'] };
      }

      const indicatorIds = bundle.items
        .filter((item: IndicatorBundleItem) => item.indicator)
        .map((item: IndicatorBundleItem) => item.indicator!.indicator_id);

      if (indicatorIds.length === 0) {
        return {
          inserted: 0, skipped: 0,
          errors: ['No valid indicators found in bundle']
        };
      }

      return await this.addIndicatorsToProject(projectId, indicatorIds);
    } catch (error: any) {
      console.error('[IndicatorLibraryService] Error adding bundle:', error);
      return { inserted: 0, skipped: 0, errors: [error.message] };
    }
  }

  // =====================================================
  // STATIC HELPERS
  // =====================================================

  static getBundleTypeOptions() {
    return [
      { value: 'all', label: 'All Bundles' },
      { value: 'segment', label: 'By Audience' },
      { value: 'purpose', label: 'By Purpose' },
      { value: 'domain', label: 'By Domain' },
    ];
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
