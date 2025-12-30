import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { ComplianceMetadataStore, getModuleRoute } from '../../lib/complianceMetadata';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';

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

interface IssueDrawerProps {
  issue: Issue | null;
  rules: Rule[];
  onClose: () => void;
  onStatusChange?: (issueId: string, newStatus: string) => void;
}

export default function IssueDrawer({
  issue,
  rules,
  onClose,
  onStatusChange
}: IssueDrawerProps) {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'summary' | 'remediation' | 'affected' | 'details'>('summary');
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (issue && currentProject) {
      const issueNotes = ComplianceMetadataStore.getNotesForIssue(currentProject.id, issue.id);
      setNotes(issueNotes);
    }
  }, [issue, currentProject]);

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

    ComplianceMetadataStore.addNote(currentProject.id, issue.id, newNote);
    setNotes(ComplianceMetadataStore.getNotesForIssue(currentProject.id, issue.id));
    setNewNote('');
  }

  function handleNavigateToModule(module: string) {
    const route = getModuleRoute(module);
    navigate(route);
    onClose();
  }

  function handleStatusChange(newStatus: string) {
    if (onStatusChange) {
      onStatusChange(issue.id, newStatus);
    }
  }

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
              : issue.status === 'acknowledged'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
          </span>
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Detected
              </label>
              <div className="text-sm text-slate-600">
                {ComplianceMetadataStore.formatRelativeTime(issue.created_at)}
              </div>
            </div>

            {rule && (rule.scope || rule.applies_to) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Why It Matters
                </label>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="text-sm text-amber-900">
                    {rule.scope && <div className="mb-2"><strong>Scope:</strong> {rule.scope}</div>}
                    {rule.applies_to && <div><strong>Applies to:</strong> {rule.applies_to}</div>}
                  </div>
                </div>
              </div>
            )}

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
          </div>
        )}

        {activeTab === 'remediation' && (
          <div className="space-y-6">
            {issue.remediation_suggestion ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Suggested Actions
                </label>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-900">
                      {issue.remediation_suggestion}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Info className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <div className="text-sm">No automated remediation suggestion available</div>
                <div className="text-xs mt-1">Add manual notes below</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Add Remediation Note
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Describe the action taken or planned..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Add Note
              </button>
            </div>

            {notes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Remediation History
                </label>
                <div className="space-y-2">
                  {notes.map((note, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="text-sm text-slate-700">{note.note}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(note.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </div>
          <div>
            Updated {ComplianceMetadataStore.formatRelativeTime(issue.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
