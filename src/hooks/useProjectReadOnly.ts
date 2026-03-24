import { useMemo } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useEntitlements } from '../contexts/EntitlementsContext';

interface ProjectReadOnlyState {
  /** Whether the current project is read-only due to plan limits */
  isReadOnly: boolean;
  /** Human-readable reason for read-only status */
  reason: string | null;
  /** Total number of projects the org has */
  totalProjects: number;
  /** Max projects allowed by current plan */
  maxProjects: number | null;
  /** IDs of projects that are over the limit (should be read-only) */
  overLimitProjectIds: string[];
  /** Number of excess projects */
  excessCount: number;
}

/**
 * Determines if the current project is read-only based on plan entitlements.
 *
 * Logic:
 * - If the plan allows unlimited projects (max_projects === null), nothing is read-only.
 * - If the org has more projects than allowed, the NEWEST projects beyond the limit
 *   are marked read-only (oldest projects remain active by default).
 * - Users can override which projects are active via project settings (future feature).
 *
 * Projects are ordered by created_at ascending, so the oldest N projects stay active.
 */
export default function useProjectReadOnly(): ProjectReadOnlyState {
  const { currentProject, projects } = useProject();
  const { entitlements, planStatus } = useEntitlements();

  return useMemo(() => {
    // If plan is suspended, everything is read-only
    if (planStatus === 'suspended') {
      return {
        isReadOnly: true,
        reason: 'Your organisation\'s plan is suspended. Please contact your administrator to reactivate.',
        totalProjects: projects.length,
        maxProjects: entitlements?.max_projects ?? null,
        overLimitProjectIds: projects.map(p => p.id),
        excessCount: projects.length,
      };
    }

    const maxProjects = entitlements?.max_projects ?? null;

    // Unlimited projects — nothing is read-only
    if (maxProjects === null) {
      return {
        isReadOnly: false,
        reason: null,
        totalProjects: projects.length,
        maxProjects: null,
        overLimitProjectIds: [],
        excessCount: 0,
      };
    }

    // Under or at the limit — all projects are active
    if (projects.length <= maxProjects) {
      return {
        isReadOnly: false,
        reason: null,
        totalProjects: projects.length,
        maxProjects,
        overLimitProjectIds: [],
        excessCount: 0,
      };
    }

    // Over the limit: sort by created_at ascending, oldest N stay active
    const sorted = [...projects].sort(
      (a, b) => new Date(a.start_date || '').getTime() - new Date(b.start_date || '').getTime()
    );

    const activeIds = new Set(sorted.slice(0, maxProjects).map(p => p.id));
    const overLimitIds = sorted.slice(maxProjects).map(p => p.id);

    const isCurrentReadOnly = currentProject ? !activeIds.has(currentProject.id) : false;

    return {
      isReadOnly: isCurrentReadOnly,
      reason: isCurrentReadOnly
        ? `This project is read-only. Your plan allows ${maxProjects} active project${maxProjects > 1 ? 's' : ''}. Upgrade your plan or deactivate another project to edit this one.`
        : null,
      totalProjects: projects.length,
      maxProjects,
      overLimitProjectIds: overLimitIds,
      excessCount: overLimitIds.length,
    };
  }, [currentProject, projects, entitlements, planStatus]);
}
