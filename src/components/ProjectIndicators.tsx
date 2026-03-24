import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, TrendingUp, BookOpen, Target, Library, AlertCircle, X, Edit2, Save, Trash2, ExternalLink, Search, Filter } from 'lucide-react';
import IndicatorLibraryPickerModal from './indicators/IndicatorLibraryPickerModal';
import BundlePickerModal from './indicators/BundlePickerModal';
import { IndicatorLibraryService } from '../lib/indicatorLibraryService';
import { ConfirmDialog } from './ui';
import useConfirm from '../hooks/useConfirm';

interface ProjectIndicator {
  id: string;              // indicators.id
  project_id: string;
  title: string;
  description: string | null;
  measurement_unit: string | null;
  target_value: number | null;
  status: string | null;
  locked: boolean;
  // Resolved from static catalog
  library_code: string | null;
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
  onChange?: () => void;
}

export default function ProjectIndicators({ projectId, onChange }: ProjectIndicatorsProps) {
  const navigate = useNavigate();
  const [confirmProps, confirmDialog] = useConfirm();
  const [indicators, setIndicators] = useState<ProjectIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [showBundlePicker, setShowBundlePicker] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<ProjectIndicator | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedTarget, setEditedTarget] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedView, setSelectedView] = useState<string>('all');

  useEffect(() => {
    loadIndicators();
  }, [projectId]);

  async function loadIndicators() {
    try {
      console.log('[ProjectIndicators] Loading indicators for project:', projectId);
      setLoading(true);

      // Query the `indicators` table directly — this is what addIndicatorsToProject writes to
      const { data, error } = await supabase
        .from('indicators')
        .select('id, project_id, title, description, measurement_unit, target_value, status, locked')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        setIndicators([]);
        return;
      }

      // Resolve indicator details from static catalog using embedded code in description
      const enriched: ProjectIndicator[] = data.map((row: any) => {
        const libraryCode = IndicatorLibraryService.extractCodeFromDescription(row.description);
        const catalogEntry = libraryCode ? IndicatorLibraryService.getIndicatorByCode(libraryCode) : null;

        // Infer domain from code prefix or catalog
        let domain = 'communication';
        if (catalogEntry) {
          domain = catalogEntry.domain;
        } else if (libraryCode) {
          if (libraryCode.startsWith('DIS-')) domain = 'dissemination';
          else if (libraryCode.startsWith('EXP-')) domain = 'exploitation';
        }

        // Strip the [CODE] prefix from description for display
        const cleanDefinition = row.description
          ? row.description.replace(/^\[[A-Z]{3}-[A-Z]+-\d+\]\s*/, '')
          : '';

        return {
          id: row.id,
          project_id: row.project_id,
          title: row.title,
          description: row.description,
          measurement_unit: row.measurement_unit,
          target_value: row.target_value,
          status: row.status,
          locked: row.locked || false,
          library_code: libraryCode,
          indicator: catalogEntry
            ? {
                code: catalogEntry.code,
                name: catalogEntry.name,
                domain: catalogEntry.domain,
                definition: catalogEntry.definition,
                rationale: catalogEntry.rationale,
                limitations: catalogEntry.limitations,
                interpretation_notes: catalogEntry.interpretation_notes,
                unit: catalogEntry.unit,
              }
            : {
                code: libraryCode || '—',
                name: row.title || 'Custom Indicator',
                domain,
                definition: cleanDefinition,
                rationale: null,
                limitations: null,
                interpretation_notes: null,
                unit: row.measurement_unit || 'number',
              },
        };
      });

      setIndicators(enriched);
    } catch (error) {
      console.error('[ProjectIndicators] Error loading indicators:', error);
      setIndicators([]);
    } finally {
      setLoading(false);
    }
  }

  function openIndicatorPanel(indicator: ProjectIndicator) {
    setSelectedIndicator(indicator);
    setEditedTarget(indicator.target_value?.toString() || '');
    setEditedNotes('');
    setEditing(false);
  }

  async function handleSaveEdits() {
    if (!selectedIndicator) return;

    try {
      setSaving(true);

      // Update the `indicators` table — only columns that exist
      const { error } = await supabase
        .from('indicators')
        .update({
          target_value: editedTarget ? parseFloat(editedTarget) : null,
        })
        .eq('id', selectedIndicator.id);

      if (error) throw error;

      await loadIndicators();
      setEditing(false);

      const updated = indicators.find(i => i.id === selectedIndicator.id);
      if (updated) {
        setSelectedIndicator({
          ...updated,
          target_value: editedTarget ? parseFloat(editedTarget) : null,
        });
      }
    } catch (error) {
      console.error('[ProjectIndicators] Error saving edits:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveIndicator(indicatorId: string) {
    const ok = await confirmDialog({ title: 'Remove indicator?', message: 'This indicator will be removed from the project.' });
    if (!ok) return;

    try {
      // Soft-delete by setting deleted_at
      const { error } = await supabase
        .from('indicators')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', indicatorId);

      if (error) throw error;

      setSelectedIndicator(null);
      await loadIndicators();
      if (onChange) onChange();
    } catch (error) {
      console.error('[ProjectIndicators] Error removing indicator:', error);
      alert('Failed to remove indicator. Please try again.');
    }
  }

  function handleViewDefinition(indicatorId: string) {
    navigate(`/library?indicatorId=${indicatorId}`);
  }

  function calculateProgress(_current: number | null, _target: number | null): number {
    // Progress tracking will come later with indicator_values
    return 0;
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

  const filteredIndicators = useMemo(() => {
    let filtered = [...indicators];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ind =>
        ind.indicator.name.toLowerCase().includes(term) ||
        ind.indicator.code.toLowerCase().includes(term) ||
        ind.indicator.definition.toLowerCase().includes(term)
      );
    }

    if (selectedDomain !== 'all') {
      filtered = filtered.filter(ind => ind.indicator.domain === selectedDomain);
    }

    if (selectedView === 'missing_baseline') {
      filtered = filtered.filter(ind => !ind.baseline);
    } else if (selectedView === 'missing_target') {
      filtered = filtered.filter(ind => !ind.target);
    }

    return filtered;
  }, [indicators, searchTerm, selectedDomain, selectedView]);

  const domainGroups = {
    communication: indicators.filter(i => i.indicator.domain === 'communication'),
    dissemination: indicators.filter(i => i.indicator.domain === 'dissemination'),
    exploitation: indicators.filter(i => i.indicator.domain === 'exploitation')
  };

  const hasAllDomains = domainGroups.communication.length > 0 &&
    domainGroups.dissemination.length > 0 &&
    domainGroups.exploitation.length > 0;

  const handleLibraryApplied = (result: { inserted: number; skipped: number }) => {
    const message = `Added ${result.inserted} indicator${result.inserted !== 1 ? 's' : ''}${result.skipped > 0 ? `, ${result.skipped} already added` : ''}`;
    alert(message);
    loadIndicators();
    if (onChange) onChange();
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLibraryPicker(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add from Library
          </button>
          <button
            onClick={() => setShowBundlePicker(true)}
            className="px-4 py-2 border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2"
          >
            <Library className="h-4 w-4" />
            Use Bundle
          </button>
        </div>
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

      {indicators.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search indicators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Indicators</option>
              <option value="missing_baseline">Missing Baseline</option>
              <option value="missing_target">Missing Target</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="pt-3 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">Domain</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Domains</option>
                <option value="communication">Communication</option>
                <option value="dissemination">Dissemination</option>
                <option value="exploitation">Exploitation</option>
              </select>
            </div>
          )}
        </div>
      )}

      {indicators.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <Library className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No indicators added yet</h3>
          <p className="text-slate-600 mb-4">Add professional indicators from the library to track project performance</p>
          <button
            onClick={() => setShowLibraryPicker(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add First Indicator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIndicators.map((indicator) => {
            const DomainIcon = getDomainIcon(indicator.indicator.domain);

            return (
              <div
                key={indicator.id}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded border text-xs font-medium ${getDomainColor(indicator.indicator.domain)}`}>
                      <div className="flex items-center gap-1">
                        <DomainIcon className="h-3 w-3" />
                        {formatLabel(indicator.indicator.domain)}
                      </div>
                    </span>
                    {indicator.library_code && (
                      <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">Library</span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-mono text-slate-500 mb-1">{indicator.indicator.code}</div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{indicator.indicator.name}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <div>
                      <div className="text-slate-500">Target</div>
                      <div className="font-medium text-slate-900">
                        {indicator.target_value ?? '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Unit</div>
                      <div className="font-medium text-slate-900">
                        {indicator.measurement_unit ? formatLabel(indicator.measurement_unit) : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Status</div>
                      <div className="font-medium text-slate-900">
                        {indicator.status ? formatLabel(indicator.status) : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {indicator.library_code && (
                      <button
                        onClick={() => handleViewDefinition(indicator.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View definition
                      </button>
                    )}
                    <button
                      onClick={() => openIndicatorPanel(indicator)}
                      className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredIndicators.length === 0 && indicators.length > 0 && (
        <div className="text-center py-8 text-slate-600">
          No indicators match your current filters
        </div>
      )}

      <IndicatorLibraryPickerModal
        open={showLibraryPicker}
        onClose={() => setShowLibraryPicker(false)}
        projectId={projectId}
        onApplied={handleLibraryApplied}
        allowMultiSelect={true}
      />

      <BundlePickerModal
        open={showBundlePicker}
        onClose={() => setShowBundlePicker(false)}
        projectId={projectId}
        onApplied={(result) => {
          const message = `Bundle "${result.bundleName}": added ${result.inserted} indicator${result.inserted !== 1 ? 's' : ''}${result.skipped > 0 ? `, ${result.skipped} already in project` : ''}`;
          alert(message);
          loadIndicators();
          if (onChange) onChange();
        }}
      />

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
                  title="Edit target"
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
                onClick={() => handleRemoveIndicator(selectedIndicator.id)}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                title="Remove from project"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
                    {selectedIndicator.target_value ?? '-'} {selectedIndicator.indicator.unit && formatLabel(selectedIndicator.indicator.unit)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Measurement Unit</label>
                <div className="text-sm text-slate-900">
                  {selectedIndicator.measurement_unit ? formatLabel(selectedIndicator.measurement_unit) : 'Not specified'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <div className="text-sm text-slate-900">
                  {selectedIndicator.status ? formatLabel(selectedIndicator.status) : 'Active'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
