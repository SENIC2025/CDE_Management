import { useState, useEffect } from 'react';
import { X, Search, Plus, TrendingUp, BookOpen, Target, Library, Check } from 'lucide-react';
import { indicatorLibraryService, IndicatorLibrary } from '../../lib/indicatorLibraryService';

interface IndicatorLibraryPickerModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultFilters?: {
    domain?: string;
    maturity?: string;
  };
  onApplied?: (result: { inserted: number; skipped: number }) => void;
  allowMultiSelect?: boolean;
}

export default function IndicatorLibraryPickerModal({
  open,
  onClose,
  projectId,
  defaultFilters,
  onApplied,
  allowMultiSelect = true
}: IndicatorLibraryPickerModalProps) {
  const [indicators, setIndicators] = useState<IndicatorLibrary[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(defaultFilters?.domain || 'all');
  const [selectedMaturity, setSelectedMaturity] = useState(defaultFilters?.maturity || 'all');
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(new Set());
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadIndicators();
    }
  }, [open, projectId, searchTerm, selectedDomain, selectedMaturity]);

  async function loadIndicators() {
    try {
      setLoading(true);
      console.log('[LibraryPicker] Loading indicators');

      const data = await indicatorLibraryService.listLibraryIndicators({
        search: searchTerm || undefined,
        domain: selectedDomain,
        maturity_level: selectedMaturity,
        limit: 100
      });

      setIndicators(data);
    } catch (error: any) {
      console.error('[LibraryPicker] Error loading indicators:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleIndicator = (indicatorId: string) => {
    const newSelected = new Set(selectedIndicators);
    if (newSelected.has(indicatorId)) {
      newSelected.delete(indicatorId);
    } else {
      if (!allowMultiSelect) {
        newSelected.clear();
      }
      newSelected.add(indicatorId);
    }
    setSelectedIndicators(newSelected);
  };

  const handleApply = async () => {
    if (selectedIndicators.size === 0) return;

    try {
      setApplying(true);
      console.log('[LibraryPicker] Adding indicators to project');

      const result = await indicatorLibraryService.addIndicatorsToProject(
        projectId,
        Array.from(selectedIndicators)
      );

      if (result.errors.length > 0) {
        alert('Some indicators could not be added: ' + result.errors.join(', '));
      }

      if (result.inserted > 0 || result.skipped > 0) {
        const message = `Added ${result.inserted} indicator${result.inserted !== 1 ? 's' : ''}${result.skipped > 0 ? `, skipped ${result.skipped} already added` : ''}`;

        if (onApplied) {
          onApplied(result);
        }

        console.log('[LibraryPicker]', message);
        onClose();
      }
    } catch (error: any) {
      console.error('[LibraryPicker] Error applying indicators:', error);
      alert('Failed to add indicators. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'communication': return TrendingUp;
      case 'dissemination': return BookOpen;
      case 'exploitation': return Target;
      default: return Library;
    }
  };

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'communication': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'dissemination': return 'bg-green-100 text-green-700 border-green-200';
      case 'exploitation': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getMaturityBadge = (level: string) => {
    const colors = {
      basic: 'bg-slate-100 text-slate-700',
      advanced: 'bg-blue-100 text-blue-700',
      expert: 'bg-purple-100 text-purple-700'
    };
    return colors[level as keyof typeof colors] || colors.basic;
  };

  const formatLabel = (str: string) => {
    return str.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Indicators from Library</h2>
            <p className="text-sm text-slate-600 mt-1">
              {allowMultiSelect ? 'Select multiple professional indicators' : 'Select an indicator'} for your project
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, code, or definition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Domains</option>
              <option value="communication">Communication</option>
              <option value="dissemination">Dissemination</option>
              <option value="exploitation">Exploitation</option>
            </select>
            <select
              value={selectedMaturity}
              onChange={(e) => setSelectedMaturity(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-600">Loading indicators...</div>
            </div>
          ) : indicators.length === 0 ? (
            <div className="text-center py-12">
              <Library className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No indicators found</h3>
              <p className="text-slate-600">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {indicators.map((indicator) => {
                const DomainIcon = getDomainIcon(indicator.domain);
                const isSelected = selectedIndicators.has(indicator.indicator_id);
                const isExpanded = expandedIndicator === indicator.indicator_id;

                return (
                  <div
                    key={indicator.indicator_id}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {allowMultiSelect && (
                        <div className="flex-shrink-0 mt-1">
                          <button
                            onClick={() => handleToggleIndicator(indicator.indicator_id)}
                            className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-slate-300 hover:border-blue-500'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </div>
                      )}

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          if (!allowMultiSelect) {
                            handleToggleIndicator(indicator.indicator_id);
                          } else {
                            setExpandedIndicator(isExpanded ? null : indicator.indicator_id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded border text-xs font-medium ${getDomainColor(indicator.domain)}`}>
                              <div className="flex items-center gap-1">
                                <DomainIcon className="h-3 w-3" />
                                {formatLabel(indicator.domain)}
                              </div>
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getMaturityBadge(indicator.maturity_level)}`}>
                              {formatLabel(indicator.maturity_level)}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs font-mono text-slate-500 mb-1">{indicator.code}</div>
                        <h3 className="text-base font-semibold text-slate-900 mb-2">{indicator.name}</h3>
                        <p className={`text-sm text-slate-600 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                          {indicator.definition}
                        </p>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                            {indicator.rationale && (
                              <div>
                                <div className="text-xs font-semibold text-slate-700 mb-1">Rationale</div>
                                <p className="text-sm text-slate-600">{indicator.rationale}</p>
                              </div>
                            )}
                            {indicator.interpretation_notes && (
                              <div>
                                <div className="text-xs font-semibold text-slate-700 mb-1">Interpretation</div>
                                <p className="text-sm text-slate-600">{indicator.interpretation_notes}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-slate-500">Unit</div>
                                <div className="text-sm font-medium">{formatLabel(indicator.unit)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Data Source</div>
                                <div className="text-sm font-medium">{formatLabel(indicator.data_source)}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {!isExpanded && (
                          <div className="mt-2 text-xs text-slate-500">
                            Unit: {formatLabel(indicator.unit)} • Click to see more
                          </div>
                        )}
                      </div>

                      {allowMultiSelect && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleIndicator(indicator.indicator_id);
                          }}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {selectedIndicators.size > 0 ? (
              <span className="font-medium text-slate-900">
                {selectedIndicators.size} indicator{selectedIndicators.size !== 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>No indicators selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={applying}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedIndicators.size === 0 || applying}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {applying ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add to Project
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
