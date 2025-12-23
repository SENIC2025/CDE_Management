import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Edit, Trash2, Radio } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ChannelEffectiveness from '../components/ChannelEffectiveness';

export default function Channels() {
  const { currentProject } = useProject();
  const [channels, setChannels] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [channelData, setChannelData] = useState({ type: 'website', name: '', description: '', audience_fit_score: 5, cost_notes: '' });
  const [campaignData, setCampaignData] = useState({ name: '', description: '', start_date: '', end_date: '' });

  useEffect(() => { if (currentProject) { loadChannels(); loadCampaigns(); loadPublications(); } }, [currentProject]);

  async function loadChannels() {
    const { data } = await supabase.from('channels').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setChannels(data || []);
  }

  async function loadCampaigns() {
    const { data } = await supabase.from('campaigns').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setCampaigns(data || []);
  }

  async function loadPublications() {
    const { data } = await supabase.from('publication_items').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setPublications(data || []);
  }

  async function handleChannelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) await supabase.from('channels').update(channelData).eq('id', editingId);
    else await supabase.from('channels').insert({ ...channelData, project_id: currentProject!.id });
    setChannelData({ type: 'website', name: '', description: '', audience_fit_score: 5, cost_notes: '' });
    setEditingId(null);
    setShowChannelForm(false);
    loadChannels();
  }

  async function handleCampaignSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('campaigns').insert({ ...campaignData, project_id: currentProject!.id });
    setCampaignData({ name: '', description: '', start_date: '', end_date: '' });
    setShowCampaignForm(false);
    loadCampaigns();
  }

  async function handleDelete(id: string, type: 'channel' | 'campaign') {
    if (confirm(`Delete ${type}?`)) {
      await supabase.from(type === 'channel' ? 'channels' : 'campaigns').delete().eq('id', id);
      if (type === 'channel') loadChannels(); else loadCampaigns();
    }
  }

  const filtered = channels.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Channels & Publishing</h1><p className="text-slate-600 mt-1">Manage channels and campaigns</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowChannelForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Plus size={20} />Channel</button>
          <button onClick={() => setShowCampaignForm(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"><Plus size={20} />Campaign</button>
        </div>
      </div>

      <ChannelEffectiveness />

      <div className="bg-slate-50 border rounded p-4"><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Channels</h2></div>
          {filtered.length === 0 ? <div className="p-6 text-center text-slate-600">No channels</div> : (
            <div className="divide-y">
              {filtered.map(ch => (
                <div key={ch.id} className="p-4 hover:bg-slate-50 flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <Radio size={18} className="text-slate-400 mt-1" />
                    <div>
                      <div className="font-semibold text-slate-900">{ch.name}</div>
                      <div className="text-xs text-slate-500">{ch.type} • Fit: {ch.audience_fit_score}/10</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setChannelData({ type: ch.type, name: ch.name, description: ch.description, audience_fit_score: ch.audience_fit_score, cost_notes: ch.cost_notes }); setEditingId(ch.id); setShowChannelForm(true); }} className="text-blue-600"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(ch.id, 'channel')} className="text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Campaigns</h2></div>
          {campaigns.length === 0 ? <div className="p-6 text-center text-slate-600">No campaigns</div> : (
            <div className="divide-y">
              {campaigns.map(camp => (
                <div key={camp.id} className="p-4 hover:bg-slate-50 flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-slate-900">{camp.name}</div>
                    <div className="text-xs text-slate-500">{camp.start_date} to {camp.end_date}</div>
                  </div>
                  <button onClick={() => handleDelete(camp.id, 'campaign')} className="text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showChannelForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Channel</h3></div>
            <form onSubmit={handleChannelSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Type</label><select required value={channelData.type} onChange={(e) => setChannelData({ ...channelData, type: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="website">Website</option><option value="social">Social Media</option><option value="newsletter">Newsletter</option><option value="event">Event</option><option value="press">Press</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Audience Fit (1-10)</label><input type="number" min="1" max="10" required value={channelData.audience_fit_score} onChange={(e) => setChannelData({ ...channelData, audience_fit_score: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Name</label><input type="text" required value={channelData.name} onChange={(e) => setChannelData({ ...channelData, name: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={channelData.description} onChange={(e) => setChannelData({ ...channelData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Cost Notes</label><textarea value={channelData.cost_notes} onChange={(e) => setChannelData({ ...channelData, cost_notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowChannelForm(false); setEditingId(null); }} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCampaignForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">New Campaign</h3></div>
            <form onSubmit={handleCampaignSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Name</label><input type="text" required value={campaignData.name} onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={campaignData.description} onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={campaignData.start_date} onChange={(e) => setCampaignData({ ...campaignData, start_date: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={campaignData.end_date} onChange={(e) => setCampaignData({ ...campaignData, end_date: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Create</button>
                <button type="button" onClick={() => setShowCampaignForm(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
