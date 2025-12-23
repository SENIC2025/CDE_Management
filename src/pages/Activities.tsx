import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import SavedViewsDropdown from '../components/SavedViewsDropdown';

export default function Activities() {
  const { currentProject } = useProject();
  const [activities, setActivities] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ domain: 'Communication', title: '', description: '', start_date: '', end_date: '', expected_outputs: '', status: 'planned', budget_estimate: 0, effort_hours: 0 });

  function applyFilters(filters: any) {
    if (filters.domain) setDomainFilter(filters.domain);
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        setStatusFilter(filters.status[0] || '');
      } else {
        setStatusFilter(filters.status);
      }
    }
  }

  useEffect(() => { if (currentProject) loadActivities(); }, [currentProject]);

  async function loadActivities() {
    const { data } = await supabase.from('activities').select('*').eq('project_id', currentProject!.id).order('start_date', { ascending: false });
    setActivities(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) await supabase.from('activities').update(formData).eq('id', editingId);
    else await supabase.from('activities').insert({ ...formData, project_id: currentProject!.id });
    resetForm();
    loadActivities();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete activity?')) { await supabase.from('activities').delete().eq('id', id); loadActivities(); }
  }

  function resetForm() {
    setFormData({ domain: 'Communication', title: '', description: '', start_date: '', end_date: '', expected_outputs: '', status: 'planned', budget_estimate: 0, effort_hours: 0 });
    setEditingId(null);
    setShowForm(false);
  }

  const filtered = activities.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!domainFilter || a.domain === domainFilter) &&
    (!statusFilter || a.status === statusFilter)
  );

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Activity Planning</h1><p className="text-slate-600 mt-1">Plan and track CDE activities</p></div>
        <div className="flex gap-2">
          <SavedViewsDropdown entityType="activities" onApplyFilters={applyFilters} />
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Plus size={20} />New</button>
        </div>
      </div>

      <div className="bg-slate-50 border rounded p-4 grid grid-cols-4 gap-3">
        <div><label className="block text-xs font-medium mb-1">Domain</label><select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="w-full px-3 py-2 text-sm border rounded"><option value="">All</option><option value="Communication">Communication</option><option value="Dissemination">Dissemination</option><option value="Exploitation">Exploitation</option></select></div>
        <div className="col-span-3"><label className="block text-xs font-medium mb-1">Search</label><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b"><h2 className="text-lg font-semibold">Activities</h2></div>
        {filtered.length === 0 ? <div className="p-6 text-center text-slate-600">No activities</div> : (
          <div className="divide-y">
            {filtered.map(act => (
              <div key={act.id} className="p-6 hover:bg-slate-50 flex justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <CalendarIcon size={20} className="text-slate-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{act.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{act.domain}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{act.status}</span>
                    </div>
                    {act.description && <p className="text-sm text-slate-600">{act.description}</p>}
                    {(act.start_date || act.end_date) && <p className="text-xs text-slate-500 mt-1">{act.start_date} to {act.end_date}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setFormData({ domain: act.domain, title: act.title, description: act.description, start_date: act.start_date, end_date: act.end_date, expected_outputs: act.expected_outputs, status: act.status, budget_estimate: act.budget_estimate, effort_hours: act.effort_hours }); setEditingId(act.id); setShowForm(true); }} className="text-blue-600"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(act.id)} className="text-red-600"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Activity</h3></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Domain</label><select required value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="Communication">Communication</option><option value="Dissemination">Dissemination</option><option value="Exploitation">Exploitation</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Status</label><select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Budget Estimate</label><input type="number" value={formData.budget_estimate} onChange={(e) => setFormData({ ...formData, budget_estimate: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Effort Hours</label><input type="number" value={formData.effort_hours} onChange={(e) => setFormData({ ...formData, effort_hours: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Expected Outputs</label><textarea value={formData.expected_outputs} onChange={(e) => setFormData({ ...formData, expected_outputs: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
