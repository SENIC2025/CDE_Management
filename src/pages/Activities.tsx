import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Calendar, Search, AlertCircle, RefreshCw, DollarSign, Clock, TrendingUp, Activity as ActivityIcon } from 'lucide-react';
import ActivityCard, { type Activity } from '../components/activities/ActivityCard';
import AddActivityModal from '../components/activities/AddActivityModal';
import ActivityEditPanel from '../components/activities/ActivityEditPanel';
import { PageHeader, PageSkeleton, ConfirmDialog, CopyLinkButton, ShareButton } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import useDeepLink from '../hooks/useDeepLink';

export default function Activities() {
  const { currentProject } = useProject();
  const [confirmProps, confirm] = useConfirm();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Deep link support: ?view=<activityId>
  const { openItem, closeItem, copyDeepLink } = useDeepLink({
    items: activities,
    onOpen: setEditingActivity,
    onClose: () => setEditingActivity(null),
    loading,
  });

  // Name maps for linked entities
  const [objectiveTitles, setObjectiveTitles] = useState<Record<string, string>>({});
  const [channelNames, setChannelNames] = useState<Record<string, string>>({});
  const [stakeholderNames, setStakeholderNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentProject) {
      loadActivities();
      loadEntityNames();
    }
  }, [currentProject]);

  async function loadActivities() {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', currentProject!.id)
        .is('deleted_at', null)
        .order('start_date', { ascending: true });
      if (fetchError) throw fetchError;
      setActivities(data || []);
    } catch (err: any) {
      console.error('[Activities] Error loading:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }

  async function loadEntityNames() {
    const [objRes, chRes, sgRes] = await Promise.all([
      supabase.from('project_objectives').select('id, title').eq('project_id', currentProject!.id),
      supabase.from('channels').select('id, name').eq('project_id', currentProject!.id),
      supabase.from('stakeholder_groups').select('id, name').eq('project_id', currentProject!.id),
    ]);
    if (objRes.data) {
      const map: Record<string, string> = {};
      objRes.data.forEach(o => { map[o.id] = o.title; });
      setObjectiveTitles(map);
    }
    if (chRes.data) {
      const map: Record<string, string> = {};
      chRes.data.forEach(c => { map[c.id] = c.name; });
      setChannelNames(map);
    }
    if (sgRes.data) {
      const map: Record<string, string> = {};
      sgRes.data.forEach(s => { map[s.id] = s.name; });
      setStakeholderNames(map);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: 'Delete activity?', message: 'This activity and its linked data will be permanently removed. This cannot be undone.' });
    if (!ok) return;
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== id));
    }
  }

  async function handleStatusChange(activityId: string, newStatus: string) {
    const { error } = await supabase
      .from('activities')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', activityId);
    if (!error) {
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: newStatus } : a));
    }
  }

  // Filters
  const filtered = activities.filter(a => {
    const displayTitle = a.title || '';
    const matchesSearch = !searchTerm ||
      displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.expected_outputs || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = filterDomain === 'all' || a.domain === filterDomain;
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchesSearch && matchesDomain && matchesStatus;
  });

  // Stats
  const total = activities.length;
  const activeCount = activities.filter(a => a.status === 'active').length;
  const completedCount = activities.filter(a => a.status === 'completed').length;
  const totalBudget = activities.reduce((sum, a) => sum + (a.budget_estimate || 0), 0);
  const totalEffort = activities.reduce((sum, a) => sum + (a.effort_hours || 0), 0);
  const overdueCount = activities.filter(a => {
    if (a.status === 'completed' || a.status === 'cancelled') return false;
    return a.end_date && new Date(a.end_date) < new Date();
  }).length;

  // Domain breakdown
  const domainCounts: Record<string, number> = {};
  activities.forEach(a => { domainCounts[a.domain] = (domainCounts[a.domain] || 0) + 1; });

  const domainColors: Record<string, string> = {
    Communication: 'bg-blue-500',
    Dissemination: 'bg-emerald-500',
    Exploitation: 'bg-orange-500',
  };
  const domainLabels: Record<string, string> = {
    Communication: 'Communication',
    Dissemination: 'Dissemination',
    Exploitation: 'Exploitation',
  };

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  activities.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

  const statusColors: Record<string, string> = {
    planned: 'bg-gray-400',
    active: 'bg-blue-500',
    completed: 'bg-emerald-500',
    on_hold: 'bg-amber-500',
    cancelled: 'bg-red-400',
  };
  const statusLabels: Record<string, string> = {
    planned: 'Planned',
    active: 'Active',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  };

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Select a project to manage activities</p>
      </div>
    );
  }

  if (loading && activities.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calendar}
        title="Activity Planning"
        subtitle="Plan, track, and monitor CDE activities across your project"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] font-medium transition-colors"
          >
            <Plus size={18} />
            New Activity
          </button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ActivityIcon className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <p className="text-sm text-gray-500">Total Budget</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-violet-400" />
            <p className="text-sm text-gray-500">Total Hours</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalEffort}h</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-gray-500">Overdue</p>
          </div>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueCount}</p>
        </div>
      </div>

      {/* Domain Breakdown Bar */}
      {total > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-sm font-medium text-gray-700 mb-2 block">Domain Distribution</span>
          <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
            {['Communication', 'Dissemination', 'Exploitation'].map(d => {
              const count = domainCounts[d] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={d}
                  className={domainColors[d]}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${d}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {['Communication', 'Dissemination', 'Exploitation'].map(d => {
              const count = domainCounts[d] || 0;
              if (count === 0) return null;
              return (
                <div key={d} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className={`w-2.5 h-2.5 rounded-full ${domainColors[d]}`} />
                  <span>{domainLabels[d]}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Breakdown Bar */}
      {total > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-sm font-medium text-gray-700 mb-2 block">Status Distribution</span>
          <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
            {['planned', 'active', 'completed', 'on_hold', 'cancelled'].map(s => {
              const count = statusCounts[s] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={s}
                  className={statusColors[s]}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${statusLabels[s]}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {['planned', 'active', 'completed', 'on_hold', 'cancelled'].map(s => {
              const count = statusCounts[s] || 0;
              if (count === 0) return null;
              return (
                <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s]}`} />
                  <span>{statusLabels[s]}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Domains</option>
            <option value="Communication">Communication</option>
            <option value="Dissemination">Dissemination</option>
            <option value="Exploitation">Exploitation</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
          <button onClick={loadActivities} className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading activities...</p>
        </div>
      )}

      {/* Activity Cards */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activities.length === 0 ? 'No activities yet' : 'No matching activities'}
          </h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            {activities.length === 0
              ? 'Start planning your CDE activities — workshops, publications, social media campaigns, stakeholder events, and more. Link them to your objectives, channels, and stakeholder groups.'
              : 'Try adjusting your search or filters to find what you are looking for.'}
          </p>
          {activities.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              Plan Your First Activity
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              objectiveTitles={objectiveTitles}
              channelNames={channelNames}
              stakeholderNames={stakeholderNames}
              onEdit={() => openItem(activity)}
              onDelete={() => handleDelete(activity.id)}
              onStatusChange={(newStatus) => handleStatusChange(activity.id, newStatus)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddActivityModal
          projectId={currentProject.id}
          onClose={() => setShowAddModal(false)}
          onCreated={loadActivities}
        />
      )}

      {/* Edit Panel */}
      {editingActivity && (
        <ActivityEditPanel
          projectId={currentProject.id}
          activity={editingActivity}
          onClose={closeItem}
          onUpdate={() => { closeItem(); loadActivities(); }}
          deepLinkActions={
            <div className="flex items-center gap-2">
              <CopyLinkButton itemId={editingActivity.id} onCopy={copyDeepLink} />
              <ShareButton
                entityType="activity"
                entityId={editingActivity.id}
                projectId={currentProject.id}
                entityTitle={editingActivity.title}
              />
            </div>
          }
        />
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
