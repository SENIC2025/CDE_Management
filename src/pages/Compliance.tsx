import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  AlertTriangle,
  Info,
  Download,
  X,
  ExternalLink,
  Clock,
  FileDown,
  Table2,
  Wrench,
  Shield
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { logComplianceCheck } from '../lib/audit';
import ComplianceWorkQueue from '../components/compliance/ComplianceWorkQueue';
import ComplianceHealthDashboard from '../components/compliance/ComplianceHealthDashboard';
import RemediationDashboard from '../components/compliance/RemediationDashboard';
import ComplianceCalendar from '../components/compliance/ComplianceCalendar';
import AutoRemediationSuggestions from '../components/compliance/AutoRemediationSuggestions';
import ComplianceMatrix from '../components/compliance/ComplianceMatrix';
import ComplianceGuideAndRules from '../components/compliance/ComplianceGuideAndRules';
import CustomRuleVerificationModal from '../components/compliance/CustomRuleVerificationModal';
import IssueDrawer from '../components/compliance/IssueDrawer';
import {
  ComplianceMetadataStore,
  getModuleRoute,
  CustomRulesStore,
  CustomRuleVerdictStore
} from '../lib/complianceMetadata';
import type { CustomRuleVerdict } from '../lib/complianceMetadata';
import { PageHeader } from '../components/ui';
import { evaluateRules, calculateComplianceScore } from '../lib/complianceEvaluator';
import {
  exportIssuesToCSV,
  exportRemediationToCSV,
  exportComplianceReport
} from '../lib/complianceExport';
import type { EvaluationResult } from '../lib/complianceEvaluator';
import type { ComplianceReportData } from '../lib/complianceExport';

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

interface HistoryEntry {
  checkId: string;
  checkedAt: string;
  status: string;
  issuesCount: number;
  score: number;
}

export default function Compliance() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { currentOrganisation } = useOrganisation();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'issues' | 'remediation' | 'calendar' | 'suggestions' | 'matrix' | 'guide'>('overview');
  const [rules, setRules] = useState<any[]>([]);
  const [lastCheck, setLastCheck] = useState<any>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [running, setRunning] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  // Custom rule verification state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingCheckData, setPendingCheckData] = useState<any>(null);

  // Health dashboard state
  const [complianceScore, setComplianceScore] = useState({
    score: 0, passed: 0, failed: 0, total: 0,
    bySeverity: {} as Record<string, { passed: number; failed: number }>,
    byModule: {} as Record<string, { passed: number; failed: number; total: number }>
  });

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Remediation actions (for export)
  const [remediationActions, setRemediationActions] = useState<any[]>([]);

  // Stale check detection
  const staleDaysThreshold = useMemo(() => {
    if (!currentOrganisation) return 30;
    return ComplianceMetadataStore.getSettings(currentOrganisation.id).staleDaysThreshold;
  }, [currentOrganisation]);

  const isStaleCheck = useMemo(() => {
    if (!lastCheck?.checked_at) return false;
    return ComplianceMetadataStore.isCheckStale(lastCheck.checked_at, staleDaysThreshold);
  }, [lastCheck, staleDaysThreshold]);

  useEffect(() => {
    if (currentProject) {
      loadRules();
      loadLastCheck();
      loadHistory();
      loadRemediationActions();
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

        // issues_json can be: { issues: [...], scoreData: {...} } (new format) or [...] (old array format)
        const rawJson = check.issues_json || [];
        let issuesArray: any[];
        let storedScore: any = null;

        if (Array.isArray(rawJson)) {
          // Old format: issues_json is directly an array of issues
          issuesArray = rawJson;
        } else if (rawJson && typeof rawJson === 'object' && Array.isArray(rawJson.issues)) {
          // New format: { issues: [...], scoreData: {...} }
          issuesArray = rawJson.issues;
          storedScore = rawJson.scoreData || null;
        } else if (rawJson && typeof rawJson === 'object') {
          // Fallback: object but no .issues key — treat values as issues
          issuesArray = Object.values(rawJson);
        } else {
          issuesArray = [];
        }

        const loadedIssues = issuesArray.map((issue: any, index: number) => ({
          id: issue.id || `issue-${index}`,
          rule_id: issue.rule_id || issue.ruleId,
          rule_code: issue.rule_code || issue.ruleCode || issue.code || 'UNKNOWN',
          severity: issue.severity || issue.ruleSeverity || 'medium',
          description: issue.description || 'No description',
          status: issue.status || 'open',
          created_at: issue.created_at || check.checked_at,
          module: issue.module,
          affected_entities: issue.affected_entities || issue.affectedEntities,
          remediation_suggestion: issue.remediation_suggestion || issue.remediationSuggestion,
          evaluation_details: issue.evaluation_details || issue.evaluationDetails
        }));

        setIssues(loadedIssues);

        // Recover score from stored scoreData (inside issues_json wrapper)
        if (storedScore?.score !== undefined) {
          setComplianceScore(storedScore);
        } else {
          // Calculate from issues count (legacy data without scoreData)
          const failedCount = loadedIssues.filter((i: Issue) => i.status !== 'resolved').length;
          setComplianceScore({
            score: 0,
            passed: 0,
            failed: failedCount,
            total: failedCount,
            bySeverity: {},
            byModule: {}
          });
        }
      }
    } catch (error: any) {
      console.error('[Compliance] Error loading last check:', error);
    }
  }

  async function loadHistory() {
    try {
      const { data, error } = await supabase
        .from('compliance_checks')
        .select('id, checked_at, status, issues_json')
        .eq('project_id', currentProject!.id)
        .order('checked_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const historyEntries: HistoryEntry[] = (data || []).map((check: any) => {
        const rawJson = check.issues_json;
        let issuesArray: any[];
        let storedScore: any = null;

        if (Array.isArray(rawJson)) {
          issuesArray = rawJson;
        } else if (rawJson && typeof rawJson === 'object' && Array.isArray(rawJson.issues)) {
          issuesArray = rawJson.issues;
          storedScore = rawJson.scoreData || null;
        } else {
          issuesArray = [];
        }

        return {
          checkId: check.id,
          checkedAt: check.checked_at,
          status: check.status,
          issuesCount: issuesArray.length,
          score: storedScore?.score ?? 0
        };
      });

      setHistory(historyEntries);
    } catch (error: any) {
      console.error('[Compliance] Error loading history:', error);
    }
  }

  async function loadRemediationActions() {
    if (!currentProject) return;
    try {
      const { data, error } = await supabase
        .from('remediation_actions')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRemediationActions(data || []);
    } catch (error: any) {
      console.error('[Compliance] Error loading remediation actions:', error);
    }
  }

  // Get active custom rules for the current project
  function getActiveCustomRules() {
    if (!currentProject || !currentOrganisation) return [];
    return CustomRulesStore.getAllCustomRules(currentOrganisation.id, currentProject.id)
      .filter(r => r.active);
  }

  // Phase 1: Run system evaluation, then check for custom rules
  async function runComplianceCheck() {
    if (!currentProject) return;

    try {
      setRunning(true);
      console.log('[Compliance] Step 1: Starting compliance check');

      const checkId = crypto.randomUUID();
      const applicableRules = rules.filter(r =>
        r.programme_profile === 'Common' || r.programme_profile === 'Horizon Europe'
      );

      console.log(`[Compliance] Step 2: Found ${applicableRules.length} applicable rules`);

      // Run the REAL rule evaluation engine
      let evaluationResults;
      try {
        evaluationResults = await evaluateRules(currentProject.id, applicableRules);
        console.log(`[Compliance] Step 3: Evaluation complete — ${evaluationResults.length} results`);
      } catch (evalError: any) {
        console.error('[Compliance] Evaluation engine error:', evalError);
        evaluationResults = [];
      }

      // Calculate compliance score (system rules only for now)
      const systemScoreData = calculateComplianceScore(evaluationResults);
      console.log(`[Compliance] Step 4: System score — ${systemScoreData.score}%`);

      // Convert failed results to issues
      const newIssues: Issue[] = evaluationResults
        .filter(r => !r.passed)
        .map(r => ({
          id: crypto.randomUUID(),
          rule_id: r.ruleId,
          rule_code: r.ruleCode,
          severity: r.ruleSeverity,
          description: r.description,
          status: 'open',
          created_at: new Date().toISOString(),
          module: r.module,
          affected_entities: r.affectedEntities,
          remediation_suggestion: r.remediationSuggestion,
          evaluation_details: r.evaluationDetails
        }));

      // Get period_id
      const periods = currentProject.reporting_periods || [];
      let periodId: string;
      if (periods.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const activePeriod = periods.find((p: any) =>
          p.start_date <= today && p.end_date >= today
        );
        periodId = activePeriod?.id || periods[periods.length - 1]?.id || periods[0]?.id;
      } else {
        periodId = 'default';
      }

      // Check for active custom rules
      const activeCustomRules = getActiveCustomRules();

      if (activeCustomRules.length > 0) {
        // Pause for manual verification — store pending data
        console.log(`[Compliance] Pausing for custom rule verification — ${activeCustomRules.length} custom rules`);
        setPendingCheckData({
          checkId,
          newIssues,
          systemScoreData,
          evaluationResults,
          periodId,
          activeCustomRules
        });
        setShowRunModal(false);
        setShowVerificationModal(true);
        // setRunning stays true — we'll turn it off when verification completes
      } else {
        // No custom rules — finalise immediately
        await finaliseComplianceCheck(checkId, newIssues, systemScoreData, periodId, []);
      }
    } catch (error: any) {
      console.error('[Compliance] Error running check:', error);
      alert(`Failed to run compliance check: ${error?.message || 'Unknown error'}. Please try again.`);
      setRunning(false);
    }
  }

  // Phase 2: Called after custom rule verification (or immediately if no custom rules)
  async function finaliseComplianceCheck(
    checkId: string,
    newIssues: Issue[],
    systemScoreData: any,
    periodId: string,
    customVerdicts: CustomRuleVerdict[]
  ) {
    if (!currentProject) return;

    try {
      // Merge custom rule verdicts into scoring
      const assessedVerdicts = customVerdicts.filter(v => v.verdict !== 'not-assessed');
      const customPassed = assessedVerdicts.filter(v => v.verdict === 'pass').length;
      const customFailed = assessedVerdicts.filter(v => v.verdict === 'fail').length;
      const customTotal = assessedVerdicts.length;

      // Combine system + custom scores
      const combinedPassed = systemScoreData.passed + customPassed;
      const combinedFailed = systemScoreData.failed + customFailed;
      const combinedTotal = systemScoreData.total + customTotal;
      const combinedScore = combinedTotal > 0
        ? Math.round((combinedPassed / combinedTotal) * 100)
        : systemScoreData.score;

      // Add custom rule failures as issues
      const customIssues: Issue[] = customVerdicts
        .filter(v => v.verdict === 'fail')
        .map(v => ({
          id: crypto.randomUUID(),
          rule_id: v.ruleId,
          rule_code: v.ruleCode,
          severity: v.ruleSeverity,
          description: `${v.ruleTitle}${v.note ? ` — ${v.note}` : ''}`,
          status: 'open',
          created_at: new Date().toISOString(),
          module: v.module,
          remediation_suggestion: 'Review and address this custom rule requirement',
          evaluation_details: {
            evaluator: 'manual-verification',
            queriedTable: 'custom_rules',
            found: 0,
            required: 1,
            verdict: v.verdict,
            note: v.note
          }
        }));

      const allIssues = [...newIssues, ...customIssues];

      // Build combined score data
      const scoreData = {
        ...systemScoreData,
        score: combinedScore,
        passed: combinedPassed,
        failed: combinedFailed,
        total: combinedTotal,
        systemScore: systemScoreData.score,
        systemPassed: systemScoreData.passed,
        systemTotal: systemScoreData.total,
        customPassed,
        customFailed,
        customTotal
      };

      const status = allIssues.length === 0
        ? 'passed'
        : allIssues.some(i => i.severity === 'critical')
          ? 'failed'
          : allIssues.length > 5
            ? 'failed'
            : 'warning';

      console.log(`[Compliance] Finalising — ${allIssues.length} total issues (${customIssues.length} from custom rules), score: ${combinedScore}%`);

      // Store scoreData alongside issues inside issues_json
      const issuesPayload = {
        issues: allIssues,
        scoreData,
        customVerdicts: customVerdicts.length > 0 ? customVerdicts : undefined
      };

      const insertPayload: Record<string, any> = {
        id: checkId,
        project_id: currentProject.id,
        period_id: periodId,
        status,
        issues_json: issuesPayload,
        checked_at: new Date().toISOString(),
      };

      if (profile?.id) {
        insertPayload.checked_by = profile.id;
      }

      const { error: insertErr } = await supabase
        .from('compliance_checks')
        .insert(insertPayload);

      if (insertErr) {
        console.error('[Compliance] Insert failed:', insertErr.message, insertErr);
        throw insertErr;
      }

      console.log('[Compliance] Insert succeeded');

      // Save custom verdicts to local store
      if (customVerdicts.length > 0) {
        CustomRuleVerdictStore.saveVerdicts(currentProject.id, {
          checkId,
          projectId: currentProject.id,
          verdicts: customVerdicts,
          assessedAt: new Date().toISOString()
        });
      }

      // Audit log — non-blocking
      try {
        if (profile && currentProject) {
          await logComplianceCheck(
            currentProject.org_id,
            currentProject.id,
            profile.id,
            checkId
          );
        }
      } catch (auditErr: any) {
        console.warn('[Compliance] Audit log failed (non-blocking):', auditErr.message);
      }

      const previousSnapshot = ComplianceMetadataStore.getLastSnapshot(currentProject.id);

      const currentSnapshot = {
        issueIds: allIssues.map(i => i.id),
        issueSeverities: Object.fromEntries(allIssues.map(i => [i.id, i.severity]))
      };

      const diff = ComplianceMetadataStore.compareSnapshots(previousSnapshot, currentSnapshot);

      ComplianceMetadataStore.saveSnapshot(currentProject.id, {
        checkId,
        timestamp: new Date().toISOString(),
        issueIds: currentSnapshot.issueIds,
        issueSeverities: currentSnapshot.issueSeverities,
        status,
        issuesCount: allIssues.length
      });

      setRunResults({
        status,
        issuesCount: allIssues.length,
        criticalCount: allIssues.filter(i => i.severity === 'critical').length,
        highCount: allIssues.filter(i => i.severity === 'high').length,
        score: combinedScore,
        passed: combinedPassed,
        total: combinedTotal,
        customRulesAssessed: customTotal,
        customRulesPassed: customPassed,
        customRulesFailed: customFailed,
        diff
      });

      await loadLastCheck();
      await loadHistory();
      await loadRemediationActions();
      setShowVerificationModal(false);
      setPendingCheckData(null);
      setShowResultsModal(true);
    } catch (error: any) {
      console.error('[Compliance] Error finalising check:', error);
      alert(`Failed to save compliance check: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setRunning(false);
    }
  }

  // Handlers for custom rule verification modal
  function handleVerificationComplete(verdicts: CustomRuleVerdict[]) {
    if (!pendingCheckData) return;
    finaliseComplianceCheck(
      pendingCheckData.checkId,
      pendingCheckData.newIssues,
      pendingCheckData.systemScoreData,
      pendingCheckData.periodId,
      verdicts
    );
  }

  function handleVerificationSkip() {
    if (!pendingCheckData) return;
    // Save without custom rule verdicts
    finaliseComplianceCheck(
      pendingCheckData.checkId,
      pendingCheckData.newIssues,
      pendingCheckData.systemScoreData,
      pendingCheckData.periodId,
      []
    );
  }

  async function handleIssueStatusChange(issueId: string, newStatus: string) {
    try {
      console.log('[Compliance] Updating issue status');

      const updatedIssues = issues.map(issue =>
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      );

      setIssues(updatedIssues);

      if (lastCheck) {
        // Preserve the wrapper format { issues, scoreData } when updating
        const rawJson = lastCheck.issues_json;
        let issuesPayload: any;

        if (rawJson && typeof rawJson === 'object' && !Array.isArray(rawJson) && rawJson.scoreData) {
          // New wrapper format — preserve scoreData
          issuesPayload = { issues: updatedIssues, scoreData: rawJson.scoreData };
        } else {
          // Old format — store as wrapper for consistency going forward
          issuesPayload = { issues: updatedIssues };
        }

        const { error } = await supabase
          .from('compliance_checks')
          .update({ issues_json: issuesPayload })
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

  // Export handlers
  function handleExportHTML() {
    const reportData: ComplianceReportData = {
      projectName: currentProject?.name || 'Unknown Project',
      organisationName: currentOrganisation?.name || 'Unknown Organisation',
      checkedAt: lastCheck?.checked_at || new Date().toISOString(),
      checkedBy: profile?.full_name || profile?.email || '',
      score: complianceScore,
      issues,
      remediationActions: remediationActions.map(a => ({
        id: a.id,
        action: a.action,
        status: a.status,
        due_date: a.due_date,
        created_at: a.created_at
      })),
      history: history.map(h => ({
        checkedAt: h.checkedAt,
        score: h.score,
        issuesCount: h.issuesCount
      }))
    };
    exportComplianceReport(reportData);
    setShowExportModal(false);
  }

  function handleExportIssuesCSV() {
    exportIssuesToCSV(issues, currentProject?.name || 'project');
    setShowExportModal(false);
  }

  function handleExportRemediationCSV() {
    exportRemediationToCSV(
      remediationActions.map(a => ({
        id: a.id,
        action: a.action,
        status: a.status,
        due_date: a.due_date,
        created_at: a.created_at
      })),
      currentProject?.name || 'project'
    );
    setShowExportModal(false);
  }

  function handleNavigateToModule(module: string) {
    const route = getModuleRoute(module);
    navigate(route);
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

  // Get unique modules for filter dropdown
  const moduleOptions = useMemo(() => {
    const modules = new Set(issues.map(i => i.module).filter(Boolean));
    return Array.from(modules).sort();
  }, [issues]);

  function generateExecutiveBullets(): string[] {
    const bullets: string[] = [];

    if (complianceScore.score > 0) {
      bullets.push(`Compliance score: ${complianceScore.score}% (${complianceScore.passed} of ${complianceScore.total} rules passing)`);
    }

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

    const resolvedCount = issues.filter(i => i.status === 'resolved').length;
    if (resolvedCount > 0) {
      bullets.push(`${resolvedCount} ${resolvedCount === 1 ? 'issue' : 'issues'} resolved`);
    }

    // Remediation summary
    const pendingActions = remediationActions.filter((a: any) => a.status !== 'completed');
    const overdueActions = remediationActions.filter((a: any) =>
      a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'
    );
    if (pendingActions.length > 0) {
      bullets.push(`${pendingActions.length} remediation ${pendingActions.length === 1 ? 'action' : 'actions'} in progress`);
    }
    if (overdueActions.length > 0) {
      bullets.push(`${overdueActions.length} overdue remediation ${overdueActions.length === 1 ? 'action' : 'actions'}`);
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

  // Tab config with badge counts
  const tabConfig = [
    { key: 'overview' as const, label: 'Overview', badge: 0 },
    { key: 'queue' as const, label: 'Queue', badge: openIssues.length },
    { key: 'issues' as const, label: 'Issues', badge: openIssues.length },
    { key: 'remediation' as const, label: 'Remediation', badge: remediationActions.filter((a: any) => a.status !== 'completed').length },
    { key: 'calendar' as const, label: 'Calendar', badge: 0 },
    { key: 'suggestions' as const, label: 'Suggestions', badge: openIssues.length > 0 ? openIssues.length : 0 },
    { key: 'matrix' as const, label: 'Matrix', badge: 0 },
    { key: 'guide' as const, label: 'Guide & Rules', badge: 0 }
  ];

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Select a project to view compliance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stale Check Alert Banner */}
      {isStaleCheck && lastCheck && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Clock className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900">Compliance check is stale</div>
              <div className="text-sm text-amber-800 mt-0.5">
                Last check was {ComplianceMetadataStore.formatRelativeTime(lastCheck.checked_at)}.
                Your project data may have changed since then. Run a new check to get up-to-date results.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowRunModal(true)}
            disabled={running || !permissions.canRunComplianceCheck()}
            className="flex-shrink-0 ml-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Play className="h-4 w-4" />
            Run Now
          </button>
        </div>
      )}

      {/* No check yet banner */}
      {!lastCheck && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-900">No compliance check has been run yet</div>
              <div className="text-sm text-blue-800 mt-0.5">
                Run your first compliance check to evaluate your project against EU programme requirements.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowRunModal(true)}
            disabled={running || !permissions.canRunComplianceCheck()}
            className="flex-shrink-0 ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Play className="h-4 w-4" />
            Run First Check
          </button>
        </div>
      )}

      <PageHeader
        icon={Shield}
        title="Compliance Checker"
        subtitle="Monitor programme requirements and identify gaps"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 border border-slate-300 text-[#14261C] px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => setShowRunModal(true)}
              disabled={running || !permissions.canRunComplianceCheck()}
              className="flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] disabled:bg-slate-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Play className="h-4 w-4" />
              {running ? 'Running...' : 'Run Check'}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                tab.key === 'remediation'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health Dashboard */}
          <ComplianceHealthDashboard
            issues={issues}
            score={complianceScore.score}
            passed={complianceScore.passed}
            failed={complianceScore.failed}
            total={complianceScore.total}
            bySeverity={complianceScore.bySeverity}
            byModule={complianceScore.byModule}
            lastCheckDate={lastCheck?.checked_at || null}
            history={history}
          />

          {/* Executive Summary */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Executive Summary
            </h3>
            <ul className="space-y-2">
              {executiveBullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-700">
                  <span className="text-blue-600 mt-1">&bull;</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Critical Issues Alert */}
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
                {criticalIssues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-white rounded p-3 cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium text-slate-900">{issue.rule_code}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${severityColors[issue.severity]}`}>
                          {issue.severity}
                        </span>
                      </div>
                      {/* Module quick-nav button */}
                      {issue.module && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToModule(issue.module!);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={`Go to ${issue.module} module`}
                        >
                          Fix in {issue.module.charAt(0).toUpperCase() + issue.module.slice(1)}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
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
              {moduleOptions.length > 0 && (
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">All Modules</option>
                  {moduleOptions.map(m => (
                    <option key={m} value={m}>
                      {(m || '').charAt(0).toUpperCase() + (m || '').slice(1)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                All Issues
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({filteredIssues.length})
                </span>
              </h2>
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
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-slate-900">{issue.rule_code}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[issue.severity]}`}>
                            {issue.severity}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[issue.status]}`}>
                            {issue.status.replace('_', ' ')}
                          </span>
                          {issue.module && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                              {issue.module}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-700">{issue.description}</div>
                        {issue.evaluation_details && (
                          <div className="text-xs text-slate-500 mt-1">
                            Found: {issue.evaluation_details.found} | Required: {issue.evaluation_details.required}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-2">
                          {ComplianceMetadataStore.formatRelativeTime(issue.created_at)}
                        </div>
                      </div>
                      {/* Module deep-link button */}
                      {issue.module && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToModule(issue.module!);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0 ml-3"
                          title={`Go to ${issue.module} module to fix this`}
                        >
                          <Wrench className="h-3 w-3" />
                          Fix
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'remediation' && (
        <RemediationDashboard />
      )}

      {activeTab === 'calendar' && (
        <ComplianceCalendar
          periods={currentProject.reporting_periods || []}
          history={history}
          lastCheckDate={lastCheck?.checked_at || null}
          onRunCheck={() => setShowRunModal(true)}
          running={running}
        />
      )}

      {activeTab === 'suggestions' && (
        <AutoRemediationSuggestions issues={issues} />
      )}

      {activeTab === 'matrix' && (
        <ComplianceMatrix
          issues={issues}
          history={history}
          periods={currentProject.reporting_periods || []}
          scoreData={complianceScore}
        />
      )}

      {activeTab === 'guide' && (
        <ComplianceGuideAndRules
          projectId={currentProject.id}
          orgId={currentProject.org_id}
          rules={rules}
          userId={profile?.id}
        />
      )}

      {/* Run Check Modal */}
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
              <p className="text-sm text-slate-700 mb-2">
                This will evaluate your project data against all applicable compliance rules.
              </p>
              <p className="text-xs text-slate-500 mb-4">
                The engine checks real data: objectives, stakeholders, activities, indicators, evidence, messages, channels, and exploitation status.
              </p>
              {lastCheck && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-xs font-medium text-slate-700 mb-1">Last Check</div>
                  <div className="text-sm text-slate-600">
                    {ComplianceMetadataStore.formatRelativeTime(lastCheck.checked_at)}
                    {complianceScore.score > 0 && (
                      <span className="ml-2 font-medium">
                        Score: {complianceScore.score}%
                      </span>
                    )}
                  </div>
                  {isStaleCheck && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                      <Clock className="h-3 w-3" />
                      This check is stale — results may be outdated
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={runComplianceCheck}
                  disabled={running}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {running ? 'Evaluating...' : 'Run Check'}
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

      {/* Custom Rule Verification Modal */}
      {showVerificationModal && pendingCheckData && (
        <CustomRuleVerificationModal
          customRules={pendingCheckData.activeCustomRules}
          previousVerdicts={
            CustomRuleVerdictStore.getLatestVerdicts(currentProject.id)?.verdicts || []
          }
          onComplete={handleVerificationComplete}
          onSkip={handleVerificationSkip}
        />
      )}

      {/* Results Modal */}
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
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {runResults.score}%
                </div>
                <div className="text-sm text-slate-600 mb-2">
                  {runResults.passed} of {runResults.total} rules passing
                </div>
                <div className="text-sm text-slate-600">
                  {runResults.issuesCount} {runResults.issuesCount === 1 ? 'issue' : 'issues'} found
                  {runResults.criticalCount > 0 && ` (${runResults.criticalCount} critical)`}
                </div>
              </div>

              {/* Custom Rules Breakdown */}
              {runResults.customRulesAssessed > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <div className="text-sm font-medium text-indigo-900 mb-2">Custom Rules Assessed</div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      {runResults.customRulesPassed} passed
                    </div>
                    {runResults.customRulesFailed > 0 && (
                      <div className="flex items-center gap-1 text-red-700">
                        <XCircle className="h-4 w-4" />
                        {runResults.customRulesFailed} failed
                      </div>
                    )}
                    <div className="text-indigo-600 text-xs">
                      ({runResults.customRulesAssessed} of {runResults.customRulesAssessed} assessed)
                    </div>
                  </div>
                </div>
              )}

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
                  setActiveTab('overview');
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Export Compliance Data</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600 mb-4">
                Choose an export format. Reports include all issues, scores, module health, and remediation actions.
              </p>

              <button
                onClick={handleExportHTML}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Full HTML Report</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Comprehensive report with score, module health, issues detail, remediation actions, and trend chart. Print-ready.
                  </div>
                </div>
              </button>

              <button
                onClick={handleExportIssuesCSV}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors text-left"
              >
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Table2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Issues CSV</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Spreadsheet with all {issues.length} issues — rule codes, severity, module, remediation suggestions, evaluation details.
                  </div>
                </div>
              </button>

              <button
                onClick={handleExportRemediationCSV}
                disabled={remediationActions.length === 0}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileDown className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Remediation Actions CSV</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {remediationActions.length > 0
                      ? `Export ${remediationActions.length} remediation actions with status, due dates, and assignments.`
                      : 'No remediation actions to export yet.'
                    }
                  </div>
                </div>
              </button>

              <div className="pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <IssueDrawer
        issue={selectedIssue}
        rules={rules}
        checkId={lastCheck?.id || null}
        onClose={() => setSelectedIssue(null)}
        onStatusChange={handleIssueStatusChange}
      />
    </div>
  );
}
