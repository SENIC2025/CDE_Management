import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { ComplianceMetadataStore } from '../../lib/complianceMetadata';
import { ConfirmDialog } from '../ui';
import useConfirm from '../../hooks/useConfirm';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Search,
  Filter,
  ChevronRight,
  Play,
  Trash2,
  Info,
  BarChart3,
  ListTodo
} from 'lucide-react';

interface RemediationAction {
  id: string;
  compliance_check_id: string;
  project_id: string;
  action: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  remediation_suggestion: string | null;
  created_at: string;
  updated_at: string;
}

interface RemediationDashboardProps {
  onNavigateToCheck?: (checkId: string) => void;
}

export default function RemediationDashboard({ onNavigateToCheck }: RemediationDashboardProps) {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const [actions, setActions] = useState<RemediationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [confirmProps, confirmDialog] = useConfirm();

  useEffect(() => {
    if (currentProject) {
      loadAllActions();
    }
  }, [currentProject]);

  async function loadAllActions() {
    if (!currentProject) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('remediation_actions')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (error: any) {
      console.error('[Remediation] Error loading actions:', error);
      setActions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(actionId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('remediation_actions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) throw error;
      loadAllActions();
    } catch (error: any) {
      console.error('[Remediation] Error updating status:', error);
      alert('Failed to update action status');
    }
  }

  async function handleDelete(actionId: string) {
    const ok = await confirmDialog({ title: 'Delete action?', message: 'This remediation action will be permanently removed.' });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('remediation_actions')
        .delete()
        .eq('id', actionId);

      if (error) throw error;
      loadAllActions();
    } catch (error: any) {
      console.error('[Remediation] Error deleting action:', error);
      alert('Failed to delete action');
    }
  }

  // Stats
  const stats = useMemo(() => {
    const pending = actions.filter(a => a.status === 'pending');
    const inProgress = actions.filter(a => a.status === 'in_progress');
    const completed = actions.filter(a => a.status === 'completed');
    const overdue = actions.filter(a =>
      a.due_date &&
      new Date(a.due_date) < new Date() &&
      a.status !== 'completed'
    );
    const dueSoon = actions.filter(a => {
      if (!a.due_date || a.status === 'completed') return false;
      const dueDate = new Date(a.due_date);
      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= threeDays;
    });

    const completionRate = actions.length > 0
      ? Math.round((completed.length / actions.length) * 100)
      : 0;

    return { pending, inProgress, completed, overdue, dueSoon, completionRate };
  }, [actions]);

  // Filtered actions
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      if (searchTerm && !action.action.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (statusFilter && action.status !== statusFilter) {
        return false;
      }
      if (overdueFilter) {
        return action.due_date &&
          new Date(action.due_date) < new Date() &&
          action.status !== 'completed';
      }
      return true;
    });
  }, [actions, searchTerm, statusFilter, overdueFilter]);

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700'
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed'
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-slate-500 mt-3">Loading remediation actions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => { setStatusFilter(''); setOverdueFilter(false); }}
          className={`bg-white rounded-lg border p-4 text-left hover:border-blue-300 transition-colors ${
            !statusFilter && !overdueFilter ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total</span>
            <ListTodo className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{actions.length}</div>
        </button>

        <button
          onClick={() => { setStatusFilter('pending'); setOverdueFilter(false); }}
          className={`bg-white rounded-lg border p-4 text-left hover:border-slate-300 transition-colors ${
            statusFilter === 'pending' ? 'border-slate-400 ring-1 ring-slate-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Pending</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pending.length}</div>
        </button>

        <button
          onClick={() => { setStatusFilter('in_progress'); setOverdueFilter(false); }}
          className={`bg-white rounded-lg border p-4 text-left hover:border-blue-300 transition-colors ${
            statusFilter === 'in_progress' ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">In Progress</span>
            <Play className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress.length}</div>
        </button>

        <button
          onClick={() => { setOverdueFilter(true); setStatusFilter(''); }}
          className={`bg-white rounded-lg border p-4 text-left hover:border-red-300 transition-colors ${
            overdueFilter ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Overdue</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className={`text-2xl font-bold ${stats.overdue.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {stats.overdue.length}
          </div>
        </button>

        <button
          onClick={() => { setStatusFilter('completed'); setOverdueFilter(false); }}
          className={`bg-white rounded-lg border p-4 text-left hover:border-green-300 transition-colors ${
            statusFilter === 'completed' ? 'border-green-400 ring-1 ring-green-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.completed.length}</div>
        </button>
      </div>

      {/* Completion progress bar */}
      {actions.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Completion</span>
            <span className="text-sm font-bold text-slate-900">{stats.completionRate}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{stats.completed.length} completed</span>
            <span>{stats.pending.length + stats.inProgress.length} remaining</span>
          </div>
        </div>
      )}

      {/* Due soon warning */}
      {stats.dueSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Calendar className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-900">
                {stats.dueSoon.length} {stats.dueSoon.length === 1 ? 'action' : 'actions'} due within 3 days
              </div>
              <div className="text-xs text-amber-700 mt-1">
                {stats.dueSoon.map(a => a.action.substring(0, 60)).join('; ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search actions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setOverdueFilter(false); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Actions list */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Remediation Actions
            <span className="ml-2 text-slate-400 font-normal">({filteredActions.length})</span>
          </h3>
        </div>

        {filteredActions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Info className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <div className="text-sm font-medium">
              {actions.length === 0
                ? 'No remediation actions yet'
                : 'No actions match your filters'
              }
            </div>
            <div className="text-xs mt-1 text-slate-400">
              {actions.length === 0
                ? 'Open an issue and create remediation actions to track resolution'
                : 'Try adjusting your search or filters'
              }
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActions.map(action => {
              const isOverdue = action.due_date &&
                new Date(action.due_date) < new Date() &&
                action.status !== 'completed';

              return (
                <div key={action.id} className={`p-4 hover:bg-slate-50 transition-colors ${
                  isOverdue ? 'bg-red-50/50' : ''
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="text-sm text-slate-900">{action.action}</div>
                      {action.remediation_suggestion && action.remediation_suggestion !== action.action && (
                        <div className="text-xs text-slate-500 mt-1 italic">
                          Suggested: {action.remediation_suggestion.substring(0, 100)}
                          {action.remediation_suggestion.length > 100 ? '...' : ''}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${statusColors[action.status]}`}>
                      {statusLabels[action.status] || action.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    {action.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(action.due_date).toLocaleDateString()}
                        {isOverdue && ' (overdue)'}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {ComplianceMetadataStore.formatRelativeTime(action.created_at)}
                    </span>
                    {action.updated_at && action.updated_at !== action.created_at && (
                      <span className="flex items-center gap-1">
                        Updated {ComplianceMetadataStore.formatRelativeTime(action.updated_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {action.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(action.id, 'in_progress')}
                        className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1 transition-colors"
                      >
                        <Play className="h-3 w-3" />
                        Start Work
                      </button>
                    )}
                    {action.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateStatus(action.id, 'completed')}
                        className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Mark Complete
                      </button>
                    )}
                    {action.status === 'completed' && (
                      <button
                        onClick={() => handleUpdateStatus(action.id, 'in_progress')}
                        className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center gap-1 transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(action.id)}
                      className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
