import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Search, Filter, BookmarkPlus, BarChart3, Users as UsersIcon } from 'lucide-react';
import StakeholderResponsiveness from '../components/StakeholderResponsiveness';
import StakeholderSetupWizard, { type StakeholderFormData } from '../components/stakeholders/StakeholderSetupWizard';
import StakeholderCard from '../components/stakeholders/StakeholderCard';
import { getCategoryLabel, type StakeholderCategory } from '../lib/stakeholderLibrary';

interface StakeholderGroup {
  id: string;
  project_id: string;
  name: string;
  description: string;
  role: string;
  level: string;
  capacity_to_act?: string;
  priority_score: number;
  created_at?: string;
  updated_at?: string;
}

interface SavedView {
  id: string;
  name: string;
  filters: FilterState;
}

interface FilterState {
  search: string;
  category: string;
  level: string;
  priority: string;
  cde: 'communication' | 'dissemination' | 'exploitation' | null;
  onlyPrimary: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  category: 'all',
  level: 'all',
  priority: 'all',
  cde: null,
  onlyPrimary: false
};

const PRESET_VIEWS: SavedView[] = [
  {
    id: 'all',
    name: 'All Stakeholders',
    filters: DEFAULT_FILTERS
  },
  {
    id: 'primary',
    name: 'Primary Stakeholders',
    filters: { ...DEFAULT_FILTERS, onlyPrimary: true }
  },
  {
    id: 'exploitation',
    name: 'Exploitation Stakeholders',
    filters: { ...DEFAULT_FILTERS, cde: 'exploitation' }
  },
  {
    id: 'policy',
    name: 'Policy Level',
    filters: { ...DEFAULT_FILTERS, category: 'policy' }
  }
];

export default function Stakeholders() {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<'groups' | 'responsiveness'>('groups');
  const [stakeholders, setStakeholders] = useState<StakeholderGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<StakeholderGroup | null>(null);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showViewMenu, setShowViewMenu] = useState(false);

  useEffect(() => {
    if (currentProject?.id) {
      loadStakeholders();
    }
  }, [currentProject?.id]);

  useEffect(() => {
    const stored = localStorage.getItem('stakeholder_saved_views');
    if (stored) {
      try {
        setSavedViews(JSON.parse(stored));
      } catch (err) {
        console.error('[Stakeholders] Error loading saved views:', err);
      }
    }
  }, []);

  const loadStakeholders = async () => {
    if (!currentProject?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stakeholder_groups')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('priority_score', { ascending: false });

      if (error) throw error;
      setStakeholders(data || []);
    } catch (err: any) {
      console.error('[Stakeholders] Error loading stakeholders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStakeholder = async (formData: StakeholderFormData) => {
    if (!currentProject?.id) return;

    try {
      const { error } = await supabase
        .from('stakeholder_groups')
        .insert({ ...formData, project_id: currentProject.id });

      if (error) throw error;

      await loadStakeholders();
    } catch (err: any) {
      console.error('[Stakeholders] Error creating stakeholder:', err);
      throw err;
    }
  };

  const handleUpdateStakeholder = async (id: string, updates: Partial<StakeholderGroup>) => {
    try {
      const { error } = await supabase
        .from('stakeholder_groups')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setStakeholders(prev =>
        prev.map(s => s.id === id ? { ...s, ...updates } : s)
      );
    } catch (err: any) {
      console.error('[Stakeholders] Error updating stakeholder:', err);
      throw err;
    }
  };

  const handleDeleteStakeholder = async (id: string) => {
    if (!confirm('Delete this stakeholder? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('stakeholder_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStakeholders(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('[Stakeholders] Error deleting stakeholder:', err);
    }
  };

  const applyView = (view: SavedView) => {
    setFilters(view.filters);
    setShowViewMenu(false);
  };

  const saveCurrentView = () => {
    const name = prompt('Enter a name for this view:');
    if (!name) return;

    const newView: SavedView = {
      id: Date.now().toString(),
      name,
      filters: { ...filters }
    };

    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem('stakeholder_saved_views', JSON.stringify(updated));
    setShowViewMenu(false);
  };

  const filteredStakeholders = stakeholders.filter(s => {
    if (filters.search && !s.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !s.description?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    if (filters.category !== 'all' && s.role !== filters.category) {
      return false;
    }

    if (filters.level !== 'all' && s.level !== filters.level) {
      return false;
    }

    if (filters.priority !== 'all') {
      if (filters.priority === 'primary' && s.priority_score < 9) return false;
      if (filters.priority === 'secondary' && (s.priority_score < 6 || s.priority_score >= 9)) return false;
      if (filters.priority === 'observational' && s.priority_score >= 6) return false;
    }

    if (filters.onlyPrimary && s.priority_score < 9) {
      return false;
    }

    if (filters.cde) {
      if (!s.capacity_to_act || !s.capacity_to_act.startsWith('[METADATA]')) {
        return false;
      }
      try {
        const json = JSON.parse(s.capacity_to_act.substring('[METADATA]'.length));
        if (!json.cde || !json.cde[filters.cde]) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  });

  const primaryCount = stakeholders.filter(s => s.priority_score >= 9).length;
  const exploitationCount = stakeholders.filter(s => {
    if (!s.capacity_to_act || !s.capacity_to_act.startsWith('[METADATA]')) return false;
    try {
      const json = JSON.parse(s.capacity_to_act.substring('[METADATA]'.length));
      return json.cde?.exploitation === true;
    } catch {
      return false;
    }
  }).length;

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Select a project to manage stakeholders</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stakeholder Management</h1>
          <p className="text-gray-600 mt-1">Manage stakeholder groups and engagement strategy</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Stakeholder</span>
        </button>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'groups'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Stakeholder Groups
        </button>
        <button
          onClick={() => setActiveTab('responsiveness')}
          className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'responsiveness'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Responsiveness</span>
        </button>
      </div>

      {activeTab === 'groups' && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stakeholders.length}</div>
                <div className="text-sm text-gray-600">Total Stakeholders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{primaryCount}</div>
                <div className="text-sm text-gray-600">Primary</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{exploitationCount}</div>
                <div className="text-sm text-gray-600">Exploitation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">{stakeholders.length - primaryCount}</div>
                <div className="text-sm text-gray-600">Secondary/Obs.</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stakeholders..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="policy">Policy</option>
                <option value="market">Market</option>
                <option value="research">Research</option>
                <option value="society">Society</option>
                <option value="media">Media</option>
                <option value="funders">Funders</option>
              </select>

              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="EU">EU</option>
                <option value="national">National</option>
                <option value="regional">Regional</option>
                <option value="local">Local</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="observational">Observational</option>
              </select>

              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">C/D/E:</span>
                <button
                  onClick={() => setFilters({ ...filters, cde: filters.cde === 'communication' ? null : 'communication' })}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    filters.cde === 'communication'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  C
                </button>
                <button
                  onClick={() => setFilters({ ...filters, cde: filters.cde === 'dissemination' ? null : 'dissemination' })}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    filters.cde === 'dissemination'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  D
                </button>
                <button
                  onClick={() => setFilters({ ...filters, cde: filters.cde === 'exploitation' ? null : 'exploitation' })}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    filters.cde === 'exploitation'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  E
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowViewMenu(!showViewMenu)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">Views</span>
                </button>

                {showViewMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="p-2 border-b">
                      <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Preset Views</div>
                      {PRESET_VIEWS.map(view => (
                        <button
                          key={view.id}
                          onClick={() => applyView(view)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                        >
                          {view.name}
                        </button>
                      ))}
                    </div>
                    {savedViews.length > 0 && (
                      <div className="p-2 border-b">
                        <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Custom Views</div>
                        {savedViews.map(view => (
                          <button
                            key={view.id}
                            onClick={() => applyView(view)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                          >
                            {view.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="p-2">
                      <button
                        onClick={saveCurrentView}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                        <span>Save Current View</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredStakeholders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                {stakeholders.length === 0 ? 'No stakeholders yet' : 'No stakeholders match your filters'}
              </p>
              {stakeholders.length === 0 && (
                <button
                  onClick={() => setShowWizard(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Stakeholder</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStakeholders.map(stakeholder => (
                <StakeholderCard
                  key={stakeholder.id}
                  stakeholder={stakeholder}
                  onUpdate={handleUpdateStakeholder}
                  onDelete={handleDeleteStakeholder}
                  onEdit={setEditingStakeholder}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'responsiveness' && (
        <StakeholderResponsiveness />
      )}

      {showWizard && (
        <StakeholderSetupWizard
          projectId={currentProject.id}
          onClose={() => setShowWizard(false)}
          onSave={handleCreateStakeholder}
        />
      )}

      {editingStakeholder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Edit Stakeholder</h3>
              <button
                onClick={() => setEditingStakeholder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Use inline editing on the card for quick changes. Full editing panel coming soon.
              </p>
              <button
                onClick={() => setEditingStakeholder(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
