import { supabase } from './supabase';

export type AuditAction = 'create' | 'update' | 'delete' | 'lock' | 'unlock' | 'run_check' | 'change_status';

export type AuditEntityType =
  | 'indicator'
  | 'indicator_value'
  | 'evidence_item'
  | 'evidence_link'
  | 'compliance_check'
  | 'remediation_action'
  | 'report'
  | 'template'
  | 'lesson';

interface AuditEventData {
  orgId: string;
  projectId: string;
  userId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  diffJson?: Record<string, any>;
}

export async function logAuditEvent(data: AuditEventData): Promise<void> {
  try {
    await supabase.from('audit_events').insert({
      org_id: data.orgId,
      project_id: data.projectId,
      user_id: data.userId,
      entity_type: data.entityType,
      entity_id: data.entityId,
      action: data.action,
      diff_json: data.diffJson || {},
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

export function createDiff(oldData: any, newData: any): Record<string, any> {
  const diff: Record<string, any> = {};

  if (!oldData) {
    return { new: newData };
  }

  if (!newData) {
    return { old: oldData };
  }

  Object.keys({ ...oldData, ...newData }).forEach((key) => {
    if (oldData[key] !== newData[key]) {
      diff[key] = { old: oldData[key], new: newData[key] };
    }
  });

  return diff;
}

export async function logIndicatorChange(
  orgId: string,
  projectId: string,
  userId: string,
  action: AuditAction,
  indicatorId: string,
  oldData?: any,
  newData?: any
): Promise<void> {
  await logAuditEvent({
    orgId,
    projectId,
    userId,
    entityType: 'indicator',
    entityId: indicatorId,
    action,
    diffJson: createDiff(oldData, newData),
  });
}

export async function logReportChange(
  orgId: string,
  projectId: string,
  userId: string,
  action: AuditAction,
  reportId: string,
  oldData?: any,
  newData?: any
): Promise<void> {
  await logAuditEvent({
    orgId,
    projectId,
    userId,
    entityType: 'report',
    entityId: reportId,
    action,
    diffJson: createDiff(oldData, newData),
  });
}

export async function logEvidenceChange(
  orgId: string,
  projectId: string,
  userId: string,
  action: AuditAction,
  evidenceId: string,
  oldData?: any,
  newData?: any
): Promise<void> {
  await logAuditEvent({
    orgId,
    projectId,
    userId,
    entityType: 'evidence_item',
    entityId: evidenceId,
    action,
    diffJson: createDiff(oldData, newData),
  });
}

export async function logComplianceCheck(
  orgId: string,
  projectId: string,
  userId: string,
  checkId: string
): Promise<void> {
  await logAuditEvent({
    orgId,
    projectId,
    userId,
    entityType: 'compliance_check',
    entityId: checkId,
    action: 'run_check',
  });
}

export async function logRemediationChange(
  orgId: string,
  projectId: string,
  userId: string,
  action: AuditAction,
  remediationId: string,
  oldData?: any,
  newData?: any
): Promise<void> {
  await logAuditEvent({
    orgId,
    projectId,
    userId,
    entityType: 'remediation_action',
    entityId: remediationId,
    action,
    diffJson: createDiff(oldData, newData),
  });
}
