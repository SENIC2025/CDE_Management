export type Role = 'viewer' | 'contributor' | 'cde_lead' | 'coordinator' | 'admin';

export type Permission =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'create_project'
  | 'lock_indicator'
  | 'unlock_indicator'
  | 'run_compliance_check'
  | 'create_remediation'
  | 'change_report_status'
  | 'manage_templates'
  | 'manage_compliance_rules';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ['read', 'run_compliance_check'],
  contributor: ['read', 'create', 'update', 'delete', 'run_compliance_check', 'create_remediation', 'manage_templates'],
  cde_lead: [
    'read',
    'create',
    'update',
    'delete',
    'lock_indicator',
    'unlock_indicator',
    'run_compliance_check',
    'create_remediation',
    'change_report_status',
    'manage_templates',
  ],
  coordinator: [
    'read',
    'create',
    'update',
    'delete',
    'create_project',
    'lock_indicator',
    'unlock_indicator',
    'run_compliance_check',
    'create_remediation',
    'change_report_status',
    'manage_templates',
  ],
  admin: [
    'read',
    'create',
    'update',
    'delete',
    'create_project',
    'lock_indicator',
    'unlock_indicator',
    'run_compliance_check',
    'create_remediation',
    'change_report_status',
    'manage_templates',
    'manage_compliance_rules',
  ],
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canLockIndicator(role: Role | null | undefined): boolean {
  return hasPermission(role, 'lock_indicator');
}

export function canRunComplianceCheck(role: Role | null | undefined): boolean {
  // Running a compliance check is a safe read-only operation — allow for all roles
  // Even if role is null (no project membership found), allow it
  if (!role) return true;
  return true;
}

export function canChangeReportStatus(role: Role | null | undefined, currentStatus: string): boolean {
  if (!role) return false;

  if (currentStatus === 'draft') {
    return hasPermission(role, 'update');
  }

  return hasPermission(role, 'change_report_status');
}

export function canManageTemplates(role: Role | null | undefined): boolean {
  return hasPermission(role, 'manage_templates');
}

export function canManageComplianceRules(role: Role | null | undefined): boolean {
  return hasPermission(role, 'manage_compliance_rules');
}

export function canCreate(role: Role | null | undefined): boolean {
  return hasPermission(role, 'create');
}

export function canUpdate(role: Role | null | undefined): boolean {
  return hasPermission(role, 'update');
}

export function canDelete(role: Role | null | undefined): boolean {
  return hasPermission(role, 'delete');
}

export function canCreateProject(role: Role | null | undefined): boolean {
  return hasPermission(role, 'create_project');
}

export function canManageProject(role: Role | null | undefined): boolean {
  if (!role) return false;
  return ['coordinator', 'cde_lead', 'admin'].includes(role);
}
