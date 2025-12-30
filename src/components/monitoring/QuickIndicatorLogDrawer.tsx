import { useState, useEffect } from 'react';
import { X, ArrowRight, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import EvidencePicker from '../EvidencePicker';
import SaveStatus from './SaveStatus';

interface Indicator {
  id: string;
  name: string;
  unit: string;
  baseline: string;
  target: string;
  description?: string;
}

interface QuickIndicatorLogDrawerProps {
  indicator: Indicator | null;
  projectId: string;
  selectedPeriod: string;
  queue?: string[];
  onClose: () => void;
  onSaved: () => void;
  onNext?: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function QuickIndicatorLogDrawer({
  indicator,
  projectId,
  selectedPeriod,
  queue = [],
  onClose,
  onSaved,
  onNext
}: QuickIndicatorLogDrawerProps) {
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<string[]>([]);
  const [existingValueId, setExistingValueId] = useState<string | null>(null);

  const currentIndex = indicator ? queue.indexOf(indicator.id) : -1;
  const totalInQueue = queue.length;
  const hasNext = onNext && currentIndex < totalInQueue - 1;

  useEffect(() => {
    if (indicator && selectedPeriod) {
      loadExistingValue();
      loadLinkedEvidence();
    }
  }, [indicator?.id, selectedPeriod]);

  const loadExistingValue = async () => {
    if (!indicator) return;

    try {
      const { data } = await supabase
        .from('indicator_values')
        .select('*')
        .eq('indicator_id', indicator.id)
        .eq('period', selectedPeriod)
        .maybeSingle();

      if (data) {
        setExistingValueId(data.id);
        setValue(data.value?.toString() || '');
        setNotes(data.notes || '');
      } else {
        setExistingValueId(null);
        setValue('');
        setNotes('');
      }
    } catch (err: any) {
      console.error('[ME][QuickLog] Error loading existing value:', err);
    }
  };

  const loadLinkedEvidence = async () => {
    if (!indicator) return;

    try {
      const { data } = await supabase
        .from('evidence_links')
        .select('evidence_item_id')
        .eq('indicator_id', indicator.id);

      setLinkedEvidenceIds(data?.map(d => d.evidence_item_id) || []);
    } catch (err: any) {
      console.error('[ME][QuickLog] Error loading linked evidence:', err);
    }
  };

  const handleSave = async () => {
    if (!indicator || !value.trim()) {
      setError('Value is required');
      return;
    }

    setSaveState('saving');
    setError(null);

    try {
      const valueData = {
        indicator_id: indicator.id,
        project_id: projectId,
        period: selectedPeriod,
        value: parseFloat(value),
        notes: notes.trim() || null
      };

      if (existingValueId) {
        const { error: updateError } = await supabase
          .from('indicator_values')
          .update({ value: valueData.value, notes: valueData.notes })
          .eq('id', existingValueId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('indicator_values')
          .insert(valueData);

        if (insertError) throw insertError;
      }

      setSaveState('saved');
      onSaved();

      setTimeout(() => {
        setSaveState('idle');
      }, 2000);
    } catch (err: any) {
      console.error('[ME][QuickLog] Error saving value:', err);
      setError(err.message || 'Failed to save');
      setSaveState('error');
    }
  };

  const handleSaveAndNext = async () => {
    await handleSave();
    if (saveState !== 'error' && hasNext) {
      setTimeout(() => {
        onNext!();
      }, 500);
    }
  };

  const handleRetry = () => {
    setSaveState('idle');
    setError(null);
    handleSave();
  };

  if (!indicator) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between bg-gray-50">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Quick Log Value</h3>
            </div>
            {totalInQueue > 0 && (
              <p className="text-sm text-gray-600">
                {currentIndex + 1} of {totalInQueue} in queue
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-semibold text-gray-900 mb-2">{indicator.name}</div>
            {indicator.description && (
              <p className="text-sm text-gray-600 mb-2">{indicator.description}</p>
            )}
            <div className="text-sm text-gray-600">
              <span className="font-medium">Unit:</span> {indicator.unit} |
              <span className="font-medium ml-2">Baseline:</span> {indicator.baseline} |
              <span className="font-medium ml-2">Target:</span> {indicator.target}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value for {selectedPeriod} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Enter value in ${indicator.unit}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any context, methodology, or observations..."
            />
          </div>

          <div className="border-t pt-6">
            <EvidencePicker
              linkedEvidenceIds={linkedEvidenceIds}
              onLink={(id) => setLinkedEvidenceIds([...linkedEvidenceIds, id])}
              onUnlink={(id) => setLinkedEvidenceIds(linkedEvidenceIds.filter(e => e !== id))}
              entityType="indicator"
              entityId={indicator.id}
            />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <SaveStatus state={saveState} error={error || undefined} onRetry={handleRetry} />

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!value.trim() || saveState === 'saving'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saveState === 'saving' ? 'Saving...' : 'Save'}
            </button>
            {hasNext && (
              <button
                onClick={handleSaveAndNext}
                disabled={!value.trim() || saveState === 'saving'}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Save & Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
