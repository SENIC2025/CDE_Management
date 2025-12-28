import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, Check, TrendingUp, BookOpen, Target, Library } from 'lucide-react';

interface Indicator {
  indicator_id: string;
  code: string;
  name: string;
  domain: 'communication' | 'dissemination' | 'exploitation';
  definition: string;
  unit: string;
  maturity_level: 'basic' | 'advanced' | 'expert';
  default_baseline: number | null;
  default_target: number | null;
}

interface IndicatorSelectorModalProps {
  projectId: string;
  onClose: () => void;
  onSelect: () => void;
}

export default function IndicatorSelectorModal({ projectId, onClose, onSelect }: IndicatorSelectorModalProps) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<Indicator[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [baseline, setBaseline] = useState('');
  const [target, setTarget] = useState('');
  const [responsibleRole, setResponsibleRole] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadIndicators();
  }, [projectId]);

  useEffect(() => {
    filterIndicators();
  }, [indicators, searchTerm, selectedDomain]);

  async function loadIndicators() {
    try {
      setLoading(true);

      const { data: existingIndicators } = await supabase
        .from('project_indicators')
        .select('indicator_id')
        .eq('project_id', projectId);

      const existingIds = existingIndicators?.map(i => i.indicator_id) || [];

      const { data, error } = await supabase
        .from('indicator_library')
        .select('indicator_id, code, name, domain, definition, unit, maturity_level, default_baseline, default_target')
        .eq('is_active', true)
        .not('indicator_id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : 'null'})`)
        .order('domain', { ascending: true })
        .order('code', { ascending: true });

      if (error) throw error;
      setIndicators(data || []);
    } catch (error) {
      console.error('Error loading indicators:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterIndicators() {
    let filtered = [...indicators];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ind =>
        ind.name.toLowerCase().includes(term) ||
        ind.code.toLowerCase().includes(term) ||
        ind.definition.toLowerCase().includes(term)
      );
    }

    if (selectedDomain !== 'all') {
      filtered = filtered.filter(ind => ind.domain === selectedDomain);
    }

    setFilteredIndicators(filtered);
  }

  function handleIndicatorClick(indicator: Indicator) {
    setSelectedIndicator(indicator);
    setBaseline(indicator.default_baseline?.toString() || '');
    setTarget(indicator.default_target?.toString() || '');
  }

  async function handleAddIndicator() {
    if (!selectedIndicator) return;

    try {
      setAdding(true);

      const { error } = await supabase
        .from('project_indicators')
        .insert({
          project_id: projectId,
          indicator_id: selectedIndicator.indicator_id,
          baseline: baseline ? parseFloat(baseline) : null,
          target: target ? parseFloat(target) : null,
          responsible_role: responsibleRole || null,
          notes: notes || null,
          status: 'active'
        });

      if (error) throw error;

      onSelect();
      onClose();
    } catch (error) {
      console.error('Error adding indicator:', error);
      alert('Failed to add indicator. Please try again.');
    } finally {
      setAdding(false);
    }
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-slate-600">Loading indicators...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {!selectedIndicator ? (
          <>
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add Indicator from Library</h2>
                <p className="text-sm text-slate-600">Select a professional indicator for your project</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search indicators..."
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
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredIndicators.length === 0 ? (
                <div className="text-center py-12">
                  <Library className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No indicators available</h3>
                  <p className="text-slate-600">All indicators have been added to this project or no matches found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredIndicators.map((indicator) => {
                    const DomainIcon = getDomainIcon(indicator.domain);
                    return (
                      <div
                        key={indicator.indicator_id}
                        onClick={() => handleIndicatorClick(indicator)}
                        className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-blue-500 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className={`px-2 py-1 rounded border text-xs font-medium ${getDomainColor(indicator.domain)}`}>
                            <div className="flex items-center gap-1">
                              <DomainIcon className="h-3 w-3" />
                              {formatLabel(indicator.domain)}
                            </div>
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-500 mb-1">{indicator.code}</div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-2">{indicator.name}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2">{indicator.definition}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          Unit: {formatLabel(indicator.unit)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">{selectedIndicator.code}</div>
                <h2 className="text-xl font-bold text-slate-900">{selectedIndicator.name}</h2>
              </div>
              <button
                onClick={() => setSelectedIndicator(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Definition</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.definition}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Baseline Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={baseline}
                    onChange={(e) => setBaseline(e.target.value)}
                    placeholder="Enter baseline value"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Current or starting value for this indicator</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Target Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Enter target value"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Goal or expected value to achieve</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Responsible Role
                  </label>
                  <input
                    type="text"
                    value={responsibleRole}
                    onChange={(e) => setResponsibleRole(e.target.value)}
                    placeholder="e.g., Communications Lead, Project Coordinator"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Person or role responsible for this indicator</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any project-specific notes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setSelectedIndicator(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={adding}
              >
                Back
              </button>
              <button
                onClick={handleAddIndicator}
                disabled={adding || !target}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {adding ? (
                  'Adding...'
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Add Indicator
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
