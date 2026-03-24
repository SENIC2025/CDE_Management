import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Check, Loader2, AlertCircle, Target, Radio, Users } from 'lucide-react';
import type { Activity } from './ActivityCard';

interface ActivityEditPanelProps {
  projectId: string;
  activity: Activity;
  onClose: () => void;
  onUpdate: () => void;
  deepLinkActions?: React.ReactNode;
}

export default function ActivityEditPanel({ projectId, activity, onClose, onUpdate, deepLinkActions }: ActivityEditPanelProps) {
  const [title, setTitle] = useState(activity.title || '');
  const [description, setDescription] = useState(activity.description || '');
  const [domain, setDomain] = useState(activity.domain || 'Communication');
  const [status, setStatus] = useState(activity.status || 'planned');
  const [startDate, setStartDate] = useState(activity.start_date || '');
  const [endDate, setEndDate] = useState(activity.end_date || '');
  const [budgetEstimate, setBudgetEstimate] = useState(String(activity.budget_estimate || ''));
  const [effortHours, setEffortHours] = useState(String(activity.effort_hours || ''));
  const [expectedOutputs, setExpectedOutputs] = useState(activity.expected_outputs || '');
  const [linkedObjectiveIds, setLinkedObjectiveIds] = useState<string[]>(activity.linked_objective_ids || []);
  const [channelIds, setChannelIds] = useState<string[]>(activity.channel_ids || []);
  const [stakeholderGroupIds, setStakeholderGroupIds] = useState<string[]>(activity.stakeholder_group_ids || []);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Linkable entities
  const [objectives, setObjectives] = useState<{ id: string; title: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string; type: string }[]>([]);
  const [stakeholderGroups, setStakeholderGroups] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadLinkableEntities();
  }, []);

  async function loadLinkableEntities() {
    const [objRes, chRes, sgRes] = await Promise.all([
      supabase.from('project_objectives').select('id, title').eq('project_id', projectId).order('title'),
      supabase.from('channels').select('id, name, type').eq('project_id', projectId).order('name'),
      supabase.from('stakeholder_groups').select('id, name').eq('project_id', projectId).order('name'),
    ]);
    setObjectives(objRes.data || []);
    setChannels(chRes.data || []);
    setStakeholderGroups(sgRes.data || []);
  }

  const saveChanges = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          domain,
          status,
          start_date: startDate || null,
          end_date: endDate || null,
          budget_estimate: budgetEstimate ? parseFloat(budgetEstimate) : 0,
          effort_hours: effortHours ? parseFloat(effortHours) : 0,
          expected_outputs: expectedOutputs.trim() || null,
          linked_objective_ids: linkedObjectiveIds,
          channel_ids: channelIds,
          stakeholder_group_ids: stakeholderGroupIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activity.id);
      if (error) throw error;
      setSaveStatus('saved');
      onUpdate();
    } catch (err) {
      console.error('[ActivityEditPanel] Save error:', err);
      setSaveStatus('error');
    }
  }, [title, description, domain, status, startDate, endDate, budgetEstimate, effortHours, expectedOutputs, linkedObjectiveIds, channelIds, stakeholderGroupIds]);

  // Auto-save with debounce
  useEffect(() => {
    const hasChanges =
      title !== (activity.title || '') ||
      description !== (activity.description || '') ||
      domain !== (activity.domain || 'Communication') ||
      status !== (activity.status || 'planned') ||
      startDate !== (activity.start_date || '') ||
      endDate !== (activity.end_date || '') ||
      budgetEstimate !== String(activity.budget_estimate || '') ||
      effortHours !== String(activity.effort_hours || '') ||
      expectedOutputs !== (activity.expected_outputs || '') ||
      JSON.stringify(linkedObjectiveIds) !== JSON.stringify(activity.linked_objective_ids || []) ||
      JSON.stringify(channelIds) !== JSON.stringify(activity.channel_ids || []) ||
      JSON.stringify(stakeholderGroupIds) !== JSON.stringify(activity.stakeholder_group_ids || []);

    if (!hasChanges) return;

    const timer = setTimeout(saveChanges, 1500);
    return () => clearTimeout(timer);
  }, [title, description, domain, status, startDate, endDate, budgetEstimate, effortHours, expectedOutputs, linkedObjectiveIds, channelIds, stakeholderGroupIds, saveChanges]);

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
              <h3 className="text-lg font-semibold text-gray-900">Edit Activity</h3>
              {deepLinkActions && <div className="mt-1">{deepLinkActions}</div>}
            </div>
            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-4 h-4 text-emerald-500" />}
            {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Domain & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Budget & Effort */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Estimate (EUR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budgetEstimate}
                onChange={(e) => setBudgetEstimate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effort Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={effortHours}
                onChange={(e) => setEffortHours(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Expected Outputs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Outputs</label>
            <textarea
              value={expectedOutputs}
              onChange={(e) => setExpectedOutputs(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                    onClick={() => toggleId(channelIds, setChannelIds, ch.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      channelIds.includes(ch.id)
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

          {/* Link to Stakeholder Groups */}
          {stakeholderGroups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Target Stakeholder Groups
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
                {stakeholderGroups.map(sg => (
                  <button
                    key={sg.id}
                    type="button"
                    onClick={() => toggleId(stakeholderGroupIds, setStakeholderGroupIds, sg.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      stakeholderGroupIds.includes(sg.id)
                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-amber-300'
                    }`}
                  >
                    {sg.name}
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
