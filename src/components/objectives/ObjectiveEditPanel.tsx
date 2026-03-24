import { useState, useCallback, useEffect } from 'react';
import { X, Save, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { type ProjectObjective } from '../../lib/projectObjectivesService';

interface ObjectiveEditPanelProps {
  objective: ProjectObjective;
  onClose: () => void;
  onUpdate: () => void;
  deepLinkActions?: React.ReactNode;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

const MEANS_OF_VERIFICATION = [
  'Website analytics reports',
  'Social media engagement metrics',
  'Event attendance records',
  'Publication download counts',
  'Media coverage clippings',
  'Survey results and feedback',
  'Stakeholder meeting minutes',
  'Newsletter subscription data',
  'Citation and reference tracking',
  'Training participation records',
  'Partnership agreements signed',
  'Policy briefs distributed',
  'Conference presentations delivered',
  'Peer-reviewed publications',
  'Patent or IP filings',
  'Licensing agreements',
  'Pilot deployment reports',
  'User adoption statistics',
  'Impact assessment reports',
  'External evaluation reports',
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', description: 'Initial planning phase' },
  { value: 'planned', label: 'Planned', description: 'Approved and scheduled' },
  { value: 'in_progress', label: 'In Progress', description: 'Currently being implemented' },
  { value: 'completed', label: 'Completed', description: 'Fully achieved' },
  { value: 'on_hold', label: 'On Hold', description: 'Temporarily paused' },
];

export default function ObjectiveEditPanel({ objective, onClose, onUpdate, deepLinkActions }: ObjectiveEditPanelProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [title, setTitle] = useState(objective.title || '');
  const [description, setDescription] = useState(objective.description || '');
  const [domain, setDomain] = useState<string>(objective.domain || 'communication');
  const [priority, setPriority] = useState(objective.priority || 'medium');
  const [status, setStatus] = useState(objective.status || 'draft');
  const [notes, setNotes] = useState(objective.notes || '');
  const [targetDate, setTargetDate] = useState(objective.target_date ? objective.target_date.split('T')[0] : '');
  const [responsiblePerson, setResponsiblePerson] = useState(objective.responsible_person || '');

  // Parse means_of_verification from jsonb array
  const existingMoV: string[] = Array.isArray(objective.means_of_verification)
    ? objective.means_of_verification
    : [];

  // Separate preset and custom MoV entries
  const presetMoV = existingMoV.filter(m => MEANS_OF_VERIFICATION.includes(m));
  const customMoVEntries = existingMoV.filter(m => !MEANS_OF_VERIFICATION.includes(m));

  const [selectedMoV, setSelectedMoV] = useState<string[]>(presetMoV);
  const [showOtherMoV, setShowOtherMoV] = useState(customMoVEntries.length > 0);
  const [otherMoV, setOtherMoV] = useState(customMoVEntries.join(', '));

  const buildMeansOfVerification = (): string[] => {
    const movList = [...selectedMoV];
    if (showOtherMoV && otherMoV.trim()) {
      movList.push(otherMoV.trim());
    }
    return movList;
  };

  const toggleMoV = (mov: string) => {
    setSelectedMoV(prev =>
      prev.includes(mov) ? prev.filter(m => m !== mov) : [...prev, mov]
    );
  };

  const saveChanges = useCallback(async () => {
    try {
      setSaveStatus('saving');

      const { error } = await supabase
        .from('project_objectives')
        .update({
          title,
          description: description || null,
          domain,
          priority,
          status,
          notes: notes || null,
          means_of_verification: buildMeansOfVerification(),
          target_date: targetDate || null,
          responsible_person: responsiblePerson.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', objective.id);

      if (error) throw error;

      setSaveStatus('saved');
      setLastSaved(new Date());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[ObjectiveEdit] Error saving:', err);
      setSaveStatus('failed');
    }
  }, [objective.id, title, description, domain, priority, status, notes, selectedMoV, otherMoV, showOtherMoV, targetDate, responsiblePerson]);

  // Auto-save after 1.5 seconds of inactivity
  useEffect(() => {
    const currentMoV = buildMeansOfVerification();
    const originalMoV = existingMoV;

    const hasChanges =
      title !== (objective.title || '') ||
      description !== (objective.description || '') ||
      domain !== (objective.domain || 'communication') ||
      priority !== (objective.priority || 'medium') ||
      status !== (objective.status || 'draft') ||
      notes !== (objective.notes || '') ||
      targetDate !== (objective.target_date ? objective.target_date.split('T')[0] : '') ||
      responsiblePerson !== (objective.responsible_person || '') ||
      JSON.stringify(currentMoV.sort()) !== JSON.stringify(originalMoV.sort());

    if (!hasChanges) return;

    const timer = setTimeout(() => {
      saveChanges();
    }, 1500);

    return () => clearTimeout(timer);
  }, [title, description, domain, priority, status, notes, targetDate, responsiblePerson, selectedMoV, otherMoV, showOtherMoV, saveChanges]);

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
            <h2 className="text-xl font-bold text-gray-900">Edit Objective</h2>
            {deepLinkActions && <div className="mt-2">{deepLinkActions}</div>}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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
                <option value="communication">Communication</option>
                <option value="dissemination">Dissemination</option>
                <option value="exploitation">Exploitation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
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
              <p className="text-xs text-gray-500 mt-1">
                {STATUS_OPTIONS.find(o => o.value === status)?.description}
              </p>
            </div>
          </div>

          {/* Target Date & Responsible Person */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">When should this objective be achieved?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsible Person</label>
              <input
                type="text"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="e.g., WP3 Lead, Communications Officer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Who is driving this objective?</p>
            </div>
          </div>

          {/* Means of Verification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Means of Verification
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select methods to verify achievement of this objective
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto border border-gray-200 rounded-lg p-3">
              {MEANS_OF_VERIFICATION.map((mov) => {
                const isSelected = selectedMoV.includes(mov);
                return (
                  <button
                    key={mov}
                    type="button"
                    onClick={() => toggleMoV(mov)}
                    className={`flex items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border mr-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="leading-tight">{mov}</span>
                  </button>
                );
              })}

              {/* Other option */}
              <button
                type="button"
                onClick={() => setShowOtherMoV(!showOtherMoV)}
                className={`flex items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  showOtherMoV
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className={`w-4 h-4 rounded border mr-2 flex-shrink-0 flex items-center justify-center ${
                  showOtherMoV ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {showOtherMoV && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="leading-tight">Other (specify below)</span>
              </button>
            </div>

            {showOtherMoV && (
              <div className="mt-3">
                <input
                  type="text"
                  value={otherMoV}
                  onChange={(e) => setOtherMoV(e.target.value)}
                  placeholder="Describe your verification method..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {selectedMoV.length > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                {selectedMoV.length} method{selectedMoV.length > 1 ? 's' : ''} selected
                {showOtherMoV && otherMoV.trim() ? ' + 1 custom' : ''}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any project-specific notes..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>Created: {new Date(objective.created_at).toLocaleDateString()}</p>
            {objective.updated_at && (
              <p>Last updated: {new Date(objective.updated_at).toLocaleDateString()}</p>
            )}
            {objective.source && objective.source !== 'manual' && (
              <p className="capitalize">Source: {objective.source}</p>
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
