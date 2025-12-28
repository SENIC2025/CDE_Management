import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
import { Library, Filter, Plus, X, Search, TrendingUp, BookOpen, Target } from 'lucide-react';

interface Indicator {
  indicator_id: string;
  code: string;
  name: string;
  domain: 'communication' | 'dissemination' | 'exploitation';
  definition: string;
  rationale: string;
  limitations: string;
  interpretation_notes: string;
  unit: string;
  aggregation_method: string;
  data_source: string;
  collection_frequency: string;
  maturity_level: 'basic' | 'advanced' | 'expert';
  is_system: boolean;
  is_active: boolean;
  objective_types?: string[];
  channels?: string[];
  stakeholders?: string[];
  project_count?: number;
}

export default function IndicatorLibrary() {
  const { isOrgAdmin } = useEntitlements();
  const { isPlatformAdmin } = usePlatformAdmin();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedMaturity, setSelectedMaturity] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);

  useEffect(() => {
    loadIndicators();
  }, []);

  useEffect(() => {
    filterIndicators();
  }, [indicators, searchTerm, selectedDomain, selectedMaturity]);

  async function loadIndicators() {
    try {
      setLoading(true);

      const { data: indicatorData, error } = await supabase
        .from('indicator_library')
        .select('*')
        .eq('is_active', true)
        .order('domain', { ascending: true })
        .order('code', { ascending: true });

      if (error) throw error;

      if (indicatorData) {
        const enrichedIndicators = await Promise.all(
          indicatorData.map(async (indicator) => {
            const [objectives, channels, stakeholders, projectCount] = await Promise.all([
              supabase
                .from('indicator_objective_types')
                .select('objective_type')
                .eq('indicator_id', indicator.indicator_id),
              supabase
                .from('indicator_channels')
                .select('channel_type')
                .eq('indicator_id', indicator.indicator_id),
              supabase
                .from('indicator_stakeholders')
                .select('stakeholder_type')
                .eq('indicator_id', indicator.indicator_id),
              supabase
                .from('project_indicators')
                .select('project_indicator_id', { count: 'exact', head: true })
                .eq('indicator_id', indicator.indicator_id)
            ]);

            return {
              ...indicator,
              objective_types: objectives.data?.map(o => o.objective_type) || [],
              channels: channels.data?.map(c => c.channel_type) || [],
              stakeholders: stakeholders.data?.map(s => s.stakeholder_type) || [],
              project_count: projectCount.count || 0
            };
          })
        );

        setIndicators(enrichedIndicators);
      }
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

    if (selectedMaturity !== 'all') {
      filtered = filtered.filter(ind => ind.maturity_level === selectedMaturity);
    }

    setFilteredIndicators(filtered);
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

  function getMaturityBadge(level: string) {
    const colors = {
      basic: 'bg-slate-100 text-slate-700',
      advanced: 'bg-blue-100 text-blue-700',
      expert: 'bg-purple-100 text-purple-700'
    };
    return colors[level as keyof typeof colors] || colors.basic;
  }

  function formatLabel(str: string) {
    return str.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading indicator library...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Library className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Indicator Library</h1>
                <p className="text-sm text-slate-600">Professional KPI library for EU CDE projects</p>
              </div>
            </div>
            {(isOrgAdmin || isPlatformAdmin) && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Indicator
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search indicators by name, code, or definition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters && <X className="h-4 w-4" />}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Domain</label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Domains</option>
                  <option value="communication">Communication</option>
                  <option value="dissemination">Dissemination</option>
                  <option value="exploitation">Exploitation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Maturity Level</label>
                <select
                  value={selectedMaturity}
                  onChange={(e) => setSelectedMaturity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Levels</option>
                  <option value="basic">Basic</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDomain('all');
                    setSelectedMaturity('all');
                  }}
                  className="w-full px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 text-sm text-slate-600">
          Showing {filteredIndicators.length} of {indicators.length} indicators
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIndicators.map((indicator) => {
            const DomainIcon = getDomainIcon(indicator.domain);
            return (
              <div
                key={indicator.indicator_id}
                onClick={() => setSelectedIndicator(indicator)}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-1 rounded border text-xs font-medium ${getDomainColor(indicator.domain)}`}>
                    <div className="flex items-center gap-1">
                      <DomainIcon className="h-3 w-3" />
                      {formatLabel(indicator.domain)}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getMaturityBadge(indicator.maturity_level)}`}>
                    {formatLabel(indicator.maturity_level)}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="text-xs font-mono text-slate-500 mb-1">{indicator.code}</div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{indicator.name}</h3>
                  <p className="text-sm text-slate-600 line-clamp-3">{indicator.definition}</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Unit: {formatLabel(indicator.unit)}</span>
                    <span className="font-medium">Used in {indicator.project_count || 0} projects</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredIndicators.length === 0 && (
          <div className="text-center py-12">
            <Library className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No indicators found</h3>
            <p className="text-slate-600">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {selectedIndicator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
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

            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded border text-sm font-medium ${getDomainColor(selectedIndicator.domain)}`}>
                  {formatLabel(selectedIndicator.domain)}
                </span>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getMaturityBadge(selectedIndicator.maturity_level)}`}>
                  {formatLabel(selectedIndicator.maturity_level)}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Definition</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.definition}</p>
              </div>

              {selectedIndicator.rationale && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Rationale</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.rationale}</p>
                </div>
              )}

              {selectedIndicator.limitations && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Limitations</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.limitations}</p>
                </div>
              )}

              {selectedIndicator.interpretation_notes && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Interpretation Notes</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.interpretation_notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Unit</div>
                  <div className="text-sm font-medium">{formatLabel(selectedIndicator.unit)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Aggregation</div>
                  <div className="text-sm font-medium">{formatLabel(selectedIndicator.aggregation_method)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Data Source</div>
                  <div className="text-sm font-medium">{formatLabel(selectedIndicator.data_source)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Collection Frequency</div>
                  <div className="text-sm font-medium">{formatLabel(selectedIndicator.collection_frequency || 'Not specified')}</div>
                </div>
              </div>

              {selectedIndicator.objective_types && selectedIndicator.objective_types.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Objective Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIndicator.objective_types.map(type => (
                      <span key={type} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {formatLabel(type)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedIndicator.channels && selectedIndicator.channels.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Channels</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIndicator.channels.map(channel => (
                      <span key={channel} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                        {formatLabel(channel)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedIndicator.stakeholders && selectedIndicator.stakeholders.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Stakeholder Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIndicator.stakeholders.map(stakeholder => (
                      <span key={stakeholder} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
                        {formatLabel(stakeholder)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Currently used in <span className="font-semibold">{selectedIndicator.project_count || 0}</span> projects
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
