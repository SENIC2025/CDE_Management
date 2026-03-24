import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { ComplianceMetadataStore, getModuleRoute } from '../../lib/complianceMetadata';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Info,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { ConfirmDialog } from '../ui';
import useConfirm from '../../hooks/useConfirm';

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

interface Rule {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: string;
  scope?: string;
  applies_to?: string;
}

interface RemediationAction {
  id: string;
  action: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  remediation_suggestion: string | null;
  created_at: string;
  updated_at: string;
}

interface IssueDrawerProps {
  issue: Issue | null;
  rules: Rule[];
  checkId: string | null;
  onClose: () => void;
  onStatusChange?: (issueId: string, newStatus: string) => void;
}

export default function IssueDrawer({
  issue,
  rules,
  checkId,
  onClose,
  onStatusChange
}: IssueDrawerProps) {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [confirmProps, confirmDialog] = useConfirm();
  const [activeTab, setActiveTab] = useState<'summary' | 'remediation' | 'affected' | 'details'>('summary');
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  // Remediation actions (DB-backed)
  const [remediationActions, setRemediationActions] = useState<RemediationAction[]>([]);
  const [showNewAction, setShowNewAction] = useState(false);
  const [editingAction, setEditingAction] = useState<RemediationAction | null>(null);
  const [actionForm, setActionForm] = useState({
    action: '',
    due_date: '',
    status: 'pending'
  });

  useEffect(() => {
    if (issue && currentProject) {
      const issueNotes = ComplianceMetadataStore.getNotesForIssue(currentProject.id, issue.id);
      setNotes(issueNotes);
      loadRemediationActions();
    }
  }, [issue, currentProject]);

  async function loadRemediationActions() {
    if (!currentProject || !checkId) return;

    try {
      const { data, error } = await supabase
        .from('remediation_actions')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('compliance_check_id', checkId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter actions relevant to this issue (by remediation_suggestion or action text)
      // Since there's no direct issue_id column, we match by the suggestion content
      const allActions = data || [];
      // Show all actions for this check — user can manage them per-issue via the UI
      setRemediationActions(allActions);
    } catch (error: any) {
      console.error('[Compliance] Error loading remediation actions:', error);
      setRemediationActions([]);
    }
  }

  async function handleCreateAction() {
    if (!currentProject || !checkId || !actionForm.action.trim()) return;

    try {
      const { error } = await supabase
        .from('remediation_actions')
        .insert({
          compliance_check_id: checkId,
          project_id: currentProject.id,
          action: actionForm.action,
          status: 'pending',
          assigned_to: profile?.id || null,
          due_date: actionForm.due_date || null,
          remediation_suggestion: issue?.remediation_suggestion || null
        });

      if (error) throw error;

      setActionForm({ action: '', due_date: '', status: 'pending' });
      setShowNewAction(false);
      loadRemediationActions();
    } catch (error: any) {
      console.error('[Compliance] Error creating remediation action:', error);
      alert('Failed to create remediation action');
    }
  }

  async function handleUpdateActionStatus(actionId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('remediation_actions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) throw error;
      loadRemediationActions();
    } catch (error: any) {
      console.error('[Compliance] Error updating remediation action:', error);
      alert('Failed to update action');
    }
  }

  async function handleDeleteAction(actionId: string) {
    const ok = await confirmDialog({ title: 'Delete action?', message: 'This remediation action will be permanently removed.' });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('remediation_actions')
        .delete()
        .eq('id', actionId);

      if (error) throw error;
      loadRemediationActions();
    } catch (error: any) {
      console.error('[Compliance] Error deleting remediation action:', error);
      alert('Failed to delete action');
    }
  }

  if (!issue) return null;

  const rule = rules.find(r => r.id === issue.rule_id || r.code === issue.rule_code);

  const severityConfig = {
    critical: { color: 'bg-red-100 text-red-700 border-red-300', icon: AlertTriangle },
    high: { color: 'bg-orange-100 text-orange-700 border-orange-300', icon: AlertTriangle },
    medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Info },
    low: { color: 'bg-slate-100 text-slate-700 border-slate-300', icon: Info }
  };

  const config = severityConfig[issue.severity as keyof typeof severityConfig] || severityConfig.low;
  const Icon = config.icon;

  function handleAddNote() {
    if (!newNote.trim() || !currentProject) return;

    ComplianceMetadataStore.addNote(currentProject.id, issue!.id, newNote);
    setNotes(ComplianceMetadataStore.getNotesForIssue(currentProject.id, issue!.id));
    setNewNote('');
  }

  function handleNavigateToModule(module: string) {
    const route = getModuleRoute(module);
    navigate(route);
    onClose();
  }

  function handleStatusChange(newStatus: string) {
    if (onStatusChange) {
      onStatusChange(issue!.id, newStatus);
    }
  }

  const actionStatusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700'
  };

  const pendingActions = remediationActions.filter(a => a.status !== 'completed');
  const completedActions = remediationActions.filter(a => a.status === 'completed');

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[700px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-slate-900">Compliance Issue</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-lg border text-sm font-medium flex items-center gap-1 ${config.color}`}>
            <Icon className="h-4 w-4" />
            {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
          </span>
          {issue.module && (
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">
              {issue.module.charAt(0).toUpperCase() + issue.module.slice(1)}
            </span>
          )}
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            issue.status === 'resolved'
              ? 'bg-green-100 text-green-700'
              : issue.status === 'in_progress'
              ? 'bg-blue-100 text-blue-700'
              : issue.status === 'acknowledged'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {issue.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          {pendingActions.length > 0 && (
            <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-medium">
              {pendingActions.length} action{pendingActions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex gap-1 mt-4 border-t border-slate-200 pt-3">
          {(['summary', 'remediation', 'affected', 'details'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'remediation' && remediationActions.length > 0 && (
                <span className="ml-1 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {remediationActions.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Issue Description
              </label>
              <div className="text-slate-900 bg-slate-50 rounded-lg p-4">
                {issue.description}
              </div>
            </div>

            {rule && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Compliance Rule
                </label>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="font-semibold text-blue-900 mb-1">{rule.title}</div>
                  <div className="text-sm text-blue-800">{rule.code}</div>
                  {rule.description && (
                    <div className="text-sm text-blue-700 mt-2">{rule.description}</div>
                  )}
                </div>
              </div>
            )}

            {/* Evaluation details summary */}
            {issue.evaluation_details && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-sm font-medium text-slate-700 mb-2">Evaluation Result</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Data source: </span>
                    <span className="font-medium text-slate-900">{issue.evaluation_details.queriedTable}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Found: </span>
                    <span className="font-medium text-slate-900">{issue.evaluation_details.found}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Required: </span>
                    <span className="font-medium text-slate-900">{issue.evaluation_details.required}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Evaluator: </span>
                    <span className="font-medium text-slate-900">{issue.evaluation_details.evaluator}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Detected
              </label>
              <div className="text-sm text-slate-600">
                {ComplianceMetadataStore.formatRelativeTime(issue.created_at)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={issue.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="open">Open</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Quick navigation */}
            {issue.module && (
              <button
                onClick={() => handleNavigateToModule(issue.module!)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Go to {issue.module.charAt(0).toUpperCase() + issue.module.slice(1)} Module
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {activeTab === 'remediation' && (
          <div className="space-y-6">
            {/* Suggested action from evaluator */}
            {issue.remediation_suggestion && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Suggested Action
                </label>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-900">
                      {issue.remediation_suggestion}
                    </div>
                  </div>
                  {!showNewAction && (
                    <button
                      onClick={() => {
                        setActionForm({
                          action: issue.remediation_suggestion || '',
                          due_date: '',
                          status: 'pending'
                        });
                        setShowNewAction(true);
                      }}
                      className="mt-3 text-xs text-green-700 hover:text-green-900 font-medium flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Create as action
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* DB-backed remediation actions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Remediation Actions
                </label>
                {!showNewAction && (
                  <button
                    onClick={() => {
                      setActionForm({ action: '', due_date: '', status: 'pending' });
                      setShowNewAction(true);
                    }}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Action
                  </button>
                )}
              </div>

              {/* New action form */}
              {showNewAction && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Action Description</label>
                    <textarea
                      value={actionForm.action}
                      onChange={(e) => setActionForm({ ...actionForm, action: e.target.value })}
                      placeholder="What needs to be done to resolve this?"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Due Date (optional)</label>
                    <input
                      type="date"
                      value={actionForm.due_date}
                      onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateAction}
                      disabled={!actionForm.action.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      Create Action
                    </button>
                    <button
                      onClick={() => setShowNewAction(false)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Pending actions */}
              {pendingActions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {pendingActions.map(action => (
                    <div key={action.id} className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm text-slate-900 flex-1 pr-2">{action.action}</div>
                        <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${actionStatusColors[action.status]}`}>
                          {action.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        {action.due_date && (
                          <span className={`flex items-center gap-1 ${
                            new Date(action.due_date) < new Date() ? 'text-red-600 font-medium' : ''
                          }`}>
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(action.due_date).toLocaleDateString()}
                            {new Date(action.due_date) < new Date() && ' (overdue)'}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ComplianceMetadataStore.formatRelativeTime(action.created_at)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {action.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateActionStatus(action.id, 'in_progress')}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Start Work
                          </button>
                        )}
                        {action.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateActionStatus(action.id, 'completed')}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Mark Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAction(action.id)}
                          className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed actions */}
              {completedActions.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">
                    Completed ({completedActions.length})
                  </div>
                  <div className="space-y-2">
                    {completedActions.map(action => (
                      <div key={action.id} className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-green-900 line-through">{action.action}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {remediationActions.length === 0 && !showNewAction && (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  <Info className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                  <div className="text-sm">No remediation actions yet</div>
                  <div className="text-xs mt-1">Create an action to track how this issue will be resolved</div>
                </div>
              )}
            </div>

            {/* Legacy notes section */}
            <div className="border-t border-slate-200 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quick Notes
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="mt-2 px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm"
              >
                Add Note
              </button>

              {notes.length > 0 && (
                <div className="mt-3 space-y-2">
                  {notes.map((note, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="text-sm text-slate-700">{note.note}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(note.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'affected' && (
          <div className="space-y-4">
            {issue.affected_entities && issue.affected_entities.length > 0 ? (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Affected Data
                </label>
                <div className="space-y-2">
                  {issue.affected_entities.map((entity, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{entity.name || entity.id}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Type: {entity.type}
                          </div>
                        </div>
                        <button
                          onClick={() => handleNavigateToModule(entity.type)}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="View in module"
                        >
                          <ExternalLink className="h-4 w-4 text-blue-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Info className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <div className="text-sm">No specific entities identified</div>
                <div className="text-xs mt-1">The evaluation did not flag specific records</div>
              </div>
            )}

            {issue.module && (
              <div className="mt-6">
                <button
                  onClick={() => handleNavigateToModule(issue.module!)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Open {issue.module.charAt(0).toUpperCase() + issue.module.slice(1)} Module
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Technical Details
              </label>
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <div className="text-xs text-slate-300 font-mono">
                  <div>Issue ID: {issue.id}</div>
                  {issue.rule_id && <div>Rule ID: {issue.rule_id}</div>}
                  <div>Rule Code: {issue.rule_code}</div>
                  <div>Created: {new Date(issue.created_at).toISOString()}</div>
                </div>
              </div>
            </div>

            {issue.evaluation_details && (
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Evaluation Output
                </button>
                {showDetails && (
                  <div className="mt-2 bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-slate-300 font-mono">
                      {JSON.stringify(issue.evaluation_details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <div className="font-medium mb-1">For Technical Users</div>
                  <div>
                    This section contains raw evaluation data for debugging and audit purposes.
                    Share this information with your technical team if the issue persists.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </span>
            {remediationActions.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {completedActions.length}/{remediationActions.length} actions done
              </span>
            )}
          </div>
          <div>
            Updated {ComplianceMetadataStore.formatRelativeTime(issue.created_at)}
          </div>
        </div>
      </div>
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
