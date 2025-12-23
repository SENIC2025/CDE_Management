import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import EvidencePicker from '../components/EvidencePicker';

export default function Assets() {
  const { currentProject } = useProject();
  const [assets, setAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState<string | null>(null);
  const [linkedEvidence, setLinkedEvidence] = useState<string[]>([]);
  const [formData, setFormData] = useState({ type: 'publication', title: '', description: '', maturity_level: 'concept', access_modality: 'open' });

  useEffect(() => { if (currentProject) loadAssets(); }, [currentProject]);

  async function loadAssets() {
    const { data } = await supabase.from('result_assets').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setAssets(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) await supabase.from('result_assets').update(formData).eq('id', editingId);
    else await supabase.from('result_assets').insert({ ...formData, project_id: currentProject!.id });
    resetForm();
    loadAssets();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete asset?')) { await supabase.from('result_assets').delete().eq('id', id); loadAssets(); }
  }

  function resetForm() {
    setFormData({ type: 'publication', title: '', description: '', maturity_level: 'concept', access_modality: 'open' });
    setEditingId(null);
    setShowForm(false);
  }

  async function loadLinkedEvidence(assetId: string) {
    const { data } = await supabase.from('evidence_links').select('evidence_item_id').eq('asset_id', assetId);
    setLinkedEvidence(data?.map(d => d.evidence_item_id) || []);
    setShowEvidence(assetId);
  }

  const filtered = assets.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Results & Exploitable Assets</h1><p className="text-slate-600 mt-1">Manage results registry</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Plus size={20} />New Asset</button>
      </div>

      <div className="bg-slate-50 border rounded p-4"><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b"><h2 className="text-lg font-semibold">Assets</h2></div>
        {filtered.length === 0 ? <div className="p-6 text-center text-slate-600">No assets</div> : (
          <div className="divide-y">
            {filtered.map(asset => (
              <div key={asset.id} className="p-6 hover:bg-slate-50 flex justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Package size={20} className="text-slate-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{asset.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{asset.type}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{asset.maturity_level}</span>
                    </div>
                    {asset.description && <p className="text-sm text-slate-600">{asset.description}</p>}
                    <button onClick={() => loadLinkedEvidence(asset.id)} className="text-xs text-blue-600 hover:text-blue-700 mt-2">View Evidence</button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setFormData({ type: asset.type, title: asset.title, description: asset.description, maturity_level: asset.maturity_level, access_modality: asset.access_modality }); setEditingId(asset.id); setShowForm(true); }} className="text-blue-600"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(asset.id)} className="text-red-600"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Asset</h3></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Type</label><select required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="publication">Publication</option><option value="software">Software</option><option value="dataset">Dataset</option><option value="method">Method</option><option value="training">Training</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Maturity</label><select required value={formData.maturity_level} onChange={(e) => setFormData({ ...formData, maturity_level: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="concept">Concept</option><option value="prototype">Prototype</option><option value="tested">Tested</option><option value="mature">Mature</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Access Modality</label><select value={formData.access_modality} onChange={(e) => setFormData({ ...formData, access_modality: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="open">Open</option><option value="restricted">Restricted</option><option value="commercial">Commercial</option></select></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEvidence && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Evidence for Asset</h3>
              <button onClick={() => setShowEvidence(null)} className="text-slate-400 hover:text-slate-600">Close</button>
            </div>
            <div className="p-6">
              <EvidencePicker linkedEvidenceIds={linkedEvidence} onLink={(id) => setLinkedEvidence([...linkedEvidence, id])} onUnlink={(id) => setLinkedEvidence(linkedEvidence.filter(e => e !== id))} entityType="asset" entityId={showEvidence} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
