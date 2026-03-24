import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Check, Loader2, AlertCircle, Target, Radio } from 'lucide-react';
import type { Campaign } from './CampaignCard';

interface CampaignEditPanelProps {
  projectId: string;
  campaign: Campaign;
  onClose: () => void;
  onUpdate: () => void;
  deepLinkActions?: React.ReactNode;
}

export default function CampaignEditPanel({ projectId, campaign, onClose, onUpdate, deepLinkActions }: CampaignEditPanelProps) {
  const [name, setName] = useState(campaign.name || '');
  const [description, setDescription] = useState(campaign.description || '');
  const [domain, setDomain] = useState(campaign.domain || 'Communication');
  const [status, setStatus] = useState(campaign.status || 'draft');
  const [startDate, setStartDate] = useState(campaign.start_date || '');
  const [endDate, setEndDate] = useState(campaign.end_date || '');
  const [budget, setBudget] = useState(String(campaign.budget || ''));
  const [responsiblePerson, setResponsiblePerson] = useState(campaign.responsible_person || '');
  const [linkedObjectiveIds, setLinkedObjectiveIds] = useState<string[]>(campaign.linked_objective_ids || []);
  const [linkedChannelIds, setLinkedChannelIds] = useState<string[]>(campaign.linked_channel_ids || []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Linkable entities
  const [objectives, setObjectives] = useState<{ id: string; title: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string; type: string }[]>([]);

  useEffect(() => {
    loadLinkableEntities();
  }, []);

  async function loadLinkableEntities() {
    const [objRes, chRes] = await Promise.all([
      supabase.from('project_objectives').select('id, title').eq('project_id', projectId).order('title'),
      supabase.from('channels').select('id, name, type').eq('project_id', projectId).order('name'),
    ]);
    setObjectives(objRes.data || []);
    setChannels(chRes.data || []);
  }

  const saveChanges = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          domain,
          status,
          start_date: startDate || null,
          end_date: endDate || null,
          budget: budget ? parseFloat(budget) : null,
          responsible_person: responsiblePerson.trim() || null,
          linked_objective_ids: linkedObjectiveIds,
          linked_channel_ids: linkedChannelIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);
      if (error) throw error;
      setSaveStatus('saved');
      onUpdate();
    } catch (err) {
      console.error('[CampaignEditPanel] Save error:', err);
      setSaveStatus('error');
    }
  }, [name, description, domain, status, startDate, endDate, budget, responsiblePerson, linkedObjectiveIds, linkedChannelIds]);

  // Auto-save with debounce
  useEffect(() => {
    const hasChanges =
      name !== (campaign.name || '') ||
      description !== (campaign.description || '') ||
      domain !== (campaign.domain || 'Communication') ||
      status !== (campaign.status || 'draft') ||
      startDate !== (campaign.start_date || '') ||
      endDate !== (campaign.end_date || '') ||
      budget !== String(campaign.budget || '') ||
      responsiblePerson !== (campaign.responsible_person || '') ||
      JSON.stringify(linkedObjectiveIds) !== JSON.stringify(campaign.linked_objective_ids || []) ||
      JSON.stringify(linkedChannelIds) !== JSON.stringify(campaign.linked_channel_ids || []);

    if (!hasChanges) return;

    const timer = setTimeout(saveChanges, 1500);
    return () => clearTimeout(timer);
  }, [name, description, domain, status, startDate, endDate, budget, responsiblePerson, linkedObjectiveIds, linkedChannelIds, saveChanges]);

  function toggleId(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-gray-900/30" onClick={onClose} />
      <div className="w-[520px] bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Campaign</h3>
              {deepLinkActions && <div className="mt-1">{deepLinkActions}</div>}
            </div>
            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-4 h-4 text-emerald-500" />}
            {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Domain & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Communication">Communication</option>
                <option value="Dissemination">Dissemination</option>
                <option value="Exploitation">Exploitation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Campaign goals and approach..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Budget & Responsible */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget (EUR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Person</label>
              <input
                type="text"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="e.g., Jane Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Link to Objectives */}
          {objectives.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                Linked Objectives
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
                {objectives.map(obj => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => toggleId(linkedObjectiveIds, setLinkedObjectiveIds, obj.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      linkedObjectiveIds.includes(obj.id)
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-purple-300'
                    }`}
                  >
                    {obj.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Link to Channels */}
          {channels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Radio className="w-4 h-4 inline mr-1" />
                Channels Used
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
                {channels.map(ch => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleId(linkedChannelIds, setLinkedChannelIds, ch.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      linkedChannelIds.includes(ch.id)
                        ? 'bg-cyan-100 border-cyan-300 text-cyan-700'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-cyan-300'
                    }`}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save Status */}
          <div className="text-xs text-gray-400 pt-2">
            {saveStatus === 'saving' && 'Saving changes...'}
            {saveStatus === 'saved' && 'All changes saved'}
            {saveStatus === 'error' && <span className="text-red-500">Failed to save — changes will retry</span>}
            {saveStatus === 'idle' && 'Changes auto-save'}
          </div>
        </div>
      </div>
    </div>
  );
}
