import { useState, useCallback, useEffect } from 'react';
import { X, Save, Check, AlertCircle, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { type ResultAsset } from './AssetCard';

interface AssetEditPanelProps {
  projectId: string;
  asset: ResultAsset;
  onClose: () => void;
  onUpdate: () => void;
  deepLinkActions?: React.ReactNode;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

const TYPE_OPTIONS = [
  { value: 'publication', label: 'Publication' },
  { value: 'software', label: 'Software' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'method', label: 'Method' },
  { value: 'training', label: 'Training' },
];

const MATURITY_OPTIONS = [
  { value: 'concept', label: 'Concept' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'tested', label: 'Tested' },
  { value: 'mature', label: 'Mature' },
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
  { value: 'adopted', label: 'Adopted', description: 'Successfully taken up' },
  { value: 'archived', label: 'Archived', description: 'No longer actively exploited' },
];

interface ObjectiveOption {
  id: string;
  title: string;
  domain: string;
}

export default function AssetEditPanel({ projectId, asset, onClose, onUpdate, deepLinkActions }: AssetEditPanelProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [title, setTitle] = useState(asset.title || '');
  const [description, setDescription] = useState(asset.description || '');
  const [type, setType] = useState(asset.type || 'publication');
  const [maturityLevel, setMaturityLevel] = useState(asset.maturity_level || 'concept');
  const [accessModality, setAccessModality] = useState(asset.access_modality || 'open');
  const [exploitationStatus, setExploitationStatus] = useState(asset.exploitation_status || 'identified');
  const [responsiblePartner, setResponsiblePartner] = useState(asset.responsible_partner || '');
  const [notes, setNotes] = useState(asset.notes || '');
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>(asset.linked_objective_ids || []);

  const [objectives, setObjectives] = useState<ObjectiveOption[]>([]);

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

  const saveChanges = useCallback(async () => {
    try {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('result_assets')
        .update({
          title,
          description: description || null,
          type,
          maturity_level: maturityLevel,
          access_modality: accessModality,
          exploitation_status: exploitationStatus,
          responsible_partner: responsiblePartner.trim() || null,
          notes: notes || null,
          linked_objective_ids: selectedObjectiveIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', asset.id);

      if (error) throw error;
      setSaveStatus('saved');
      setLastSaved(new Date());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[AssetEdit] Error saving:', err);
      setSaveStatus('failed');
    }
  }, [asset.id, title, description, type, maturityLevel, accessModality, exploitationStatus, responsiblePartner, notes, selectedObjectiveIds]);

  useEffect(() => {
    const hasChanges =
      title !== (asset.title || '') ||
      description !== (asset.description || '') ||
      type !== (asset.type || 'publication') ||
      maturityLevel !== (asset.maturity_level || 'concept') ||
      accessModality !== (asset.access_modality || 'open') ||
      exploitationStatus !== (asset.exploitation_status || 'identified') ||
      responsiblePartner !== (asset.responsible_partner || '') ||
      notes !== (asset.notes || '') ||
      JSON.stringify(selectedObjectiveIds.sort()) !== JSON.stringify((asset.linked_objective_ids || []).sort());

    if (!hasChanges) return;
    const timer = setTimeout(() => { saveChanges(); }, 1500);
    return () => clearTimeout(timer);
  }, [title, description, type, maturityLevel, accessModality, exploitationStatus, responsiblePartner, notes, selectedObjectiveIds, saveChanges]);

  const handleDone = () => { onUpdate(); onClose(); };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-end justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Asset</h2>
            {deepLinkActions && <div className="mt-2">{deepLinkActions}</div>}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              {saveStatus === 'saving' && (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div><span className="text-gray-600">Saving...</span></>)}
              {saveStatus === 'saved' && (<><Check className="w-4 h-4 text-green-600" /><span className="text-green-600">Saved {lastSaved && lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>)}
              {saveStatus === 'failed' && (<><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-red-600">Failed</span><button onClick={saveChanges} className="text-blue-600 hover:underline ml-2">Retry</button></>)}
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-600">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {TYPE_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maturity Level</label>
              <select value={maturityLevel} onChange={(e) => setMaturityLevel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {MATURITY_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Access Modality</label>
              <select value={accessModality} onChange={(e) => setAccessModality(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {ACCESS_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exploitation Status</label>
              <select value={exploitationStatus} onChange={(e) => setExploitationStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {EXPLOITATION_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{EXPLOITATION_OPTIONS.find(o => o.value === exploitationStatus)?.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsible Partner</label>
              <input type="text" value={responsiblePartner} onChange={(e) => setResponsiblePartner(e.target.value)} placeholder="e.g., University of X" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          {/* Linked Objectives */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Objectives</label>
            <p className="text-xs text-gray-500 mb-2">Which objectives does this result support?</p>
            {objectives.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">No objectives available.</div>
            ) : (
              <div className="grid gap-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-3">
                {objectives.map((obj) => {
                  const isSelected = selectedObjectiveIds.includes(obj.id);
                  return (
                    <button key={obj.id} type="button" onClick={() => toggleObjective(obj.id)}
                      className={`flex items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${isSelected ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}>
                      <div className={`w-4 h-4 rounded border mr-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <Target className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                      <span className="flex-1">{obj.title}</span>
                      {obj.domain && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize ml-2">{obj.domain}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedObjectiveIds.length > 0 && (
              <p className="text-xs text-purple-600 mt-1">{selectedObjectiveIds.length} objective{selectedObjectiveIds.length > 1 ? 's' : ''} linked</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="IPR considerations, exploitation plans..." rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>Created: {new Date(asset.created_at).toLocaleDateString()}</p>
            {asset.updated_at && <p>Last updated: {new Date(asset.updated_at).toLocaleDateString()}</p>}
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex items-center justify-between">
          <button onClick={saveChanges} disabled={saveStatus === 'saving'} className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50">
            <Save className="w-4 h-4" /><span>Save Now</span>
          </button>
          <button onClick={handleDone} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Done</button>
        </div>
      </div>
    </div>
  );
}
