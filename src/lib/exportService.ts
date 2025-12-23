import { supabase } from './supabase';
import { logAuditEvent } from './audit';
import { DecisionSupportService } from './decisionSupport';

export interface ProjectExportBundle {
  schema_version: string;
  generated_at: string;
  project: any;
  objectives: any[];
  stakeholders: any[];
  activities: any[];
  assets: any[];
  indicators: any[];
  indicator_values: any[];
  evidence_items: any[];
  evidence_links: any[];
  compliance_checks: any[];
  methodology: any;
  audit_summary: {
    total_events: number;
    by_entity_type: Record<string, number>;
    by_action: Record<string, number>;
  };
}

export interface PortfolioGovernanceData {
  generated_at: string;
  organisation: any;
  projects: any[];
  compliance_summary: {
    by_status: Record<string, number>;
    by_severity: Record<string, number>;
    total_issues: number;
  };
  flags_summary: {
    total_flags: number;
    by_severity: Record<string, number>;
    by_project: Record<string, number>;
  };
  channel_effectiveness: any[];
  uptake_summary: {
    median_lag: number | null;
    projects_with_lag_issues: number;
  };
  projects_at_risk: any[];
}

export class ExportService {
  static async generateProjectExportBundle(
    projectId: string,
    userId: string,
    orgId: string
  ): Promise<{ files: Record<string, string | Blob>; bundle: ProjectExportBundle }> {
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    const [
      objectives,
      stakeholders,
      activities,
      assets,
      indicators,
      indicatorValues,
      evidenceItems,
      evidenceLinks,
      complianceChecks,
      auditEvents,
    ] = await Promise.all([
      supabase.from('cde_objectives').select('*').eq('project_id', projectId),
      supabase.from('stakeholder_groups').select('*').eq('project_id', projectId),
      supabase.from('activities').select('*').eq('project_id', projectId),
      supabase.from('result_assets').select('*').eq('project_id', projectId),
      supabase.from('indicators').select('*').eq('project_id', projectId),
      supabase.from('indicator_values').select('*').eq('project_id', projectId),
      supabase.from('evidence_items').select('*').eq('project_id', projectId),
      supabase
        .from('evidence_links')
        .select('*')
        .in(
          'evidence_id',
          (await supabase.from('evidence_items').select('id').eq('project_id', projectId)).data?.map((e) => e.id) || []
        ),
      supabase.from('compliance_checks').select('*').eq('project_id', projectId),
      supabase.from('audit_events').select('entity_type, action').eq('project_id', projectId),
    ]);

    const auditSummary = {
      total_events: auditEvents.data?.length || 0,
      by_entity_type: {} as Record<string, number>,
      by_action: {} as Record<string, number>,
    };

    auditEvents.data?.forEach((event) => {
      auditSummary.by_entity_type[event.entity_type] =
        (auditSummary.by_entity_type[event.entity_type] || 0) + 1;
      auditSummary.by_action[event.action] = (auditSummary.by_action[event.action] || 0) + 1;
    });

    const bundle: ProjectExportBundle = {
      schema_version: '1.0',
      generated_at: new Date().toISOString(),
      project,
      objectives: objectives.data || [],
      stakeholders: stakeholders.data || [],
      activities: activities.data || [],
      assets: assets.data || [],
      indicators: indicators.data || [],
      indicator_values: indicatorValues.data || [],
      evidence_items: evidenceItems.data || [],
      evidence_links: evidenceLinks.data || [],
      compliance_checks: complianceChecks.data || [],
      methodology: project.methodology_json || null,
      audit_summary: auditSummary,
    };

    const evidenceIndexCsv = this.generateEvidenceIndexCsv(
      evidenceItems.data || [],
      evidenceLinks.data || []
    );

    const complianceSummaryJson = this.generateComplianceSummary(complianceChecks.data || []);

    const decisionSupportService = new DecisionSupportService(projectId);
    const flags = await decisionSupportService.getFlags();
    const diagnostics = await decisionSupportService.getObjectiveDiagnostics();

    const decisionSupportSummaryJson = JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        flags: flags.filter((f) => f.status === 'active'),
        diagnostics: diagnostics.filter((d) => d.risk_level !== 'none'),
      },
      null,
      2
    );

    const readme = this.generateProjectReadme(project, bundle);

    await logAuditEvent(orgId, projectId, userId, 'project_export', projectId, 'create', undefined, {
      included_entities: {
        objectives: bundle.objectives.length,
        stakeholders: bundle.stakeholders.length,
        activities: bundle.activities.length,
        evidence_items: bundle.evidence_items.length,
      },
      generated_at: bundle.generated_at,
    });

    return {
      files: {
        'project_export.json': JSON.stringify(bundle, null, 2),
        'evidence_index.csv': evidenceIndexCsv,
        'compliance_summary.json': complianceSummaryJson,
        'decision_support_summary.json': decisionSupportSummaryJson,
        'README.txt': readme,
      },
      bundle,
    };
  }

  static async generatePortfolioGovernancePack(
    orgId: string,
    userId: string,
    accessibleProjectIds: string[]
  ): Promise<{ files: Record<string, string | Blob>; data: PortfolioGovernanceData }> {
    const { data: org } = await supabase.from('organisations').select('*').eq('id', orgId).single();

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .in('id', accessibleProjectIds)
      .order('created_at', { ascending: false });

    if (!projects || projects.length === 0) {
      throw new Error('No accessible projects found');
    }

    const [complianceChecks, flags] = await Promise.all([
      supabase
        .from('compliance_checks')
        .select('*')
        .in('project_id', accessibleProjectIds)
        .order('checked_at', { ascending: false }),
      supabase
        .from('recommendation_flags')
        .select('*')
        .in('project_id', accessibleProjectIds)
        .eq('status', 'active'),
    ]);

    const complianceSummary = {
      by_status: {} as Record<string, number>,
      by_severity: {} as Record<string, number>,
      total_issues: 0,
    };

    complianceChecks.data?.forEach((check) => {
      const status = check.status || 'unknown';
      complianceSummary.by_status[status] = (complianceSummary.by_status[status] || 0) + 1;

      if (check.issues_json) {
        const issues = Array.isArray(check.issues_json) ? check.issues_json : [];
        issues.forEach((issue: any) => {
          const severity = issue.severity || 'medium';
          complianceSummary.by_severity[severity] = (complianceSummary.by_severity[severity] || 0) + 1;
          complianceSummary.total_issues++;
        });
      }
    });

    const flagsSummary = {
      total_flags: flags.data?.length || 0,
      by_severity: {} as Record<string, number>,
      by_project: {} as Record<string, number>,
    };

    flags.data?.forEach((flag) => {
      const severity = flag.severity || 'medium';
      flagsSummary.by_severity[severity] = (flagsSummary.by_severity[severity] || 0) + 1;
      flagsSummary.by_project[flag.project_id] = (flagsSummary.by_project[flag.project_id] || 0) + 1;
    });

    const projectsAtRisk = projects
      .map((project) => {
        const projectFlags = flags.data?.filter((f) => f.project_id === project.id) || [];
        const highSeverityFlags = projectFlags.filter((f) => f.severity === 'high' || f.severity === 'critical');
        const projectCompliance = complianceChecks.data?.find((c) => c.project_id === project.id);

        const riskScore =
          highSeverityFlags.length * 3 +
          projectFlags.length +
          (projectCompliance?.status === 'fail' ? 5 : 0);

        return {
          project_id: project.id,
          project_name: project.title,
          risk_score: riskScore,
          reasons: [
            ...(highSeverityFlags.length > 0 ? [`${highSeverityFlags.length} high severity flags`] : []),
            ...(projectCompliance?.status === 'fail' ? ['Compliance check failed'] : []),
            ...(projectFlags.length > 5 ? ['Multiple active recommendations'] : []),
          ],
        };
      })
      .filter((p) => p.risk_score > 0)
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 10);

    const portfolioData: PortfolioGovernanceData = {
      generated_at: new Date().toISOString(),
      organisation: org,
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        start_date: p.start_date,
        end_date: p.end_date,
        compliance_status:
          complianceChecks.data?.find((c) => c.project_id === p.id)?.status || 'not_checked',
      })),
      compliance_summary: complianceSummary,
      flags_summary: flagsSummary,
      channel_effectiveness: [],
      uptake_summary: {
        median_lag: null,
        projects_with_lag_issues: 0,
      },
      projects_at_risk: projectsAtRisk,
    };

    const html = this.generatePortfolioGovernanceHtml(portfolioData);
    const projectsCsv = this.generatePortfolioProjectsCsv(projects, complianceChecks.data || [], flags.data || []);
    const flagsCsv = this.generatePortfolioFlagsCsv(flags.data || []);

    await logAuditEvent(orgId, null, userId, 'portfolio_export', orgId, 'create', undefined, {
      project_count: projects.length,
      filters_used: {},
      generated_at: portfolioData.generated_at,
    });

    return {
      files: {
        'portfolio_governance_pack.html': html,
        'portfolio_governance_data.csv': projectsCsv,
        'portfolio_flags.csv': flagsCsv,
      },
      data: portfolioData,
    };
  }

  private static generateEvidenceIndexCsv(evidenceItems: any[], evidenceLinks: any[]): string {
    const headers = ['evidence_id', 'type', 'title', 'date', 'linked_entity_type', 'linked_entity_id', 'source'];
    const rows = evidenceItems.map((item) => {
      const links = evidenceLinks.filter((l) => l.evidence_id === item.id);
      const linkInfo = links.length > 0 ? links[0] : { entity_type: '', entity_id: '' };

      return [
        item.id,
        item.evidence_type || '',
        item.title || '',
        item.evidence_date || '',
        linkInfo.entity_type || '',
        linkInfo.entity_id || '',
        item.source_url || item.file_path || '',
      ];
    });

    return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  }

  private static generateComplianceSummary(complianceChecks: any[]): string {
    const latest = complianceChecks.sort((a, b) =>
      new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()
    )[0];

    const summary = {
      last_check: latest?.checked_at || null,
      status: latest?.status || 'not_checked',
      issues: latest?.issues_json || [],
      issues_by_severity: {} as Record<string, number>,
    };

    if (Array.isArray(latest?.issues_json)) {
      latest.issues_json.forEach((issue: any) => {
        const severity = issue.severity || 'medium';
        summary.issues_by_severity[severity] = (summary.issues_by_severity[severity] || 0) + 1;
      });
    }

    return JSON.stringify(summary, null, 2);
  }

  private static generateProjectReadme(project: any, bundle: ProjectExportBundle): string {
    return `CDE MANAGER - PROJECT EXPORT BUNDLE
=====================================

Project: ${project.title}
Generated: ${bundle.generated_at}
Schema Version: ${bundle.schema_version}

CONTENTS
--------
1. project_export.json - Complete project data snapshot
2. evidence_index.csv - Evidence items and linkages
3. compliance_summary.json - Latest compliance check results
4. decision_support_summary.json - Active flags and diagnostics
5. README.txt - This file

DATA INCLUDED
-------------
- Objectives: ${bundle.objectives.length}
- Stakeholders: ${bundle.stakeholders.length}
- Activities: ${bundle.activities.length}
- Assets/Results: ${bundle.assets.length}
- Indicators: ${bundle.indicators.length}
- Indicator Values: ${bundle.indicator_values.length}
- Evidence Items: ${bundle.evidence_items.length}
- Compliance Checks: ${bundle.compliance_checks.length}

METHODOLOGY
-----------
${project.methodology_json ? 'Approved methodology included in project_export.json' : 'No approved methodology'}

AUDIT TRAIL
-----------
Total events: ${bundle.audit_summary.total_events}
Events by entity type: ${Object.keys(bundle.audit_summary.by_entity_type).length} types
Events by action: ${Object.keys(bundle.audit_summary.by_action).length} actions

USAGE
-----
This bundle is intended for:
- Project audit and review
- Handover to evaluators or successor teams
- Data portability and backup
- Compliance verification

For questions about this export, contact your CDE Manager administrator.
`;
  }

  private static generatePortfolioGovernanceHtml(data: PortfolioGovernanceData): string {
    const projectsAtRiskHtml = data.projects_at_risk
      .map(
        (p) => `
      <tr>
        <td>${p.project_name}</td>
        <td>${p.risk_score}</td>
        <td>${p.reasons.join(', ')}</td>
      </tr>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Governance Pack - ${data.organisation?.name || 'Organisation'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    h3 { color: #475569; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    .summary-card h3 { margin-top: 0; font-size: 14px; color: #64748b; }
    .summary-card .value { font-size: 32px; font-weight: bold; color: #1e293b; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #475569;
    }
    tr:nth-child(even) { background: #f8fafc; }
    .status-pass { color: #059669; font-weight: 600; }
    .status-fail { color: #dc2626; font-weight: 600; }
    .status-warn { color: #d97706; font-weight: 600; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #64748b;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>Portfolio Governance Pack</h1>

  <div class="summary-grid">
    <div class="summary-card">
      <h3>Organisation</h3>
      <div class="value">${data.organisation?.name || 'N/A'}</div>
    </div>
    <div class="summary-card">
      <h3>Projects</h3>
      <div class="value">${data.projects.length}</div>
    </div>
    <div class="summary-card">
      <h3>Active Flags</h3>
      <div class="value">${data.flags_summary.total_flags}</div>
    </div>
    <div class="summary-card">
      <h3>Total Issues</h3>
      <div class="value">${data.compliance_summary.total_issues}</div>
    </div>
  </div>

  <h2>Executive Summary</h2>
  <p>
    This governance pack covers <strong>${data.projects.length} project${data.projects.length !== 1 ? 's' : ''}</strong>
    within ${data.organisation?.name || 'the organisation'}.
    Generated on ${new Date(data.generated_at).toLocaleDateString()} at ${new Date(data.generated_at).toLocaleTimeString()}.
  </p>

  <h2>Compliance Overview</h2>
  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>Count</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(data.compliance_summary.by_status)
        .map(
          ([status, count]) => `
        <tr>
          <td class="status-${status}">${status.replace('_', ' ').toUpperCase()}</td>
          <td>${count}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <h3>Issues by Severity</h3>
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Count</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(data.compliance_summary.by_severity)
        .map(
          ([severity, count]) => `
        <tr>
          <td>${severity.toUpperCase()}</td>
          <td>${count}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <h2>Projects at Risk</h2>
  ${
    data.projects_at_risk.length > 0
      ? `
  <table>
    <thead>
      <tr>
        <th>Project</th>
        <th>Risk Score</th>
        <th>Reasons</th>
      </tr>
    </thead>
    <tbody>
      ${projectsAtRiskHtml}
    </tbody>
  </table>
  `
      : '<p>No projects currently at risk.</p>'
  }

  <h2>Active Flags Summary</h2>
  <p>
    <strong>${data.flags_summary.total_flags}</strong> active decision-support flags across
    <strong>${Object.keys(data.flags_summary.by_project).length}</strong> projects.
  </p>

  ${
    Object.keys(data.flags_summary.by_severity).length > 0
      ? `
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Count</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(data.flags_summary.by_severity)
        .map(
          ([severity, count]) => `
        <tr>
          <td>${severity.toUpperCase()}</td>
          <td>${count}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  `
      : ''
  }

  <h2>Methodology Note</h2>
  <p>
    This governance pack aggregates data from approved project methodologies and decision-support metrics.
    For detailed methodology information, refer to individual project exports or organisation governance settings.
  </p>

  <div class="footer">
    <p>
      <strong>CDE Manager - Portfolio Governance Pack</strong><br>
      Generated: ${new Date(data.generated_at).toLocaleString()}<br>
      This document is intended for internal governance and oversight purposes.
    </p>
  </div>
</body>
</html>`;
  }

  private static generatePortfolioProjectsCsv(
    projects: any[],
    complianceChecks: any[],
    flags: any[]
  ): string {
    const headers = [
      'project_id',
      'project_name',
      'compliance_status',
      'risk_level',
      'num_high_issues',
      'num_active_flags',
      'last_updated',
    ];

    const rows = projects.map((project) => {
      const projectCompliance = complianceChecks
        .filter((c) => c.project_id === project.id)
        .sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())[0];

      const projectFlags = flags.filter((f) => f.project_id === project.id);
      const highIssues =
        projectCompliance?.issues_json?.filter((i: any) => i.severity === 'high' || i.severity === 'critical')
          .length || 0;

      const riskLevel =
        highIssues > 3 || projectFlags.length > 5
          ? 'high'
          : highIssues > 0 || projectFlags.length > 2
          ? 'medium'
          : 'low';

      return [
        project.id,
        project.title,
        projectCompliance?.status || 'not_checked',
        riskLevel,
        highIssues.toString(),
        projectFlags.length.toString(),
        projectCompliance?.checked_at || project.updated_at || '',
      ];
    });

    return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  }

  private static generatePortfolioFlagsCsv(flags: any[]): string {
    const headers = ['project_id', 'entity_type', 'entity_id', 'flag_code', 'severity', 'explanation'];

    const rows = flags.map((flag) => [
      flag.project_id,
      flag.entity_type,
      flag.entity_id,
      flag.flag_code,
      flag.severity,
      flag.explanation || '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  }

  static downloadFile(filename: string, content: string | Blob) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async downloadProjectBundle(projectId: string, userId: string, orgId: string) {
    const { files } = await this.generateProjectExportBundle(projectId, userId, orgId);

    Object.entries(files).forEach(([filename, content]) => {
      setTimeout(() => {
        this.downloadFile(filename, content);
      }, 100);
    });
  }

  static async downloadPortfolioBundle(orgId: string, userId: string, projectIds: string[]) {
    const { files } = await this.generatePortfolioGovernancePack(orgId, userId, projectIds);

    Object.entries(files).forEach(([filename, content]) => {
      setTimeout(() => {
        this.downloadFile(filename, content);
      }, 100);
    });
  }
}
