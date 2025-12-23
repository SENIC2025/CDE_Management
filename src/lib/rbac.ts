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
  viewer: ['read'],
  contributor: ['read', 'create', 'update', 'delete'],
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
  return hasPermission(role, 'run_compliance_check');
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
