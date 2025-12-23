import { useProject } from '../contexts/ProjectContext';
import {
  hasPermission,
  canLockIndicator,
  canRunComplianceCheck,
  canChangeReportStatus,
  canManageTemplates,
  canManageComplianceRules,
  canCreate,
  canUpdate,
  canDelete,
  canCreateProject,
  Permission,
} from '../lib/rbac';

export function usePermissions() {
  const { userRole } = useProject();

  return {
    role: userRole,
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    canCreate: () => canCreate(userRole),
    canUpdate: () => canUpdate(userRole),
    canDelete: () => canDelete(userRole),
    canCreateProject: () => canCreateProject(userRole),
    canLockIndicator: () => canLockIndicator(userRole),
    canRunComplianceCheck: () => canRunComplianceCheck(userRole),
    canChangeReportStatus: (currentStatus: string) => canChangeReportStatus(userRole, currentStatus),
    canManageTemplates: () => canManageTemplates(userRole),
    canManageComplianceRules: () => canManageComplianceRules(userRole),
  };
}
