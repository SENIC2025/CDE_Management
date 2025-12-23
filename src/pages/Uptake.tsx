import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Edit, Trash2, Target, FileText } from 'lucide-react';
import SearchBar from '../components/SearchBar';

export default function Uptake() {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<'opportunities' | 'agreements'>('opportunities');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [opportunityData, setOpportunityData] = useState({ title: '', description: '', target_sector: '', stage: 'identified', potential_value: '', notes: '' });
  const [agreementData, setAgreementData] = useState({ opportunity_id: '', asset_id: '', agreement_type: 'license', signed_date: '', terms_summary: '', file_path: '' });

  useEffect(() => { if (currentProject) { loadOpportunities(); loadAgreements(); loadAssets(); } }, [currentProject]);

  async function loadOpportunities() {
    const { data } = await supabase.from('uptake_opportunities').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setOpportunities(data || []);
  }

  async function loadAgreements() {
    const { data } = await supabase.from('agreement_records').select('*, uptake_opportunities(title), result_assets(title)').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setAgreements(data || []);
  }

  async function loadAssets() {
    const { data } = await supabase.from('result_assets').select('id, title').eq('project_id', currentProject!.id);
    setAssets(data || []);
  }

  async function handleOpportunitySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) await supabase.from('uptake_opportunities').update(opportunityData).eq('id', editingId);
    else await supabase.from('uptake_opportunities').insert({ ...opportunityData, project_id: currentProject!.id });
    setOpportunityData({ title: '', description: '', target_sector: '', stage: 'identified', potential_value: '', notes: '' });
    setEditingId(null);
    setShowOpportunityForm(false);
    loadOpportunities();
  }

  async function handleAgreementSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('agreement_records').insert({ ...agreementData, project_id: currentProject!.id });
    setAgreementData({ opportunity_id: '', asset_id: '', agreement_type: 'license', signed_date: '', terms_summary: '', file_path: '' });
    setShowAgreementForm(false);
    loadAgreements();
  }

  async function handleDelete(id: string, type: 'opportunity' | 'agreement') {
    if (confirm(`Delete ${type}?`)) {
      await supabase.from(type === 'opportunity' ? 'uptake_opportunities' : 'agreement_records').delete().eq('id', id);
      if (type === 'opportunity') loadOpportunities();
      else loadAgreements();
    }
  }

  async function updateStage(id: string, newStage: string) {
    await supabase.from('uptake_opportunities').update({ stage: newStage }).eq('id', id);
    loadOpportunities();
  }

  const filteredOpportunities = opportunities.filter(o =>
    o.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!stageFilter || o.stage === stageFilter)
  );
  const filteredAgreements = agreements.filter(a =>
    (a.uptake_opportunities?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stages = ['identified', 'engaged', 'negotiating', 'agreed', 'implemented', 'closed'];
  const stageColors: Record<string, string> = {
    identified: 'bg-slate-100 text-slate-700',
    engaged: 'bg-blue-100 text-blue-700',
    negotiating: 'bg-yellow-100 text-yellow-700',
    agreed: 'bg-green-100 text-green-700',
    implemented: 'bg-teal-100 text-teal-700',
    closed: 'bg-slate-200 text-slate-600',
  };

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Exploitation & Uptake Pipeline</h1><p className="text-slate-600 mt-1">Track uptake opportunities and agreements</p></div>
        <button onClick={() => activeTab === 'opportunities' ? setShowOpportunityForm(true) : setShowAgreementForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Plus size={20} />New</button>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab('opportunities')} className={`px-4 py-2 font-medium ${activeTab === 'opportunities' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Opportunities</button>
        <button onClick={() => setActiveTab('agreements')} className={`px-4 py-2 font-medium ${activeTab === 'agreements' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Agreements</button>
      </div>

      <div className="bg-slate-50 border rounded p-4 grid grid-cols-4 gap-3">
        {activeTab === 'opportunities' && (
          <div><label className="block text-xs font-medium mb-1">Stage</label><select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="w-full px-3 py-2 text-sm border rounded"><option value="">All Stages</option>{stages.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
        )}
        <div className={activeTab === 'opportunities' ? 'col-span-3' : 'col-span-4'}><label className="block text-xs font-medium mb-1">Search</label><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>
      </div>

      {activeTab === 'opportunities' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Uptake Opportunities</h2></div>
          {filteredOpportunities.length === 0 ? <div className="p-6 text-center text-slate-600">No opportunities</div> : (
            <div className="divide-y">
              {filteredOpportunities.map(opp => (
                <div key={opp.id} className="p-6 hover:bg-slate-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Target size={20} className="text-slate-400 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{opp.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${stageColors[opp.stage]}`}>{opp.stage}</span>
                        </div>
                        {opp.description && <p className="text-sm text-slate-600">{opp.description}</p>}
                        <p className="text-xs text-slate-500 mt-1">Sector: {opp.target_sector} | Value: {opp.potential_value}</p>
                        {opp.notes && <p className="text-xs text-slate-600 mt-1">{opp.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setOpportunityData({ title: opp.title, description: opp.description, target_sector: opp.target_sector, stage: opp.stage, potential_value: opp.potential_value, notes: opp.notes }); setEditingId(opp.id); setShowOpportunityForm(true); }} className="text-blue-600"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(opp.id, 'opportunity')} className="text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <label className="text-xs text-slate-600">Move to:</label>
                    {stages.filter(s => s !== opp.stage).map(stage => (
                      <button key={stage} onClick={() => updateStage(opp.id, stage)} className={`text-xs px-2 py-1 rounded ${stageColors[stage]} hover:opacity-80`}>{stage}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'agreements' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Agreement Records</h2></div>
          {filteredAgreements.length === 0 ? <div className="p-6 text-center text-slate-600">No agreements</div> : (
            <div className="divide-y">
              {filteredAgreements.map(agr => (
                <div key={agr.id} className="p-6 hover:bg-slate-50 flex justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText size={20} className="text-slate-400 mt-1" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{agr.uptake_opportunities?.title || 'N/A'}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">{agr.agreement_type}</span>
                      </div>
                      <p className="text-sm text-slate-600">Asset: {agr.result_assets?.title || 'N/A'}</p>
                      {agr.signed_date && <p className="text-xs text-slate-500 mt-1">Signed: {agr.signed_date}</p>}
                      {agr.terms_summary && <p className="text-sm text-slate-600 mt-1">{agr.terms_summary}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(agr.id, 'agreement')} className="text-red-600"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showOpportunityForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Opportunity</h3></div>
            <form onSubmit={handleOpportunitySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={opportunityData.title} onChange={(e) => setOpportunityData({ ...opportunityData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={opportunityData.description} onChange={(e) => setOpportunityData({ ...opportunityData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Target Sector</label><input type="text" value={opportunityData.target_sector} onChange={(e) => setOpportunityData({ ...opportunityData, target_sector: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Stage</label><select required value={opportunityData.stage} onChange={(e) => setOpportunityData({ ...opportunityData, stage: e.target.value })} className="w-full px-3 py-2 border rounded">{stages.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Potential Value</label><input type="text" value={opportunityData.potential_value} onChange={(e) => setOpportunityData({ ...opportunityData, potential_value: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Notes</label><textarea value={opportunityData.notes} onChange={(e) => setOpportunityData({ ...opportunityData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowOpportunityForm(false); setEditingId(null); }} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAgreementForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">New Agreement</h3></div>
            <form onSubmit={handleAgreementSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Opportunity</label><select required value={agreementData.opportunity_id} onChange={(e) => setAgreementData({ ...agreementData, opportunity_id: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="">Select opportunity</option>{opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Asset</label><select required value={agreementData.asset_id} onChange={(e) => setAgreementData({ ...agreementData, asset_id: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="">Select asset</option>{assets.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Type</label><select required value={agreementData.agreement_type} onChange={(e) => setAgreementData({ ...agreementData, agreement_type: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="license">License</option><option value="mou">MOU</option><option value="contract">Contract</option><option value="partnership">Partnership</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Signed Date</label><input type="date" value={agreementData.signed_date} onChange={(e) => setAgreementData({ ...agreementData, signed_date: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Terms Summary</label><textarea value={agreementData.terms_summary} onChange={(e) => setAgreementData({ ...agreementData, terms_summary: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">File Path</label><input type="text" value={agreementData.file_path} onChange={(e) => setAgreementData({ ...agreementData, file_path: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="Path to agreement document" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowAgreementForm(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
