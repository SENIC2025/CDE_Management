import { useState, useEffect } from 'react';
import { Plus, Target, AlertCircle, TrendingUp, Activity, CheckCircle } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';
import { projectObjectivesService, type ProjectObjective } from '../lib/projectObjectivesService';
import SearchBar from '../components/SearchBar';
import AddObjectiveModal from '../components/objectives/AddObjectiveModal';
import ObjectiveEditPanel from '../components/objectives/ObjectiveEditPanel';
import ObjectiveCard from '../components/objectives/ObjectiveCard';
import { PageHeader, PageSkeleton, ConfirmDialog, CopyLinkButton, ShareButton } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import useDeepLink from '../hooks/useDeepLink';

export default function ObjectivesNew() {
  const { currentProject } = useProject();
  const [confirmProps, confirm] = useConfirm();
  const [objectives, setObjectives] = useState<ProjectObjective[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<ProjectObjective | null>(null);

  // Deep link support: ?view=<objectiveId>
  const { openItem, closeItem, copyDeepLink } = useDeepLink({
    items: objectives,
    onOpen: setEditingObjective,
    onClose: () => setEditingObjective(null),
    loading,
  });

  // Map of objective ID → number of messages that reference it
  const [linkedMessagesCounts, setLinkedMessagesCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (currentProject) {
      loadObjectives();
      loadLinkedMessagesCounts();
    }
  }, [currentProject]);

  const loadObjectives = async () => {
    if (!currentProject) return;

    try {
      setLoading(true);
      setError(null);
      const data = await projectObjectivesService.listObjectives(currentProject.id);
      setObjectives(data);
    } catch (err: any) {
      console.error('[Objectives] Error loading objectives:', err);
      setError(err?.message || 'Failed to load objectives');
    } finally {
      setLoading(false);
    }
  };

  const loadLinkedMessagesCounts = async () => {
    if (!currentProject) return;
    try {
      const { data } = await supabase
        .from('messages')
        .select('linked_objective_ids')
        .eq('project_id', currentProject.id);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(msg => {
          const ids: string[] = Array.isArray(msg.linked_objective_ids) ? msg.linked_objective_ids : [];
          ids.forEach(id => {
            counts[id] = (counts[id] || 0) + 1;
          });
        });
        setLinkedMessagesCounts(counts);
      }
    } catch (err) {
      // Messages table might not exist yet — that's fine
      console.debug('[Objectives] Could not load linked messages counts:', err);
    }
  };

  const handleDelete = async (objectiveId: string) => {
    const ok = await confirm({ title: 'Delete objective?', message: 'This objective and its linked data will be permanently removed. This cannot be undone.' });
    if (!ok) return;

    try {
      await projectObjectivesService.deleteObjective(objectiveId);
      await loadObjectives();
    } catch (err: any) {
      console.error('[Objectives] Error deleting objective:', err);
      alert('Failed to delete objective');
    }
  };

  const handleQuickStatusChange = async (objectiveId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from('project_objectives')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', objectiveId);

      if (updateError) throw updateError;

      // Update local state immediately for snappy UI
      setObjectives(prev => prev.map(obj =>
        obj.id === objectiveId ? { ...obj, status: newStatus } : obj
      ));
    } catch (err: any) {
      console.error('[Objectives] Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const filteredObjectives = objectives.filter(obj => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesTitle = obj.title.toLowerCase().includes(term);
      const matchesDesc = obj.description?.toLowerCase().includes(term);
      const matchesOwner = obj.responsible_person?.toLowerCase().includes(term);
      if (!matchesTitle && !matchesDesc && !matchesOwner) return false;
    }

    if (domainFilter && obj.domain !== domainFilter) return false;
    if (priorityFilter && obj.priority !== priorityFilter) return false;
    if (statusFilter && obj.status !== statusFilter) return false;

    return true;
  });

  const stats = {
    total: objectives.length,
    high_priority: objectives.filter(o => o.priority === 'high').length,
    in_progress: objectives.filter(o => o.status === 'in_progress').length,
    completed: objectives.filter(o => o.status === 'completed').length,
    draft: objectives.filter(o => o.status === 'draft').length,
    byDomain: {
      communication: objectives.filter(o => o.domain === 'communication').length,
      dissemination: objectives.filter(o => o.domain === 'dissemination').length,
      exploitation: objectives.filter(o => o.domain === 'exploitation').length,
    }
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Select a project to manage objectives</p>
      </div>
    );
  }

  if (loading && objectives.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Objectives"
        subtitle="Define and track communication, dissemination and exploitation objectives"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] font-medium transition-colors"
          >
            <Plus size={18} />
            Add Objective
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm text-red-800 mb-2">{error}</div>
            <button
              onClick={loadObjectives}
              className="text-sm text-red-700 font-medium hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">High Priority</span>
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-600">{stats.high_priority}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">In Progress</span>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Completed</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Drafts</span>
            <Target className="w-5 h-5 text-gray-300" />
          </div>
          <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
        </div>
      </div>

      {/* Domain Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-gray-500">By domain:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-400"></span>
            <span className="text-sm text-gray-700">Communication <span className="font-semibold">{stats.byDomain.communication}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span className="text-sm text-gray-700">Dissemination <span className="font-semibold">{stats.byDomain.dissemination}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-400"></span>
            <span className="text-sm text-gray-700">Exploitation <span className="font-semibold">{stats.byDomain.exploitation}</span></span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search objectives..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Domain</label>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Domains</option>
              <option value="communication">Communication</option>
              <option value="dissemination">Dissemination</option>
              <option value="exploitation">Exploitation</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </div>
        {(searchTerm || domainFilter || priorityFilter || statusFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setDomainFilter('');
              setPriorityFilter('');
              setStatusFilter('');
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Objective List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredObjectives.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {objectives.length === 0 ? (
            <>
              <p className="text-gray-700 font-medium mb-2">No objectives yet</p>
              <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                Start by defining your CDE objectives. Assign each to a domain (Communication,
                Dissemination, or Exploitation), set a target date, and track progress as your project evolves.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                <span>Create your first objective</span>
              </button>
            </>
          ) : (
            <p className="text-gray-600">No objectives match your filters</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredObjectives.map((objective) => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              linkedMessagesCount={linkedMessagesCounts[objective.id] || 0}
              onEdit={() => openItem(objective)}
              onDelete={() => handleDelete(objective.id)}
              onStatusChange={(newStatus) => handleQuickStatusChange(objective.id, newStatus)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddObjectiveModal
          projectId={currentProject.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadObjectives();
          }}
        />
      )}

      {editingObjective && (
        <ObjectiveEditPanel
          objective={editingObjective}
          onClose={closeItem}
          onUpdate={() => {
            closeItem();
            loadObjectives();
          }}
          deepLinkActions={
            <div className="flex items-center gap-2">
              <CopyLinkButton itemId={editingObjective.id} onCopy={copyDeepLink} />
              {currentProject && (
                <ShareButton
                  entityType="objective"
                  entityId={editingObjective.id}
                  projectId={currentProject.id}
                  entityTitle={editingObjective.title}
                />
              )}
            </div>
          }
        />
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
