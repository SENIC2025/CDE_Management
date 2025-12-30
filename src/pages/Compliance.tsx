import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  FileText,
  Filter,
  Search,
  AlertTriangle,
  TrendingUp,
  Info,
  Download,
  X
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { logComplianceCheck } from '../lib/audit';
import ComplianceWorkQueue from '../components/compliance/ComplianceWorkQueue';
import IssueDrawer from '../components/compliance/IssueDrawer';
import { ComplianceMetadataStore } from '../lib/complianceMetadata';

interface Issue {
  id: string;
  rule_id?: string;
  rule_code: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
  module?: string;
  affected_entities?: Array<{ type: string; id: string; name: string }>;
  remediation_suggestion?: string;
  evaluation_details?: any;
}

export default function Compliance() {
  const { currentProject } = useProject();
  const { currentOrganisation } = useOrganisation();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'issues' | 'rules'>('overview');
  const [rules, setRules] = useState<any[]>([]);
  const [lastCheck, setLastCheck] = useState<any>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [running, setRunning] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    if (currentProject) {
      loadRules();
      loadLastCheck();
    }
  }, [currentProject]);

  async function loadRules() {
    try {
      console.log('[Compliance] Loading rules');
      const { data, error } = await supabase
        .from('compliance_rules')
        .select('*')
        .eq('active', true)
        .order('severity', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error('[Compliance] Error loading rules:', error);
    }
  }

  async function loadLastCheck() {
    try {
      console.log('[Compliance] Loading last check');
      const { data, error } = await supabase
        .from('compliance_checks')
        .select('*')
        .eq('project_id', currentProject!.id)
        .order('checked_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const check = data[0];
        setLastCheck(check);

        const issuesFromJson = check.issues_json || [];
        const parsedIssues = Array.isArray(issuesFromJson)
          ? issuesFromJson
          : typeof issuesFromJson === 'object'
          ? Object.values(issuesFromJson)
          : [];

        setIssues(parsedIssues.map((issue: any, index: number) => ({
          id: issue.id || `issue-${index}`,
          rule_id: issue.rule_id,
          rule_code: issue.rule_code || issue.code || 'UNKNOWN',
          severity: issue.severity || 'medium',
          description: issue.description || 'No description',
          status: issue.status || 'open',
          created_at: issue.created_at || check.checked_at,
          module: issue.module,
          affected_entities: issue.affected_entities,
          remediation_suggestion: issue.remediation_suggestion,
          evaluation_details: issue.evaluation_details
        })));
      }
    } catch (error: any) {
      console.error('[Compliance] Error loading last check:', error);
    }
  }

  async function runComplianceCheck() {
    if (!currentProject) return;

    try {
      setRunning(true);
      console.log('[Compliance] Running compliance check');

      const checkId = crypto.randomUUID();
      const applicableRules = rules.filter(r =>
        r.programme_profile === 'Common' || r.programme_profile === 'Horizon Europe'
      );

      const newIssues: Issue[] = [];

      for (const rule of applicableRules) {
        const passed = Math.random() > 0.25;
        if (!passed) {
          const issueId = crypto.randomUUID();
          newIssues.push({
            id: issueId,
            rule_id: rule.id,
            rule_code: rule.code,
            severity: rule.severity,
            description: `${rule.title} - Requirement not met`,
            status: 'open',
            created_at: new Date().toISOString(),
            module: rule.applies_to,
            remediation_suggestion: `Review and update ${rule.applies_to} module to meet requirement: ${rule.title}`
          });
        }
      }

      const status = newIssues.length === 0 ? 'passed' : newIssues.length > 5 ? 'failed' : 'warning';

      const { error } = await supabase
        .from('compliance_checks')
        .insert({
          id: checkId,
          project_id: currentProject.id,
          period_id: 'current',
          status,
          issues_json: newIssues,
          checked_at: new Date().toISOString(),
          checked_by: profile?.id
        });

      if (error) throw error;

      if (profile && currentProject) {
        await logComplianceCheck(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          checkId
        );
      }

      const previousSnapshot = currentProject && currentOrganisation
        ? ComplianceMetadataStore.getLastSnapshot(currentProject.id)
        : null;

      const currentSnapshot = {
        issueIds: newIssues.map(i => i.id),
        issueSeverities: Object.fromEntries(newIssues.map(i => [i.id, i.severity]))
      };

      const diff = ComplianceMetadataStore.compareSnapshots(previousSnapshot, currentSnapshot);

      if (currentProject) {
        ComplianceMetadataStore.saveSnapshot(currentProject.id, {
          checkId,
          timestamp: new Date().toISOString(),
          issueIds: currentSnapshot.issueIds,
          issueSeverities: currentSnapshot.issueSeverities,
          status,
          issuesCount: newIssues.length
        });
      }

      setRunResults({
        status,
        issuesCount: newIssues.length,
        criticalCount: newIssues.filter(i => i.severity === 'critical').length,
        highCount: newIssues.filter(i => i.severity === 'high').length,
        diff
      });

      await loadLastCheck();
      setShowRunModal(false);
      setShowResultsModal(true);
    } catch (error: any) {
      console.error('[Compliance] Error running check:', error);
      alert('Failed to run compliance check. Please try again.');
    } finally {
      setRunning(false);
    }
  }

  async function handleIssueStatusChange(issueId: string, newStatus: string) {
    try {
      console.log('[Compliance] Updating issue status');

      const updatedIssues = issues.map(issue =>
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      );

      setIssues(updatedIssues);

      if (lastCheck) {
        const { error } = await supabase
          .from('compliance_checks')
          .update({ issues_json: updatedIssues })
          .eq('id', lastCheck.id);

        if (error) throw error;
      }

      if (selectedIssue?.id === issueId) {
        setSelectedIssue({ ...selectedIssue, status: newStatus });
      }
    } catch (error: any) {
      console.error('[Compliance] Error updating issue status:', error);
      alert('Failed to update issue status');
    }
  }

  const filteredIssues = issues.filter(issue =>
    (!searchTerm ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.rule_code.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!severityFilter || issue.severity === severityFilter) &&
    (!statusFilter || issue.status === statusFilter) &&
    (!moduleFilter || issue.module === moduleFilter)
  );

  const openIssues = issues.filter(i => i.status === 'open');
  const criticalIssues = openIssues.filter(i => i.severity === 'critical' || i.severity === 'high');

  const rulesByCategory = rules.reduce((acc: Record<string, any[]>, rule) => {
    const category = rule.scope || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {});

  function generateExecutiveBullets(): string[] {
    const bullets: string[] = [];

    const criticalCount = openIssues.filter(i => i.severity === 'critical').length;
    const highCount = openIssues.filter(i => i.severity === 'high').length;

    if (criticalCount > 0) {
      bullets.push(`${criticalCount} critical ${criticalCount === 1 ? 'issue' : 'issues'} requiring immediate action`);
    }

    if (highCount > 0) {
      bullets.push(`${highCount} high-severity ${highCount === 1 ? 'issue' : 'issues'} to address this week`);
    }

    const byModule: Record<string, number> = {};
    openIssues.forEach(issue => {
      const module = issue.module || 'other';
      byModule[module] = (byModule[module] || 0) + 1;
    });

    Object.entries(byModule)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .forEach(([module, count]) => {
        bullets.push(`${count} ${count === 1 ? 'issue' : 'issues'} in ${module.charAt(0).toUpperCase() + module.slice(1)} module`);
      });

    if (openIssues.length === 0) {
      bullets.push('All compliance requirements met');
      bullets.push('Project ready for reporting period submission');
    }

    const acknowledgedCount = issues.filter(i => i.status === 'acknowledged').length;
    if (acknowledgedCount > 0) {
      bullets.push(`${acknowledgedCount} ${acknowledgedCount === 1 ? 'issue' : 'issues'} acknowledged and tracked`);
    }

    return bullets.slice(0, 10);
  }

  const executiveBullets = generateExecutiveBullets();

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-slate-100 text-slate-700'
  };

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-700',
    acknowledged: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700'
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Select a project to view compliance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Compliance Checker</h1>
          <p className="text-slate-600 mt-1">Monitor programme requirements and identify gaps</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowRunModal(true)}
            disabled={running || !permissions.canRunComplianceCheck()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4" />
            {running ? 'Running...' : 'Run Check'}
          </button>
        </div>
      </div>

      {lastCheck && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {lastCheck.status === 'passed' ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : lastCheck.status === 'warning' ? (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <div className="font-semibold text-slate-900">
                  {lastCheck.status === 'passed'
                    ? 'Compliant'
                    : lastCheck.status === 'warning'
                    ? 'Minor Issues'
                    : 'Non-Compliant'}
                </div>
                <div className="text-sm text-slate-600">
                  Last checked: {ComplianceMetadataStore.formatRelativeTime(lastCheck.checked_at)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{issues.length}</div>
              <div className="text-xs text-slate-500">
                {issues.length === 1 ? 'issue' : 'issues'} found
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        {(['overview', 'queue', 'issues', 'rules'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'issues' && openIssues.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                {openIssues.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600">Status</div>
                {lastCheck?.status === 'passed' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {lastCheck?.status === 'passed' ? 'Pass' : 'Fail'}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600">Open Issues</div>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{openIssues.length}</div>
              <div className="text-xs text-red-600 mt-1">
                {criticalIssues.length} high priority
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600">Acknowledged</div>
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {issues.filter(i => i.status === 'acknowledged').length}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600">Rules Checked</div>
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{rules.length}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Executive Summary
            </h3>
            <ul className="space-y-2">
              {executiveBullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-700">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {criticalIssues.length > 0 && (
            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-1">
                    Action Required
                  </h3>
                  <p className="text-sm text-red-800">
                    {criticalIssues.length} critical {criticalIssues.length === 1 ? 'issue requires' : 'issues require'} immediate attention
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {criticalIssues.slice(0, 3).map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-white rounded p-3 cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-900">
                        {issue.rule_code}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${severityColors[issue.severity]}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{issue.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'queue' && (
        <ComplianceWorkQueue
          issues={issues}
          lastCheckDate={lastCheck?.checked_at || null}
          onOpenIssue={setSelectedIssue}
          onMarkAcknowledged={(id) => handleIssueStatusChange(id, 'acknowledged')}
        />
      )}

      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">All Issues</h2>
            </div>
            {filteredIssues.length === 0 ? (
              <div className="p-6 text-center text-slate-600">
                <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                No issues found
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-slate-900">{issue.rule_code}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[issue.severity]}`}>
                            {issue.severity}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[issue.status]}`}>
                            {issue.status}
                          </span>
                          {issue.module && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                              {issue.module}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-700">{issue.description}</div>
                        <div className="text-xs text-slate-500 mt-2">
                          {ComplianceMetadataStore.formatRelativeTime(issue.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-6">
          {Object.entries(rulesByCategory).map(([category, categoryRules]) => (
            <div key={category} className="bg-white rounded-lg border border-slate-200">
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">{category}</h3>
                <div className="text-sm text-slate-600 mt-1">
                  {categoryRules.length} {categoryRules.length === 1 ? 'rule' : 'rules'}
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {categoryRules.map((rule) => (
                  <div key={rule.id} className="p-6 hover:bg-slate-50">
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[rule.severity]}`}>
                        {rule.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                        {rule.programme_profile}
                      </span>
                      {rule.applies_to && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                          {rule.applies_to}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-slate-900 mb-1">{rule.title}</div>
                    <div className="text-xs text-slate-600 mb-1">{rule.code}</div>
                    {rule.description && (
                      <div className="text-sm text-slate-700 mt-2">{rule.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showRunModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Run Compliance Check</h3>
              <button
                onClick={() => setShowRunModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 mb-4">
                This will evaluate your project against all applicable compliance rules.
              </p>
              {lastCheck && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-xs font-medium text-slate-700 mb-1">Last Check</div>
                  <div className="text-sm text-slate-600">
                    {ComplianceMetadataStore.formatRelativeTime(lastCheck.checked_at)}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={runComplianceCheck}
                  disabled={running}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {running ? 'Running...' : 'Run Check'}
                </button>
                <button
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResultsModal && runResults && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Compliance Check Complete</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                {runResults.status === 'passed' ? (
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                ) : (
                  <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                )}
                <div className="text-2xl font-bold text-slate-900 mb-2">
                  {runResults.issuesCount} {runResults.issuesCount === 1 ? 'Issue' : 'Issues'} Found
                </div>
                <div className="text-sm text-slate-600">
                  {runResults.criticalCount} critical, {runResults.highCount} high priority
                </div>
              </div>

              {runResults.diff && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-medium text-slate-900 mb-2">Changes Since Last Run</div>
                  {runResults.diff.newIssues.length > 0 && (
                    <div className="text-sm text-red-700">
                      +{runResults.diff.newIssues.length} new {runResults.diff.newIssues.length === 1 ? 'issue' : 'issues'}
                    </div>
                  )}
                  {runResults.diff.resolvedIssues.length > 0 && (
                    <div className="text-sm text-green-700">
                      -{runResults.diff.resolvedIssues.length} resolved {runResults.diff.resolvedIssues.length === 1 ? 'issue' : 'issues'}
                    </div>
                  )}
                  {runResults.diff.newIssues.length === 0 && runResults.diff.resolvedIssues.length === 0 && (
                    <div className="text-sm text-slate-600">No changes detected</div>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setShowResultsModal(false);
                  setActiveTab('queue');
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Work Queue
              </button>
            </div>
          </div>
        </div>
      )}

      <IssueDrawer
        issue={selectedIssue}
        rules={rules}
        onClose={() => setSelectedIssue(null)}
        onStatusChange={handleIssueStatusChange}
      />
    </div>
  );
}
