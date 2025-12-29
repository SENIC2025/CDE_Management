import { useState, useEffect } from 'react';
import { Plus, Target, AlertCircle, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { projectObjectivesService, type ProjectObjective } from '../lib/projectObjectivesService';
import SearchBar from '../components/SearchBar';
import AddObjectiveModal from '../components/objectives/AddObjectiveModal';
import ObjectiveEditPanel from '../components/objectives/ObjectiveEditPanel';
import ObjectiveCard from '../components/objectives/ObjectiveCard';

export default function ObjectivesNew() {
  const { currentProject } = useProject();
  const [objectives, setObjectives] = useState<ProjectObjective[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<ProjectObjective | null>(null);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadObjectives();
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

  const handleRefreshHealth = async () => {
    if (!currentProject) return;

    try {
      setRefreshingHealth(true);
      await projectObjectivesService.computeAllObjectivesHealth(currentProject.id);
      await loadObjectives();
    } catch (err: any) {
      console.error('[Objectives] Error refreshing health:', err);
      alert('Failed to refresh objective health');
    } finally {
      setRefreshingHealth(false);
    }
  };

  const handleDelete = async (objectiveId: string) => {
    if (!confirm('Are you sure you want to delete this objective?')) return;

    try {
      await projectObjectivesService.deleteObjective(objectiveId);
      await loadObjectives();
    } catch (err: any) {
      console.error('[Objectives] Error deleting objective:', err);
      alert('Failed to delete objective');
    }
  };

  const handleApplyKPIs = async (objectiveId: string) => {
    if (!currentProject) return;

    try {
      const result = await projectObjectivesService.applyKPISuggestions(currentProject.id, objectiveId);

      const message = result.bundle_applied
        ? `Applied KPI bundle and ${result.kpis_added} additional indicators`
        : `Applied ${result.kpis_added} suggested indicators`;

      const skipMessage = result.kpis_skipped > 0
        ? ` (${result.kpis_skipped} already existed)`
        : '';

      alert(message + skipMessage);
      await loadObjectives();
    } catch (err: any) {
      console.error('[Objectives] Error applying KPIs:', err);
      alert(err?.message || 'Failed to apply KPI suggestions');
    }
  };

  const filteredObjectives = objectives.filter(obj => {
    if (searchTerm && !obj.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !obj.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    if (domainFilter && obj.domain !== domainFilter) {
      return false;
    }

    if (priorityFilter && obj.priority !== priorityFilter) {
      return false;
    }

    if (statusFilter && obj.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const stats = {
    total: objectives.length,
    high_priority: objectives.filter(o => o.priority === 'high').length,
    needs_attention: objectives.filter(o => o.status === 'needs_kpis' || o.status === 'needs_activities' || o.status === 'at_risk').length,
    on_track: objectives.filter(o => o.status === 'on_track').length
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Select a project to manage objectives</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Objectives</h1>
          <p className="text-gray-600 mt-1">Define and track communication, dissemination and exploitation objectives</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefreshHealth}
            disabled={refreshingHealth}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingHealth ? 'animate-spin' : ''}`} />
            <span>Refresh Health</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            <span>Add Objective</span>
          </button>
        </div>
      </div>

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

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Objectives</span>
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
            <span className="text-sm font-medium text-gray-600">Needs Attention</span>
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">{stats.needs_attention}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">On Track</span>
            <Activity className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.on_track}</div>
        </div>
      </div>

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
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="needs_kpis">Needs KPIs</option>
              <option value="needs_activities">Needs Activities</option>
              <option value="no_data">No Data</option>
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredObjectives.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {objectives.length === 0 ? 'No objectives created yet' : 'No objectives match your filters'}
          </p>
          {objectives.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>Create your first objective</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredObjectives.map((objective) => (
            <ObjectiveCard
              key={objective.objective_id}
              objective={objective}
              onEdit={() => setEditingObjective(objective)}
              onDelete={() => handleDelete(objective.objective_id)}
              onApplyKPIs={() => handleApplyKPIs(objective.objective_id)}
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
          projectId={currentProject.id}
          objective={editingObjective}
          onClose={() => setEditingObjective(null)}
          onUpdate={() => {
            setEditingObjective(null);
            loadObjectives();
          }}
        />
      )}
    </div>
  );
}
