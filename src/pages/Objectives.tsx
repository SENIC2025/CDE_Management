import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, GitBranch } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';

interface Objective {
  id: string;
  title: string;
  domain: string;
  level: string;
  description: string;
  parent_id: string | null;
  status: string;
  version: number;
}

export default function Objectives() {
  const { currentProject } = useProject();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    parent_id: '',
    domain: 'Communication',
    level: 'general',
    title: '',
    description: '',
    smart_specific: '',
    smart_measurable: '',
    risks: '',
    assumptions: '',
    status: 'draft',
  });
  const [changeRationale, setChangeRationale] = useState('');

  useEffect(() => {
    if (currentProject) {
      loadObjectives();
    }
  }, [currentProject]);

  async function loadObjectives() {
    const { data } = await supabase
      .from('cde_objectives')
      .select('*')
      .eq('project_id', currentProject!.id)
      .order('created_at', { ascending: true });

    setObjectives(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingId) {
      const oldObj = objectives.find(o => o.id === editingId);
      await supabase.from('objective_versions').insert({
        objective_id: editingId,
        version_no: oldObj!.version,
        change_rationale: changeRationale,
        snapshot_json: oldObj,
      });
      await supabase.from('cde_objectives').update({ ...formData, version: (oldObj!.version || 1) + 1 }).eq('id', editingId);
    } else {
      await supabase.from('cde_objectives').insert({ ...formData, project_id: currentProject!.id, version: 1 });
    }

    resetForm();
    loadObjectives();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this objective?')) {
      await supabase.from('cde_objectives').delete().eq('id', id);
      loadObjectives();
    }
  }

  function resetForm() {
    setFormData({ parent_id: '', domain: 'Communication', level: 'general', title: '', description: '', smart_specific: '', smart_measurable: '', risks: '', assumptions: '', status: 'draft' });
    setChangeRationale('');
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(obj: Objective) {
    setFormData({ parent_id: obj.parent_id || '', domain: obj.domain, level: obj.level, title: obj.title, description: obj.description, smart_specific: '', smart_measurable: '', risks: '', assumptions: '', status: obj.status });
    setEditingId(obj.id);
    setShowForm(true);
  }

  function toggleExpand(id: string) {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id); else newExpanded.add(id);
    setExpandedIds(newExpanded);
  }

  const filtered = objectives.filter(o => (o.title.toLowerCase().includes(searchTerm.toLowerCase()) || o.description.toLowerCase().includes(searchTerm.toLowerCase())) && (!domainFilter || o.domain === domainFilter));
  const roots = filtered.filter(o => !o.parent_id);

  function renderTree(obj: Objective, depth = 0) {
    const children = filtered.filter(o => o.parent_id === obj.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(obj.id);

    return (
      <div key={obj.id} className="border-b border-slate-200">
        <div className="flex items-center justify-between p-4 hover:bg-slate-50" style={{ paddingLeft: `${depth * 2 + 1}rem` }}>
          <div className="flex items-center gap-3 flex-1">
            {hasChildren && <button onClick={() => toggleExpand(obj.id)} className="text-slate-400">{isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</button>}
            {!hasChildren && <div className="w-5" />}
            <GitBranch size={16} className="text-slate-400" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-900">{obj.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${obj.domain === 'Communication' ? 'bg-blue-100 text-blue-700' : obj.domain === 'Dissemination' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{obj.domain}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{obj.level}</span>
              </div>
              {obj.description && <p className="text-sm text-slate-600">{obj.description}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => startEdit(obj)} className="text-blue-600"><Edit size={18} /></button>
            <button onClick={() => handleDelete(obj.id)} className="text-red-600"><Trash2 size={18} /></button>
          </div>
        </div>
        {isExpanded && hasChildren && <div>{children.map(c => renderTree(c, depth + 1))}</div>}
      </div>
    );
  }

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CDE Strategy Builder</h1>
          <p className="text-slate-600 mt-1">Define objectives</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Plus size={20} />New</button>
      </div>

      <FilterPanel onClear={() => { setDomainFilter(''); }}>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Domain</label>
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md">
            <option value="">All</option>
            <option value="Communication">Communication</option>
            <option value="Dissemination">Dissemination</option>
            <option value="Exploitation">Exploitation</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">Search</label>
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>
      </FilterPanel>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-900">Objectives Tree</h2></div>
        {filtered.length === 0 ? <div className="p-6 text-center text-slate-600">No objectives</div> : <div>{roots.map(o => renderTree(o, 0))}</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Objective</h3></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Domain</label><select required value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="Communication">Communication</option><option value="Dissemination">Dissemination</option><option value="Exploitation">Exploitation</option></select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Level</label><select required value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="general">General</option><option value="specific">Specific</option><option value="operational">Operational</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Parent</label><select value={formData.parent_id} onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="">None</option>{objectives.filter(o => o.id !== editingId).map(o => <option key={o.id} value={o.id}>{o.title}</option>)}</select></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">SMART Specific</label><textarea value={formData.smart_specific} onChange={(e) => setFormData({ ...formData, smart_specific: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">SMART Measurable</label><textarea value={formData.smart_measurable} onChange={(e) => setFormData({ ...formData, smart_measurable: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Risks</label><textarea value={formData.risks} onChange={(e) => setFormData({ ...formData, risks: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Assumptions</label><textarea value={formData.assumptions} onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>
                {editingId && <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Change Rationale</label><textarea required value={changeRationale} onChange={(e) => setChangeRationale(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-md" /></div>}
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
