import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Edit, Trash2, Users as UsersIcon, BarChart3 } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import StakeholderResponsiveness from '../components/StakeholderResponsiveness';

interface StakeholderGroup {
  id: string;
  name: string;
  description: string;
  role: string;
  level: string;
  priority_score: number;
}

export default function Stakeholders() {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<'groups' | 'responsiveness'>('groups');
  const [groups, setGroups] = useState<StakeholderGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    role: '',
    level: '',
    capacity_to_act: '',
    incentives: '',
    barriers: '',
    priority_score: 5,
  });

  useEffect(() => {
    if (currentProject) loadGroups();
  }, [currentProject]);

  async function loadGroups() {
    const { data } = await supabase.from('stakeholder_groups').select('*').eq('project_id', currentProject!.id).order('priority_score', { ascending: false });
    setGroups(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await supabase.from('stakeholder_groups').update(formData).eq('id', editingId);
    } else {
      await supabase.from('stakeholder_groups').insert({ ...formData, project_id: currentProject!.id });
    }
    resetForm();
    loadGroups();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this stakeholder group?')) {
      await supabase.from('stakeholder_groups').delete().eq('id', id);
      loadGroups();
    }
  }

  function resetForm() {
    setFormData({ name: '', description: '', role: '', level: '', capacity_to_act: '', incentives: '', barriers: '', priority_score: 5 });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(group: StakeholderGroup) {
    setFormData({ name: group.name, description: group.description, role: group.role, level: group.level, capacity_to_act: '', incentives: '', barriers: '', priority_score: group.priority_score });
    setEditingId(group.id);
    setShowForm(true);
  }

  const filtered = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()) || g.description.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stakeholder Management</h1>
          <p className="text-slate-600 mt-1">Manage stakeholder groups and ecosystem</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Plus size={20} />New Group</button>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 font-medium ${activeTab === 'groups' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Groups</button>
        <button onClick={() => setActiveTab('responsiveness')} className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === 'responsiveness' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}><BarChart3 size={16} />Responsiveness</button>
      </div>

      {activeTab === 'groups' && (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search stakeholder groups..." />
          </div>

          <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b"><h2 className="text-lg font-semibold">Stakeholder Groups</h2></div>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-slate-600">No stakeholder groups</div>
        ) : (
          <div className="divide-y">
            {filtered.map(group => (
              <div key={group.id} className="p-6 hover:bg-slate-50 flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <UsersIcon size={20} className="text-slate-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{group.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Priority: {group.priority_score}/10</span>
                    </div>
                    {group.description && <p className="text-sm text-slate-600">{group.description}</p>}
                    {group.role && <p className="text-xs text-slate-500 mt-1">Role: {group.role}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(group)} className="text-blue-600"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(group.id)} className="text-red-600"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === 'responsiveness' && (
        <StakeholderResponsiveness />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Stakeholder Group</h3></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><input type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Level</label><input type="text" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Capacity to Act</label><textarea value={formData.capacity_to_act} onChange={(e) => setFormData({ ...formData, capacity_to_act: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Incentives</label><textarea value={formData.incentives} onChange={(e) => setFormData({ ...formData, incentives: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Barriers</label><textarea value={formData.barriers} onChange={(e) => setFormData({ ...formData, barriers: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Priority Score (1-10)</label><input type="number" min="1" max="10" value={formData.priority_score} onChange={(e) => setFormData({ ...formData, priority_score: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
