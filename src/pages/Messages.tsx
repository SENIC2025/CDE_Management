import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Edit, Trash2 } from 'lucide-react';
import SearchBar from '../components/SearchBar';

export default function Messages() {
  const { currentProject } = useProject();
  const [messages, setMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ domain: 'Communication', audience_tag: '', title: '', body: '', status: 'draft', expires_at: '' });

  useEffect(() => {
    if (currentProject) loadMessages();
  }, [currentProject]);

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setMessages(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) await supabase.from('messages').update(formData).eq('id', editingId);
    else await supabase.from('messages').insert({ ...formData, project_id: currentProject!.id });
    resetForm();
    loadMessages();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete message?')) {
      await supabase.from('messages').delete().eq('id', id);
      loadMessages();
    }
  }

  function resetForm() {
    setFormData({ domain: 'Communication', audience_tag: '', title: '', body: '', status: 'draft', expires_at: '' });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(msg: any) {
    setFormData({ domain: msg.domain, audience_tag: msg.audience_tag, title: msg.title, body: msg.body, status: msg.status, expires_at: msg.expires_at || '' });
    setEditingId(msg.id);
    setShowForm(true);
  }

  const filtered = messages.filter(m => (m.title.toLowerCase().includes(searchTerm.toLowerCase())) && (!domainFilter || m.domain === domainFilter));

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Messages</h1><p className="text-slate-600 mt-1">Messaging library</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Plus size={20} />New</button>
      </div>

      <div className="bg-slate-50 border rounded p-4 grid grid-cols-3 gap-3">
        <div><label className="block text-xs font-medium mb-1">Domain</label><select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="w-full px-3 py-2 text-sm border rounded"><option value="">All</option><option value="Communication">Communication</option><option value="Dissemination">Dissemination</option><option value="Exploitation">Exploitation</option></select></div>
        <div className="col-span-2"><label className="block text-xs font-medium mb-1">Search</label><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b"><h2 className="text-lg font-semibold">Messages</h2></div>
        {filtered.length === 0 ? <div className="p-6 text-center text-slate-600">No messages</div> : (
          <div className="divide-y">
            {filtered.map(msg => (
              <div key={msg.id} className="p-6 hover:bg-slate-50 flex justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{msg.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{msg.domain}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{msg.status}</span>
                  </div>
                  {msg.body && <p className="text-sm text-slate-600">{msg.body.substring(0, 150)}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(msg)} className="text-blue-600"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(msg.id)} className="text-red-600"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Message</h3></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Domain</label><select required value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="Communication">Communication</option><option value="Dissemination">Dissemination</option><option value="Exploitation">Exploitation</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Status</label><select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="draft">Draft</option><option value="review">Review</option><option value="approved">Approved</option><option value="published">Published</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Body</label><textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded" /></div>
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
