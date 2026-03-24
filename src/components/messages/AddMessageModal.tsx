import { useState, useEffect } from 'react';
import { X, MessageSquare, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddMessageModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DOMAIN_OPTIONS = [
  { value: 'communication', label: 'Communication', description: 'Raising awareness and visibility' },
  { value: 'dissemination', label: 'Dissemination', description: 'Sharing results with target audiences' },
  { value: 'exploitation', label: 'Exploitation', description: 'Ensuring uptake and real-world impact' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
];

const AUDIENCE_SUGGESTIONS = [
  'General Public',
  'Policy Makers',
  'Industry Partners',
  'Academic Community',
  'End Users',
  'Media & Press',
  'Project Consortium',
  'Funding Agency',
  'Civil Society Organisations',
  'Local Communities',
];

interface ProjectObjectiveOption {
  id: string;
  title: string;
  domain: string;
}

export default function AddMessageModal({ projectId, onClose, onSuccess }: AddMessageModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [domain, setDomain] = useState('communication');
  const [status, setStatus] = useState('draft');
  const [audience, setAudience] = useState('');
  const [customAudience, setCustomAudience] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);

  // Available objectives for linking
  const [objectives, setObjectives] = useState<ProjectObjectiveOption[]>([]);
  const [objectivesLoading, setObjectivesLoading] = useState(false);

  useEffect(() => {
    loadObjectives();
  }, []);

  const loadObjectives = async () => {
    try {
      setObjectivesLoading(true);
      const { data, error: queryError } = await supabase
        .from('project_objectives')
        .select('id, title, domain')
        .eq('project_id', projectId)
        .order('title');

      if (!queryError && data) {
        setObjectives(data);
      }
    } catch (err) {
      console.error('[AddMessage] Error loading objectives:', err);
    } finally {
      setObjectivesLoading(false);
    }
  };

  const toggleObjective = (id: string) => {
    setSelectedObjectiveIds(prev =>
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const getAudienceValue = (): string | null => {
    if (audience === '__custom__') return customAudience.trim() || null;
    return audience || null;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          project_id: projectId,
          title: title.trim(),
          body: body.trim() || null,
          value_proposition: valueProposition.trim() || null,
          domain,
          status,
          audience: getAudienceValue(),
          linked_objective_ids: selectedObjectiveIds,
          expires_at: expiresAt || null,
        });

      if (insertError) {
        console.error('[AddMessage] Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create message');
      }

      onSuccess();
    } catch (err: any) {
      console.error('[AddMessage] Create error:', err);
      setError(err?.message || 'Failed to create message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">New Message</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., "Project X delivers breakthrough in renewable energy storage"'
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Value Proposition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value Proposition
            </label>
            <p className="text-xs text-gray-500 mb-2">
              The core value statement — what makes this message compelling?
            </p>
            <textarea
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              placeholder="e.g., Our solution reduces energy costs by 40% while being fully sustainable..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Full message text..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Domain, Status, Expiry */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {DOMAIN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {DOMAIN_OPTIONS.find(o => o.value === domain)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expires (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {AUDIENCE_SUGGESTIONS.map((aud) => {
                const isSelected = audience === aud;
                return (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => setAudience(isSelected ? '' : aud)}
                    className={`flex items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mr-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span>{aud}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAudience(audience === '__custom__' ? '' : '__custom__')}
                className={`flex items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  audience === '__custom__'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mr-2 flex-shrink-0 flex items-center justify-center ${
                  audience === '__custom__' ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {audience === '__custom__' && <Check className="w-3 h-3 text-white" />}
                </div>
                <span>Other (specify)</span>
              </button>
            </div>
            {audience === '__custom__' && (
              <input
                type="text"
                value={customAudience}
                onChange={(e) => setCustomAudience(e.target.value)}
                placeholder="Describe your target audience..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>

          {/* Link to Objectives */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Objectives
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Connect this message to one or more project objectives
            </p>
            {objectivesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : objectives.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                No objectives created yet. Create objectives first to link them here.
              </div>
            ) : (
              <div className="grid gap-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-3">
                {objectives.map((obj) => {
                  const isSelected = selectedObjectiveIds.includes(obj.id);
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => toggleObjective(obj.id)}
                      className={`flex items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border mr-2 flex-shrink-0 flex items-center justify-center ${
                        isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="flex-1">{obj.title}</span>
                      {obj.domain && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize ml-2">
                          {obj.domain}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedObjectiveIds.length > 0 && (
              <p className="text-xs text-purple-600 mt-1">
                {selectedObjectiveIds.length} objective{selectedObjectiveIds.length > 1 ? 's' : ''} linked
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>Create Message</span>
          </button>
        </div>
      </div>
    </div>
  );
}
