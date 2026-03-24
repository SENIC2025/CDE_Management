import { useState, useEffect } from 'react';
import { X, Package, Check, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddAssetModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_OPTIONS = [
  { value: 'publication', label: 'Publication', description: 'Journal article, conference paper, report' },
  { value: 'software', label: 'Software', description: 'Code, tool, application, platform' },
  { value: 'dataset', label: 'Dataset', description: 'Research data, curated collection' },
  { value: 'method', label: 'Method', description: 'Methodology, protocol, process' },
  { value: 'training', label: 'Training', description: 'Course, workshop, educational material' },
];

const MATURITY_OPTIONS = [
  { value: 'concept', label: 'Concept', description: 'Idea or early design stage' },
  { value: 'prototype', label: 'Prototype', description: 'Working proof-of-concept' },
  { value: 'tested', label: 'Tested', description: 'Validated and evaluated' },
  { value: 'mature', label: 'Mature', description: 'Ready for deployment/adoption' },
];

const ACCESS_OPTIONS = [
  { value: 'open', label: 'Open Access' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'commercial', label: 'Commercial' },
];

const EXPLOITATION_OPTIONS = [
  { value: 'identified', label: 'Identified', description: 'Result identified as exploitable' },
  { value: 'under_assessment', label: 'Under Assessment', description: 'Evaluating exploitation potential' },
  { value: 'being_exploited', label: 'Being Exploited', description: 'Active exploitation in progress' },
  { value: 'adopted', label: 'Adopted', description: 'Successfully taken up by stakeholders' },
  { value: 'archived', label: 'Archived', description: 'No longer actively exploited' },
];

interface ObjectiveOption {
  id: string;
  title: string;
  domain: string;
}

export default function AddAssetModal({ projectId, onClose, onSuccess }: AddAssetModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('publication');
  const [maturityLevel, setMaturityLevel] = useState('concept');
  const [accessModality, setAccessModality] = useState('open');
  const [exploitationStatus, setExploitationStatus] = useState('identified');
  const [responsiblePartner, setResponsiblePartner] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);

  const [objectives, setObjectives] = useState<ObjectiveOption[]>([]);
  const [objectivesLoading, setObjectivesLoading] = useState(false);

  useEffect(() => {
    loadObjectives();
  }, []);

  const loadObjectives = async () => {
    try {
      setObjectivesLoading(true);
      const { data } = await supabase
        .from('project_objectives')
        .select('id, title, domain')
        .eq('project_id', projectId)
        .order('title');
      if (data) setObjectives(data);
    } catch (err) {
      console.error('[AddAsset] Error loading objectives:', err);
    } finally {
      setObjectivesLoading(false);
    }
  };

  const toggleObjective = (id: string) => {
    setSelectedObjectiveIds(prev =>
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
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
        .from('result_assets')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          type,
          maturity_level: maturityLevel,
          access_modality: accessModality,
          exploitation_status: exploitationStatus,
          responsible_partner: responsiblePartner.trim() || null,
          notes: notes.trim() || null,
          linked_objective_ids: selectedObjectiveIds,
        });

      if (insertError) {
        console.error('[AddAsset] Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create asset');
      }

      onSuccess();
    } catch (err: any) {
      console.error('[AddAsset] Create error:', err);
      setError(err?.message || 'Failed to create asset');
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
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">New Result Asset</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{error}</div>
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
              placeholder='e.g., "Open-source data analysis toolkit for environmental monitoring"'
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this result or exploitable asset..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type, Maturity, Access */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {TYPE_OPTIONS.find(o => o.value === type)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maturity Level</label>
              <select
                value={maturityLevel}
                onChange={(e) => setMaturityLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MATURITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {MATURITY_OPTIONS.find(o => o.value === maturityLevel)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Access Modality</label>
              <select
                value={accessModality}
                onChange={(e) => setAccessModality(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ACCESS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Exploitation Status & Responsible Partner */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exploitation Status</label>
              <select
                value={exploitationStatus}
                onChange={(e) => setExploitationStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EXPLOITATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {EXPLOITATION_OPTIONS.find(o => o.value === exploitationStatus)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsible Partner</label>
              <input
                type="text"
                value={responsiblePartner}
                onChange={(e) => setResponsiblePartner(e.target.value)}
                placeholder="e.g., University of X, Partner Corp"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Link to Objectives */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Objectives</label>
            <p className="text-xs text-gray-500 mb-2">Which objectives does this result support?</p>
            {objectivesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : objectives.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                No objectives created yet.
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
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize ml-2">{obj.domain}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedObjectiveIds.length > 0 && (
              <p className="text-xs text-purple-600 mt-1">{selectedObjectiveIds.length} objective{selectedObjectiveIds.length > 1 ? 's' : ''} linked</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context, IPR considerations, or exploitation plans..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>Create Asset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
