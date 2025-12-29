import { supabase } from './supabase';
import { objectiveLibraryService } from './objectiveLibraryService';

export interface ProjectObjective {
  objective_id: string;
  project_id: string;
  objective_lib_id: string | null;
  title: string;
  description: string;
  domain: 'communication' | 'dissemination' | 'exploitation';
  outcome_type: 'visibility' | 'knowledge' | 'capability' | 'engagement' | 'adoption' | 'policy_influence' | 'sustainability';
  priority: 'high' | 'medium' | 'low';
  stakeholder_types: string[];
  time_horizon: 'short' | 'medium' | 'long';
  notes: string | null;
  source: 'manual' | 'library' | 'strategy';
  kpis_linked_count: number;
  activities_linked_count: number;
  status: 'on_track' | 'at_risk' | 'needs_kpis' | 'needs_activities' | 'no_data';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObjectiveCustomization {
  priority: 'high' | 'medium' | 'low';
  stakeholder_types: string[];
  time_horizon: 'short' | 'medium' | 'long';
  notes?: string;
}

export interface ObjectiveHealth {
  objective_id: string;
  kpis_linked: number;
  activities_linked: number;
  last_updated: string | null;
  warnings: string[];
  status: 'on_track' | 'at_risk' | 'needs_kpis' | 'needs_activities' | 'no_data';
}

export interface ApplyKPIsResult {
  kpis_added: number;
  kpis_skipped: number;
  bundle_applied: boolean;
}

export class ProjectObjectivesService {
  static async listObjectives(projectId: string): Promise<ProjectObjective[]> {
    const { data, error } = await supabase
      .from('project_objectives')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getObjective(objectiveId: string): Promise<ProjectObjective | null> {
    const { data, error } = await supabase
      .from('project_objectives')
      .select('*')
      .eq('objective_id', objectiveId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createObjectiveFromLibrary(
    projectId: string,
    objectiveLibId: string,
    customization: ObjectiveCustomization
  ): Promise<string> {
    // Use secure RPC to create objective with proper permissions and profile handling
    const { data: objectiveId, error } = await supabase
      .rpc('create_project_objective_from_library', {
        p_project_id: projectId,
        p_objective_lib_id: objectiveLibId,
        p_priority: customization.priority,
        p_stakeholder_types: customization.stakeholder_types,
        p_time_horizon: customization.time_horizon,
        p_notes: customization.notes || null,
        p_source: 'library'
      });

    if (error) {
      console.error('[Objectives] Error creating objective via RPC:', error);
      throw new Error(error.message || 'Failed to create objective');
    }

    if (!objectiveId) {
      throw new Error('Failed to create objective: no ID returned');
    }

    return objectiveId;
  }

  static async updateObjective(
    objectiveId: string,
    updates: Partial<ProjectObjective>
  ): Promise<void> {
    const { error } = await supabase
      .from('project_objectives')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('objective_id', objectiveId);

    if (error) throw error;
  }

  static async deleteObjective(objectiveId: string): Promise<void> {
    const { error } = await supabase
      .from('project_objectives')
      .delete()
      .eq('objective_id', objectiveId);

    if (error) throw error;
  }

  static async applyKPISuggestions(
    projectId: string,
    objectiveId: string
  ): Promise<ApplyKPIsResult> {
    const objective = await this.getObjective(objectiveId);

    if (!objective || !objective.objective_lib_id) {
      throw new Error('Objective not found or not linked to library');
    }

    const suggestions = await objectiveLibraryService.getSuggestions(objective.objective_lib_id);

    let kpisAdded = 0;
    let kpisSkipped = 0;
    let bundleApplied = false;

    if (suggestions.kpi_bundle_id) {
      const { data: bundleData } = await supabase
        .from('kpi_bundles')
        .select('indicator_codes')
        .eq('bundle_id', suggestions.kpi_bundle_id)
        .maybeSingle();

      if (bundleData?.indicator_codes) {
        for (const code of bundleData.indicator_codes) {
          const result = await this.addIndicatorToProject(projectId, code);
          if (result === 'added') kpisAdded++;
          else kpisSkipped++;
        }
        bundleApplied = true;
      }
    }

    for (const code of suggestions.indicator_codes) {
      const result = await this.addIndicatorToProject(projectId, code);
      if (result === 'added') kpisAdded++;
      else kpisSkipped++;
    }

    await this.computeAndUpdateHealth(projectId, objectiveId);

    return {
      kpis_added: kpisAdded,
      kpis_skipped: kpisSkipped,
      bundle_applied: bundleApplied
    };
  }

  private static async addIndicatorToProject(
    projectId: string,
    indicatorCode: string
  ): Promise<'added' | 'skipped'> {
    const { data: indicator } = await supabase
      .from('indicator_library')
      .select('indicator_id')
      .eq('code', indicatorCode)
      .maybeSingle();

    if (!indicator) {
      return 'skipped';
    }

    const { data: existing } = await supabase
      .from('project_indicators')
      .select('id')
      .eq('project_id', projectId)
      .eq('indicator_id', indicator.indicator_id)
      .maybeSingle();

    if (existing) {
      return 'skipped';
    }

    const { error } = await supabase
      .from('project_indicators')
      .insert({
        project_id: projectId,
        indicator_id: indicator.indicator_id,
        is_active: true
      });

    if (error) {
      console.error('[Objectives] Error adding indicator:', error);
      return 'skipped';
    }

    return 'added';
  }

  static async computeObjectiveHealth(
    projectId: string,
    objectiveId: string
  ): Promise<ObjectiveHealth> {
    const objective = await this.getObjective(objectiveId);

    if (!objective) {
      throw new Error('Objective not found');
    }

    const { count: kpisLinked } = await supabase
      .from('project_indicators')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_active', true);

    const { count: activitiesLinked } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const { data: recentData } = await supabase
      .from('indicator_values')
      .select('recorded_at')
      .eq('project_id', projectId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const warnings: string[] = [];
    let status: ObjectiveHealth['status'] = 'on_track';

    if (!kpisLinked || kpisLinked === 0) {
      warnings.push('No KPIs linked to this objective');
      status = 'needs_kpis';
    }

    if (!activitiesLinked || activitiesLinked === 0) {
      warnings.push('No activities linked to this objective');
      if (status === 'on_track') status = 'needs_activities';
    }

    if (!recentData) {
      warnings.push('No data recorded yet');
      if (status === 'on_track') status = 'no_data';
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (recentData && new Date(recentData.recorded_at) < thirtyDaysAgo) {
      warnings.push('No recent data (last 30 days)');
      if (status === 'on_track') status = 'at_risk';
    }

    return {
      objective_id: objectiveId,
      kpis_linked: kpisLinked || 0,
      activities_linked: activitiesLinked || 0,
      last_updated: recentData?.recorded_at || null,
      warnings,
      status
    };
  }

  static async computeAndUpdateHealth(
    projectId: string,
    objectiveId: string
  ): Promise<void> {
    const health = await this.computeObjectiveHealth(projectId, objectiveId);

    await supabase
      .from('project_objectives')
      .update({
        kpis_linked_count: health.kpis_linked,
        activities_linked_count: health.activities_linked,
        status: health.status,
        updated_at: new Date().toISOString()
      })
      .eq('objective_id', objectiveId);
  }

  static async computeAllObjectivesHealth(projectId: string): Promise<void> {
    const objectives = await this.listObjectives(projectId);

    for (const objective of objectives) {
      await this.computeAndUpdateHealth(projectId, objective.objective_id);
    }
  }

  static getStatusInfo(status: ProjectObjective['status']) {
    const statusMap = {
      on_track: { label: 'On Track', color: 'green', description: 'Objective is progressing well' },
      at_risk: { label: 'At Risk', color: 'yellow', description: 'Needs attention' },
      needs_kpis: { label: 'Needs KPIs', color: 'orange', description: 'No KPIs linked yet' },
      needs_activities: { label: 'Needs Activities', color: 'orange', description: 'No activities linked yet' },
      no_data: { label: 'No Data', color: 'gray', description: 'No measurement data recorded' }
    };

    return statusMap[status] || statusMap.no_data;
  }
}

export const projectObjectivesService = ProjectObjectivesService;
