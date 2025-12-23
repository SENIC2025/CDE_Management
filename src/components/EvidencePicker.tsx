import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, X, FileText, Link as LinkIcon } from 'lucide-react';

interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  evidence_date: string;
  file_url: string;
  source_url: string;
}

interface EvidencePickerProps {
  linkedEvidenceIds: string[];
  onLink: (evidenceId: string) => void;
  onUnlink: (evidenceId: string) => void;
  entityType: 'activity' | 'indicator' | 'asset' | 'publication';
  entityId: string;
}

export default function EvidencePicker({
  linkedEvidenceIds,
  onLink,
  onUnlink,
  entityType,
  entityId,
}: EvidencePickerProps) {
  const { currentProject } = useProject();
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    type: 'screenshot',
    title: '',
    description: '',
    source_url: '',
    evidence_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (currentProject) {
      loadEvidence();
    }
  }, [currentProject]);

  async function loadEvidence() {
    const { data } = await supabase
      .from('evidence_items')
      .select('*')
      .eq('project_id', currentProject!.id)
      .order('evidence_date', { ascending: false });

    setEvidence(data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from('evidence_items')
      .insert({
        ...formData,
        project_id: currentProject!.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating evidence:', error);
      return;
    }

    await linkEvidence(data.id);
    setShowCreate(false);
    setFormData({
      type: 'screenshot',
      title: '',
      description: '',
      source_url: '',
      evidence_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    loadEvidence();
  }

  async function linkEvidence(evidenceId: string) {
    const linkData: any = {
      evidence_item_id: evidenceId,
      [`${entityType}_id`]: entityId,
    };

    await supabase.from('evidence_links').insert(linkData);
    onLink(evidenceId);
  }

  async function unlinkEvidence(evidenceId: string) {
    await supabase
      .from('evidence_links')
      .delete()
      .eq('evidence_item_id', evidenceId)
      .eq(`${entityType}_id`, entityId);

    onUnlink(evidenceId);
  }

  const linkedEvidence = evidence.filter(e => linkedEvidenceIds.includes(e.id));
  const availableEvidence = evidence.filter(e => !linkedEvidenceIds.includes(e.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">Evidence</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Create & Link
          </button>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 text-sm bg-slate-600 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 transition"
          >
            <LinkIcon size={16} />
            Link Existing
          </button>
        </div>
      </div>

      {linkedEvidence.length === 0 ? (
        <div className="text-sm text-slate-500 bg-slate-50 rounded p-4 text-center">
          No evidence linked yet
        </div>
      ) : (
        <div className="space-y-2">
          {linkedEvidence.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-slate-400" />
                <div>
                  <div className="font-medium text-sm text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-500">
                    {item.type} • {new Date(item.evidence_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => unlinkEvidence(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Link Evidence</h3>
              <button onClick={() => setShowPicker(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {availableEvidence.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No available evidence to link</div>
              ) : (
                <div className="space-y-2">
                  {availableEvidence.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        linkEvidence(item.id);
                        setShowPicker(false);
                      }}
                      className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 p-3 rounded transition text-left"
                    >
                      <FileText size={18} className="text-slate-400" />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500">
                          {item.type} • {new Date(item.evidence_date).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Evidence</h3>
              <button onClick={() => setShowCreate(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="screenshot">Screenshot</option>
                    <option value="pdf">PDF Document</option>
                    <option value="photo">Photo</option>
                    <option value="agenda">Agenda</option>
                    <option value="attendance">Attendance List</option>
                    <option value="analytics">Analytics Export</option>
                    <option value="media">Media Coverage</option>
                    <option value="citation">Citation</option>
                    <option value="agreement">Agreement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.evidence_date}
                    onChange={(e) => setFormData({ ...formData, evidence_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Source URL</label>
                  <input
                    type="url"
                    value={formData.source_url}
                    onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  Create & Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
