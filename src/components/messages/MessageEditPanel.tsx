import { useState, useCallback, useEffect } from 'react';
import { X, Save, Check, AlertCircle, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { type Message } from './MessageCard';

interface MessageEditPanelProps {
  projectId: string;
  message: Message;
  onClose: () => void;
  onUpdate: () => void;
  deepLinkActions?: React.ReactNode;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

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

export default function MessageEditPanel({ projectId, message, onClose, onUpdate, deepLinkActions }: MessageEditPanelProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [title, setTitle] = useState(message.title || '');
  const [body, setBody] = useState(message.body || '');
  const [valueProposition, setValueProposition] = useState(message.value_proposition || '');
  const [domain, setDomain] = useState(message.domain || 'communication');
  const [status, setStatus] = useState(message.status || 'draft');
  const [expiresAt, setExpiresAt] = useState(message.expires_at ? message.expires_at.split('T')[0] : '');
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>(message.linked_objective_ids || []);

  // Audience: check if it's a preset or custom
  const initialAudience = message.audience || '';
  const isPreset = AUDIENCE_SUGGESTIONS.includes(initialAudience);
  const [audience, setAudience] = useState(isPreset ? initialAudience : (initialAudience ? '__custom__' : ''));
  const [customAudience, setCustomAudience] = useState(isPreset ? '' : initialAudience);

  // Available objectives
  const [objectives, setObjectives] = useState<ProjectObjectiveOption[]>([]);

  useEffect(() => {
    loadObjectives();
  }, []);

  const loadObjectives = async () => {
    const { data } = await supabase
      .from('project_objectives')
      .select('id, title, domain')
      .eq('project_id', projectId)
      .order('title');
    if (data) setObjectives(data);
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

  const saveChanges = useCallback(async () => {
    try {
      setSaveStatus('saving');

      const { error } = await supabase
        .from('messages')
        .update({
          title,
          body: body || null,
          value_proposition: valueProposition || null,
          domain,
          status,
          audience: getAudienceValue(),
          linked_objective_ids: selectedObjectiveIds,
          expires_at: expiresAt || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (error) throw error;

      setSaveStatus('saved');
      setLastSaved(new Date());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[MessageEdit] Error saving:', err);
      setSaveStatus('failed');
    }
  }, [message.id, title, body, valueProposition, domain, status, audience, customAudience, expiresAt, selectedObjectiveIds]);

  // Auto-save after 1.5s of inactivity
  useEffect(() => {
    const hasChanges =
      title !== (message.title || '') ||
      body !== (message.body || '') ||
      valueProposition !== (message.value_proposition || '') ||
      domain !== (message.domain || 'communication') ||
      status !== (message.status || 'draft') ||
      JSON.stringify(selectedObjectiveIds.sort()) !== JSON.stringify((message.linked_objective_ids || []).sort()) ||
      getAudienceValue() !== (message.audience || null);

    if (!hasChanges) return;

    const timer = setTimeout(() => {
      saveChanges();
    }, 1500);

    return () => clearTimeout(timer);
  }, [title, body, valueProposition, domain, status, audience, customAudience, expiresAt, selectedObjectiveIds, saveChanges]);

  const handleDone = () => {
    onUpdate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-end justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Message</h2>
              {deepLinkActions && <div className="mt-2">{deepLinkActions}</div>}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              {saveStatus === 'saving' && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">
                    Saved {lastSaved && lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
              {saveStatus === 'failed' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">Failed to save</span>
                  <button onClick={saveChanges} className="text-blue-600 hover:underline ml-2">Retry</button>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value Proposition
            </label>
            <p className="text-xs text-gray-500 mb-2">The core value — what makes this message compelling?</p>
            <textarea
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-2">Expires</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
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

          {/* Linked Objectives */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Linked Objectives
            </label>
            <p className="text-xs text-gray-500 mb-2">Connect this message to project objectives</p>
            {objectives.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                No objectives available to link.
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
                      <Target className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
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

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>Created: {new Date(message.created_at).toLocaleDateString()}</p>
            {message.updated_at && (
              <p>Last updated: {new Date(message.updated_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-between">
          <button
            onClick={saveChanges}
            disabled={saveStatus === 'saving'}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Now</span>
          </button>
          <button
            onClick={handleDone}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
