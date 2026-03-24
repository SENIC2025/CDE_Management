/**
 * Compliance Report Export
 *
 * Generates downloadable compliance reports:
 * - HTML report with full compliance status, issues, and remediation
 * - CSV issues index for spreadsheet analysis
 */

interface ExportIssue {
  id: string;
  rule_code: string;
  severity: string;
  description: string;
  status: string;
  module?: string;
  remediation_suggestion?: string;
  created_at: string;
  affected_entities?: Array<{ type: string; id: string; name: string }>;
  evaluation_details?: any;
}

interface ExportScoreData {
  score: number;
  passed: number;
  failed: number;
  total: number;
  bySeverity: Record<string, { passed: number; failed: number }>;
  byModule: Record<string, { passed: number; failed: number; total: number }>;
}

interface RemediationAction {
  id: string;
  action: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface ComplianceReportData {
  projectName: string;
  organisationName: string;
  checkedAt: string;
  checkedBy: string;
  score: ExportScoreData;
  issues: ExportIssue[];
  remediationActions: RemediationAction[];
  history: Array<{ checkedAt: string; score: number; issuesCount: number }>;
}

// ---------- CSV Export ----------

export function exportIssuesToCSV(issues: ExportIssue[], projectName: string): void {
  const headers = [
    'Rule Code',
    'Severity',
    'Status',
    'Module',
    'Description',
    'Remediation Suggestion',
    'Affected Entities',
    'Data Source',
    'Found',
    'Required',
    'Detected At'
  ];

  const rows = issues.map(issue => [
    issue.rule_code,
    issue.severity,
    issue.status,
    issue.module || '',
    `"${(issue.description || '').replace(/"/g, '""')}"`,
    `"${(issue.remediation_suggestion || '').replace(/"/g, '""')}"`,
    `"${(issue.affected_entities || []).map(e => e.name).join('; ').replace(/"/g, '""')}"`,
    issue.evaluation_details?.queriedTable || '',
    issue.evaluation_details?.found?.toString() || '',
    issue.evaluation_details?.required?.toString() || '',
    issue.created_at ? new Date(issue.created_at).toISOString() : ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadFile(
    csvContent,
    `compliance-issues-${projectName.replace(/\s+/g, '-').toLowerCase()}-${formatDateForFilename()}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportRemediationToCSV(actions: RemediationAction[], projectName: string): void {
  const headers = [
    'Action',
    'Status',
    'Due Date',
    'Created At'
  ];

  const rows = actions.map(action => [
    `"${(action.action || '').replace(/"/g, '""')}"`,
    action.status,
    action.due_date ? new Date(action.due_date).toLocaleDateString() : '',
    action.created_at ? new Date(action.created_at).toISOString() : ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadFile(
    csvContent,
    `remediation-actions-${projectName.replace(/\s+/g, '-').toLowerCase()}-${formatDateForFilename()}.csv`,
    'text/csv;charset=utf-8;'
  );
}

// ---------- HTML Report Export ----------

export function exportComplianceReport(data: ComplianceReportData): void {
  const scoreColor = data.score.score >= 80 ? '#16a34a' : data.score.score >= 50 ? '#d97706' : '#dc2626';
  const scoreLabel = data.score.score >= 80 ? 'Compliant' : data.score.score >= 50 ? 'Partial' : 'Non-Compliant';

  const criticalIssues = data.issues.filter(i => i.severity === 'critical');
  const highIssues = data.issues.filter(i => i.severity === 'high');
  const mediumIssues = data.issues.filter(i => i.severity === 'medium');
  const lowIssues = data.issues.filter(i => i.severity === 'low');
  const openIssues = data.issues.filter(i => i.status === 'open');
  const resolvedIssues = data.issues.filter(i => i.status === 'resolved');

  const pendingActions = data.remediationActions.filter(a => a.status !== 'completed');
  const completedActions = data.remediationActions.filter(a => a.status === 'completed');
  const overdueActions = data.remediationActions.filter(a =>
    a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'
  );

  // Build module summary
  const moduleSummary = Object.entries(data.score.byModule)
    .sort(([, a], [, b]) => (a.passed / a.total) - (b.passed / b.total))
    .map(([module, d]) => {
      const pct = Math.round((d.passed / d.total) * 100);
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-transform:capitalize;font-weight:500">${module}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${d.passed}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${d.failed}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">
          <span style="color:${pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'};font-weight:600">${pct}%</span>
        </td>
      </tr>`;
    }).join('');

  // Build issues table
  const issueRows = data.issues.map(issue => {
    const sevColor: Record<string, string> = {
      critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#64748b'
    };
    const statColor: Record<string, string> = {
      open: '#dc2626', acknowledged: '#d97706', in_progress: '#1BAE70', resolved: '#16a34a'
    };
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:13px">${issue.rule_code}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">
        <span style="color:${sevColor[issue.severity] || '#64748b'};font-weight:600;text-transform:capitalize">${issue.severity}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">
        <span style="color:${statColor[issue.status] || '#64748b'};text-transform:capitalize">${issue.status.replace('_', ' ')}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-transform:capitalize">${issue.module || '-'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${issue.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b">${issue.remediation_suggestion || '-'}</td>
    </tr>`;
  }).join('');

  // Build remediation table
  const remediationRows = data.remediationActions.map(action => {
    const statColor: Record<string, string> = {
      pending: '#64748b', in_progress: '#1BAE70', completed: '#16a34a'
    };
    const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== 'completed';
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${action.action}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">
        <span style="color:${statColor[action.status] || '#64748b'};text-transform:capitalize">${action.status.replace('_', ' ')}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;${isOverdue ? 'color:#dc2626;font-weight:600' : ''}">
        ${action.due_date ? new Date(action.due_date).toLocaleDateString() : '-'}
        ${isOverdue ? ' (overdue)' : ''}
      </td>
    </tr>`;
  }).join('');

  // Build history chart as HTML bars
  const historyBars = data.history.slice(0, 10).reverse().map(entry => {
    const barColor = entry.score >= 80 ? '#22c55e' : entry.score >= 50 ? '#f59e0b' : '#ef4444';
    const date = new Date(entry.checkedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px">
      <div style="font-size:11px;color:#64748b">${entry.score}%</div>
      <div style="width:100%;background:${barColor};border-radius:4px 4px 0 0;height:${Math.max(entry.score, 5)}px"></div>
      <div style="font-size:10px;color:#94a3b8">${date}</div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Report - ${escapeHtml(data.projectName)}</title>
  <style>
    @media print {
      body { font-size: 12px; }
      .page-break { page-break-before: always; }
      .no-print { display: none; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; margin: 0; padding: 40px; line-height: 1.6; }
    h1 { color: #0f172a; margin-bottom: 4px; }
    h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .score-ring { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 12px; margin: 16px 0; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .stat-card .label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .stat-card .value { font-size: 24px; font-weight: 700; color: #0f172a; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>Compliance Report</h1>
      <div style="color:#64748b;font-size:14px">${escapeHtml(data.projectName)} &mdash; ${escapeHtml(data.organisationName)}</div>
    </div>
    <div style="text-align:right;color:#64748b;font-size:13px">
      <div>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      <div>Check date: ${new Date(data.checkedAt).toLocaleDateString()}</div>
      ${data.checkedBy ? `<div>Checked by: ${escapeHtml(data.checkedBy)}</div>` : ''}
    </div>
  </div>

  <div class="score-ring" style="background:${scoreColor}10;border:2px solid ${scoreColor}30">
    <div style="text-align:center">
      <div style="font-size:48px;font-weight:800;color:${scoreColor}">${data.score.score}%</div>
      <div style="font-size:14px;color:${scoreColor};font-weight:600">${scoreLabel}</div>
    </div>
    <div style="flex:1;padding-left:20px">
      <div style="font-size:14px;color:#475569;margin-bottom:4px">${data.score.passed} of ${data.score.total} rules passing</div>
      <div style="font-size:14px;color:#475569">${openIssues.length} open issues, ${resolvedIssues.length} resolved</div>
      ${overdueActions.length > 0 ? `<div style="font-size:14px;color:#dc2626;font-weight:500;margin-top:4px">${overdueActions.length} overdue remediation actions</div>` : ''}
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="label">Critical Issues</div>
      <div class="value" style="color:${criticalIssues.length > 0 ? '#dc2626' : '#16a34a'}">${criticalIssues.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">High Issues</div>
      <div class="value" style="color:${highIssues.length > 0 ? '#ea580c' : '#16a34a'}">${highIssues.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">Medium Issues</div>
      <div class="value">${mediumIssues.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">Low Issues</div>
      <div class="value">${lowIssues.length}</div>
    </div>
  </div>

  <h2>Module Health</h2>
  <table>
    <thead>
      <tr>
        <th>Module</th>
        <th style="text-align:center">Passed</th>
        <th style="text-align:center">Failed</th>
        <th style="text-align:center">Health</th>
      </tr>
    </thead>
    <tbody>
      ${moduleSummary || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8">No module data available</td></tr>'}
    </tbody>
  </table>

  ${data.history.length > 1 ? `
  <h2>Compliance Trend</h2>
  <div style="display:flex;align-items:flex-end;gap:8px;height:120px;padding:10px 0">
    ${historyBars}
  </div>
  ` : ''}

  <div class="page-break"></div>

  <h2>Issues Detail (${data.issues.length})</h2>
  ${data.issues.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Rule</th>
        <th>Severity</th>
        <th>Status</th>
        <th>Module</th>
        <th>Description</th>
        <th>Remediation</th>
      </tr>
    </thead>
    <tbody>
      ${issueRows}
    </tbody>
  </table>
  ` : '<p style="color:#64748b;text-align:center;padding:20px">No compliance issues found. All rules passing.</p>'}

  ${data.remediationActions.length > 0 ? `
  <h2>Remediation Actions (${data.remediationActions.length})</h2>
  <div style="margin-bottom:12px">
    <span style="color:#16a34a;font-weight:600">${completedActions.length} completed</span>
    &nbsp;&middot;&nbsp;
    <span style="color:#1BAE70;font-weight:600">${pendingActions.length} pending</span>
    ${overdueActions.length > 0 ? `&nbsp;&middot;&nbsp;<span style="color:#dc2626;font-weight:600">${overdueActions.length} overdue</span>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>Action</th>
        <th>Status</th>
        <th>Due Date</th>
      </tr>
    </thead>
    <tbody>
      ${remediationRows}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    <p>This report was generated automatically by the CDE Manager Compliance Checker.</p>
    <p>Report date: ${new Date().toISOString()} | Project: ${escapeHtml(data.projectName)} | Organisation: ${escapeHtml(data.organisationName)}</p>
  </div>
</body>
</html>`;

  downloadFile(
    html,
    `compliance-report-${data.projectName.replace(/\s+/g, '-').toLowerCase()}-${formatDateForFilename()}.html`,
    'text/html;charset=utf-8;'
  );
}

// ---------- Helpers ----------

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDateForFilename(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type { ComplianceReportData, ExportIssue, ExportScoreData, RemediationAction as ExportRemediationAction };
