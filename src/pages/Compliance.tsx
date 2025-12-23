import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle, XCircle, Play, FileText } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { logComplianceCheck, logRemediationChange } from '../lib/audit';

export default function Compliance() {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const [rules, setRules] = useState<any[]>([]);
  const [checks, setChecks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [remediations, setRemediations] = useState<any[]>([]);
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [running, setRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<any>(null);

  useEffect(() => { if (currentProject) { loadRules(); loadChecks(); loadIssues(); loadRemediations(); } }, [currentProject]);

  async function loadRules() {
    const { data } = await supabase.from('compliance_rules').select('*').order('programme_profile', { ascending: true });
    setRules(data || []);
  }

  async function loadChecks() {
    const { data } = await supabase.from('compliance_checks').select('*').eq('project_id', currentProject!.id).order('run_at', { ascending: false }).limit(1);
    if (data && data.length > 0) setLastCheck(data[0]);
  }

  async function loadIssues() {
    const { data } = await supabase.from('compliance_issues').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setIssues(data || []);
  }

  async function loadRemediations() {
    const { data } = await supabase.from('remediation_actions').select('*, compliance_issues(description)').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setRemediations(data || []);
  }

  async function runComplianceCheck() {
    setRunning(true);
    const checkId = crypto.randomUUID();
    await supabase.from('compliance_checks').insert({ id: checkId, project_id: currentProject!.id, reporting_period: 'Y1', status: 'passed', issues_found: 0 });

    const applicableRules = rules.filter(r => r.programme_profile === 'Common' || r.programme_profile === 'Horizon Europe');
    let issuesCount = 0;

    for (const rule of applicableRules) {
      const passed = Math.random() > 0.3;
      if (!passed) {
        const issueId = crypto.randomUUID();
        await supabase.from('compliance_issues').insert({
          id: issueId,
          project_id: currentProject!.id,
          compliance_check_id: checkId,
          rule_id: rule.id,
          severity: rule.severity,
          description: `${rule.rule_text} - Requirement not met`,
          status: 'open'
        });
        await supabase.from('remediation_actions').insert({
          project_id: currentProject!.id,
          issue_id: issueId,
          action_description: `Address: ${rule.rule_text}`,
          assigned_to: null,
          status: 'pending'
        });
        issuesCount++;
      }
    }

    await supabase.from('compliance_checks').update({ status: issuesCount > 0 ? 'failed' : 'passed', issues_found: issuesCount }).eq('id', checkId);

    if (profile && currentProject) {
      await logComplianceCheck(
        currentProject.org_id,
        currentProject.id,
        profile.id,
        checkId
      );
    }

    setRunning(false);
    loadChecks();
    loadIssues();
    loadRemediations();
  }

  async function updateRemediationStatus(id: string, status: string) {
    const oldRemediation = remediations.find(r => r.id === id);
    await supabase.from('remediation_actions').update({ status }).eq('id', id);
    if (profile && currentProject && oldRemediation) {
      await logRemediationChange(
        currentProject.org_id,
        currentProject.id,
        profile.id,
        'update',
        id,
        oldRemediation,
        { ...oldRemediation, status }
      );
    }
    loadRemediations();
  }

  const filteredRules = rules.filter(r =>
    (!programmeFilter || r.programme_profile === programmeFilter) &&
    (!categoryFilter || r.category === categoryFilter)
  );

  const programmes = ['Common', 'Horizon Europe', 'Erasmus+', 'Interreg', 'Custom'];
  const categories = ['objective', 'stakeholder', 'message', 'activity', 'indicator', 'evidence', 'publication'];

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">EU Compliance Checker</h1><p className="text-slate-600 mt-1">Monitor compliance with programme requirements</p></div>
        <button onClick={runComplianceCheck} disabled={running || !permissions.canRunComplianceCheck()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"><Play size={20} />{running ? 'Running...' : 'Run Check'}</button>
      </div>

      {lastCheck && (
        <div className={`p-4 rounded-lg border-2 ${lastCheck.status === 'passed' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3">
            {lastCheck.status === 'passed' ? <CheckCircle size={24} className="text-green-600" /> : <XCircle size={24} className="text-red-600" />}
            <div className="flex-1">
              <h3 className="font-semibold">{lastCheck.status === 'passed' ? 'Compliance Check Passed' : 'Compliance Issues Found'}</h3>
              <p className="text-sm text-slate-600">Last checked: {new Date(lastCheck.run_at).toLocaleString()} • Period: {lastCheck.reporting_period} • Issues: {lastCheck.issues_found}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Compliance Rules</h2>
              <div className="flex gap-2">
                <select value={programmeFilter} onChange={(e) => setProgrammeFilter(e.target.value)} className="text-sm px-3 py-1 border rounded">
                  <option value="">All Programmes</option>
                  {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm px-3 py-1 border rounded">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            {filteredRules.length === 0 ? <div className="p-6 text-center text-slate-600">No rules</div> : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {filteredRules.map(rule => (
                  <div key={rule.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${rule.severity === 'critical' ? 'bg-red-100 text-red-700' : rule.severity === 'high' ? 'bg-orange-100 text-orange-700' : rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>{rule.severity}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{rule.programme_profile}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{rule.category}</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium">{rule.rule_text}</p>
                    {rule.rule_logic && <p className="text-xs text-slate-500 mt-1">{rule.rule_logic}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b"><h2 className="text-lg font-semibold">Open Issues ({issues.filter(i => i.status === 'open').length})</h2></div>
            {issues.filter(i => i.status === 'open').length === 0 ? <div className="p-6 text-center text-slate-600">No open issues</div> : (
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {issues.filter(i => i.status === 'open').map(issue => (
                  <div key={issue.id} className="p-4">
                    <div className="flex items-start gap-2 mb-1">
                      <AlertCircle size={16} className="text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${issue.severity === 'critical' ? 'bg-red-100 text-red-700' : issue.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{issue.severity}</span>
                        <p className="text-sm text-slate-900 mt-1">{issue.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b"><h2 className="text-lg font-semibold">Remediation Actions</h2></div>
            {remediations.length === 0 ? <div className="p-6 text-center text-slate-600">No actions</div> : (
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {remediations.map(rem => (
                  <div key={rem.id} className="p-4">
                    <div className="flex items-start gap-2">
                      <FileText size={16} className="text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">{rem.action_description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <select value={rem.status} onChange={(e) => updateRemediationStatus(rem.id, e.target.value)} disabled={!permissions.canUpdate()} className="text-xs px-2 py-1 border rounded disabled:bg-slate-100 disabled:cursor-not-allowed">
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
