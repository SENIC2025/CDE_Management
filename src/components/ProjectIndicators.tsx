import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, TrendingUp, BookOpen, Target, Library, AlertCircle, X, Edit2, Save } from 'lucide-react';
import IndicatorSelectorModal from './IndicatorSelectorModal';

interface ProjectIndicator {
  project_indicator_id: string;
  indicator_id: string;
  baseline: number | null;
  target: number | null;
  current_value: number | null;
  status: string;
  responsible_role: string | null;
  notes: string | null;
  indicator: {
    code: string;
    name: string;
    domain: string;
    definition: string;
    rationale: string | null;
    limitations: string | null;
    interpretation_notes: string | null;
    unit: string;
  };
}

interface ProjectIndicatorsProps {
  projectId: string;
}

export default function ProjectIndicators({ projectId }: ProjectIndicatorsProps) {
  const [indicators, setIndicators] = useState<ProjectIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<ProjectIndicator | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedBaseline, setEditedBaseline] = useState('');
  const [editedTarget, setEditedTarget] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadIndicators();
  }, [projectId]);

  async function loadIndicators() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('project_indicators')
        .select(`
          project_indicator_id,
          indicator_id,
          baseline,
          target,
          current_value,
          status,
          responsible_role,
          notes,
          indicator:indicator_library (
            code,
            name,
            domain,
            definition,
            rationale,
            limitations,
            interpretation_notes,
            unit
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('indicator(domain)', { ascending: true })
        .order('indicator(code)', { ascending: true });

      if (error) throw error;
      setIndicators(data || []);
    } catch (error) {
      console.error('Error loading project indicators:', error);
    } finally {
      setLoading(false);
    }
  }

  function openIndicatorPanel(indicator: ProjectIndicator) {
    setSelectedIndicator(indicator);
    setEditedBaseline(indicator.baseline?.toString() || '');
    setEditedTarget(indicator.target?.toString() || '');
    setEditedRole(indicator.responsible_role || '');
    setEditedNotes(indicator.notes || '');
    setEditing(false);
  }

  async function handleSaveEdits() {
    if (!selectedIndicator) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('project_indicators')
        .update({
          baseline: editedBaseline ? parseFloat(editedBaseline) : null,
          target: editedTarget ? parseFloat(editedTarget) : null,
          responsible_role: editedRole || null,
          notes: editedNotes || null
        })
        .eq('project_indicator_id', selectedIndicator.project_indicator_id);

      if (error) throw error;

      await loadIndicators();
      setEditing(false);

      const updated = indicators.find(i => i.project_indicator_id === selectedIndicator.project_indicator_id);
      if (updated) {
        setSelectedIndicator({
          ...updated,
          baseline: editedBaseline ? parseFloat(editedBaseline) : null,
          target: editedTarget ? parseFloat(editedTarget) : null,
          responsible_role: editedRole || null,
          notes: editedNotes || null
        });
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function calculateProgress(current: number | null, target: number | null): number {
    if (!current || !target || target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }

  function getDomainIcon(domain: string) {
    switch (domain) {
      case 'communication': return TrendingUp;
      case 'dissemination': return BookOpen;
      case 'exploitation': return Target;
      default: return Library;
    }
  }

  function getDomainColor(domain: string) {
    switch (domain) {
      case 'communication': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'dissemination': return 'bg-green-100 text-green-700 border-green-200';
      case 'exploitation': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  function formatLabel(str: string) {
    return str.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  const domainGroups = {
    communication: indicators.filter(i => i.indicator.domain === 'communication'),
    dissemination: indicators.filter(i => i.indicator.domain === 'dissemination'),
    exploitation: indicators.filter(i => i.indicator.domain === 'exploitation')
  };

  const hasAllDomains = domainGroups.communication.length > 0 &&
    domainGroups.dissemination.length > 0 &&
    domainGroups.exploitation.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading indicators...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Project Indicators</h2>
          <p className="text-sm text-slate-600">Track performance metrics from the indicator library</p>
        </div>
        <button
          onClick={() => setShowSelector(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Indicator
        </button>
      </div>

      {!hasAllDomains && indicators.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Consider adding indicators from all domains</p>
            <p>
              {domainGroups.communication.length === 0 && 'This project has no communication indicators yet. '}
              {domainGroups.dissemination.length === 0 && 'This project has no dissemination indicators yet. '}
              {domainGroups.exploitation.length === 0 && 'This project has no exploitation indicators yet. '}
            </p>
          </div>
        </div>
      )}

      {indicators.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <Library className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No indicators added yet</h3>
          <p className="text-slate-600 mb-4">Add professional indicators from the library to track project performance</p>
          <button
            onClick={() => setShowSelector(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add First Indicator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indicators.map((indicator) => {
            const DomainIcon = getDomainIcon(indicator.indicator.domain);
            const progress = calculateProgress(indicator.current_value, indicator.target);

            return (
              <div
                key={indicator.project_indicator_id}
                onClick={() => openIndicatorPanel(indicator)}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2 py-1 rounded border text-xs font-medium ${getDomainColor(indicator.indicator.domain)}`}>
                    <div className="flex items-center gap-1">
                      <DomainIcon className="h-3 w-3" />
                      {formatLabel(indicator.indicator.domain)}
                    </div>
                  </span>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-mono text-slate-500 mb-1">{indicator.indicator.code}</div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{indicator.indicator.name}</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs">
                    <div>
                      <div className="text-slate-500">Current</div>
                      <div className="font-medium text-slate-900">
                        {indicator.current_value ?? '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Target</div>
                      <div className="font-medium text-slate-900">
                        {indicator.target ?? '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Baseline</div>
                      <div className="font-medium text-slate-900">
                        {indicator.baseline ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showSelector && (
        <IndicatorSelectorModal
          projectId={projectId}
          onClose={() => setShowSelector(false)}
          onSelect={() => {
            setShowSelector(false);
            loadIndicators();
          }}
        />
      )}

      {selectedIndicator && (
        <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-mono text-slate-500 mb-1">{selectedIndicator.indicator.code}</div>
              <h2 className="text-lg font-bold text-slate-900">{selectedIndicator.indicator.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedIndicator(null);
                  setEditing(false);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className={`px-3 py-1 rounded border text-sm font-medium inline-block ${getDomainColor(selectedIndicator.indicator.domain)}`}>
              {formatLabel(selectedIndicator.indicator.domain)}
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Definition</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.indicator.definition}</p>
            </div>

            {selectedIndicator.indicator.rationale && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Rationale</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.indicator.rationale}</p>
              </div>
            )}

            {selectedIndicator.indicator.limitations && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Limitations</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.indicator.limitations}</p>
              </div>
            )}

            {selectedIndicator.indicator.interpretation_notes && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Interpretation Notes</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.indicator.interpretation_notes}</p>
              </div>
            )}

            <div className="border-t border-slate-200 pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Project Values</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Baseline</label>
                {editing ? (
                  <input
                    type="number"
                    step="any"
                    value={editedBaseline}
                    onChange={(e) => setEditedBaseline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="text-2xl font-bold text-slate-900">
                    {selectedIndicator.baseline ?? '-'} {selectedIndicator.indicator.unit && formatLabel(selectedIndicator.indicator.unit)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Target</label>
                {editing ? (
                  <input
                    type="number"
                    step="any"
                    value={editedTarget}
                    onChange={(e) => setEditedTarget(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="text-2xl font-bold text-slate-900">
                    {selectedIndicator.target ?? '-'} {selectedIndicator.indicator.unit && formatLabel(selectedIndicator.indicator.unit)}
                  </div>
                )}
                {!editing && !selectedIndicator.baseline && selectedIndicator.target && (
                  <p className="text-xs text-amber-600 mt-1">Baseline recommended for meaningful tracking</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Responsible Role</label>
                {editing ? (
                  <input
                    type="text"
                    value={editedRole}
                    onChange={(e) => setEditedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="text-sm text-slate-900">
                    {selectedIndicator.responsible_role || 'Not assigned'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                {editing ? (
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="text-sm text-slate-700">
                    {selectedIndicator.notes || 'No notes'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
