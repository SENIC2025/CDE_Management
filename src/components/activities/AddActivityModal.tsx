import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Target, Radio, Users } from 'lucide-react';

interface AddActivityModalProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddActivityModal({ projectId, onClose, onCreated }: AddActivityModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('Communication');
  const [status, setStatus] = useState('planned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetEstimate, setBudgetEstimate] = useState('');
  const [effortHours, setEffortHours] = useState('');
  const [expectedOutputs, setExpectedOutputs] = useState('');

  // Linked entities
  const [linkedObjectiveIds, setLinkedObjectiveIds] = useState<string[]>([]);
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const [stakeholderGroupIds, setStakeholderGroupIds] = useState<string[]>([]);

  // Available entities for linking
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('activities').insert({
        project_id: projectId,
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
      });
      if (insertError) throw insertError;
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('[AddActivity] Error:', err);
      setError(err.message || 'Failed to create activity');
    } finally {
      setSaving(false);
    }
  }

  function toggleId(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">New Activity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Workshop on project results"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Domain & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
              <select
                required
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
              placeholder="Describe the activity, its purpose, and approach..."
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
                placeholder="0.00"
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
                placeholder="0"
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
              placeholder="What deliverables or outcomes will this activity produce?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Link to Objectives */}
          {objectives.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                Link to Objectives
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
                    {ch.name} <span className="text-gray-400">({ch.type})</span>
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

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Activity'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
