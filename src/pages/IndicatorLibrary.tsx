import { useState, useMemo } from 'react';
import { Library, Filter, X, Search, TrendingUp, BookOpen, Target, ChevronDown, BarChart3, Layers } from 'lucide-react';
import { INDICATOR_CATALOG } from '../lib/indicatorCatalog';
import type { IndicatorLibrary as IndicatorType } from '../lib/indicatorLibraryService';

export default function IndicatorLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedMaturity, setSelectedMaturity] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType | null>(null);

  // Domain stats
  const domainStats = useMemo(() => {
    const stats = { communication: 0, dissemination: 0, exploitation: 0 };
    INDICATOR_CATALOG.forEach(ind => { stats[ind.domain]++; });
    return stats;
  }, []);

  // Filter indicators
  const filteredIndicators = useMemo(() => {
    let results = [...INDICATOR_CATALOG];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(ind =>
        ind.name.toLowerCase().includes(term) ||
        ind.code.toLowerCase().includes(term) ||
        ind.definition.toLowerCase().includes(term) ||
        (ind.rationale && ind.rationale.toLowerCase().includes(term))
      );
    }

    if (selectedDomain !== 'all') {
      results = results.filter(ind => ind.domain === selectedDomain);
    }

    if (selectedMaturity !== 'all') {
      results = results.filter(ind => ind.maturity_level === selectedMaturity);
    }

    return results;
  }, [searchTerm, selectedDomain, selectedMaturity]);

  // Group by domain for section headers
  const groupedIndicators = useMemo(() => {
    const groups: Record<string, IndicatorType[]> = {};
    filteredIndicators.forEach(ind => {
      if (!groups[ind.domain]) groups[ind.domain] = [];
      groups[ind.domain].push(ind);
    });
    return groups;
  }, [filteredIndicators]);

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

  function getDomainHeaderColor(domain: string) {
    switch (domain) {
      case 'communication': return 'from-blue-500 to-blue-600';
      case 'dissemination': return 'from-green-500 to-green-600';
      case 'exploitation': return 'from-amber-500 to-amber-600';
      default: return 'from-slate-500 to-slate-600';
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

  const domainOrder = ['communication', 'dissemination', 'exploitation'];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Library className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">CDE Indicator Library</h1>
              <p className="text-sm text-slate-600">
                60 professional KPIs for Communication, Dissemination & Exploitation in EU-funded projects
              </p>
            </div>
          </div>

          {/* Domain stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <button
              onClick={() => setSelectedDomain(selectedDomain === 'communication' ? 'all' : 'communication')}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                selectedDomain === 'communication'
                  ? 'bg-blue-50 border-blue-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/50'
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-slate-900">{domainStats.communication}</div>
                <div className="text-xs text-slate-600 font-medium">Communication</div>
              </div>
            </button>
            <button
              onClick={() => setSelectedDomain(selectedDomain === 'dissemination' ? 'all' : 'dissemination')}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                selectedDomain === 'dissemination'
                  ? 'bg-green-50 border-green-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-green-200 hover:bg-green-50/50'
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-slate-900">{domainStats.dissemination}</div>
                <div className="text-xs text-slate-600 font-medium">Dissemination</div>
              </div>
            </button>
            <button
              onClick={() => setSelectedDomain(selectedDomain === 'exploitation' ? 'all' : 'exploitation')}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                selectedDomain === 'exploitation'
                  ? 'bg-amber-50 border-amber-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/50'
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-slate-900">{domainStats.exploitation}</div>
                <div className="text-xs text-slate-600 font-medium">Exploitation</div>
              </div>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, code, or definition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Domain</label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-4 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredIndicators.length}</span> of {INDICATOR_CATALOG.length} indicators
          </div>
          {(selectedDomain !== 'all' || selectedMaturity !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDomain('all');
                setSelectedMaturity('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>

        {/* Grouped indicator cards */}
        {domainOrder.filter(d => groupedIndicators[d]).map(domain => {
          const DomainIcon = getDomainIcon(domain);
          const indicators = groupedIndicators[domain];
          return (
            <div key={domain} className="mb-10">
              {/* Section header (only show when viewing all domains) */}
              {selectedDomain === 'all' && (
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${getDomainHeaderColor(domain)} flex items-center justify-center`}>
                    <DomainIcon className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{formatLabel(domain)}</h2>
                  <span className="text-sm text-slate-500">({indicators.length} indicators)</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {indicators.map((indicator) => (
                  <div
                    key={indicator.indicator_id}
                    onClick={() => setSelectedIndicator(indicator)}
                    className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
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
                      <div className="text-xs font-mono text-slate-400 mb-1">{indicator.code}</div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                        {indicator.name}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{indicator.definition}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {formatLabel(indicator.unit)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {formatLabel(indicator.collection_frequency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredIndicators.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No indicators match your search</h3>
            <p className="text-slate-600 mb-4">Try adjusting your search term or clearing the filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDomain('all');
                setSelectedMaturity('all');
              }}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedIndicator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedIndicator(null)}>
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex-1">
                <div className="text-xs font-mono text-slate-400 mb-1">{selectedIndicator.code}</div>
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
              {/* Badges */}
              <div className="flex gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded border text-sm font-medium ${getDomainColor(selectedIndicator.domain)}`}>
                  {formatLabel(selectedIndicator.domain)}
                </span>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getMaturityBadge(selectedIndicator.maturity_level)}`}>
                  {formatLabel(selectedIndicator.maturity_level)}
                </span>
              </div>

              {/* Definition */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Definition</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.definition}</p>
              </div>

              {/* Rationale */}
              {selectedIndicator.rationale && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Rationale</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedIndicator.rationale}</p>
                </div>
              )}

              {/* Limitations */}
              {selectedIndicator.limitations && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <h3 className="text-sm font-semibold text-amber-900 mb-2">Limitations</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">{selectedIndicator.limitations}</p>
                </div>
              )}

              {/* Interpretation */}
              {selectedIndicator.interpretation_notes && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Interpretation Notes</h3>
                  <p className="text-sm text-blue-800 leading-relaxed">{selectedIndicator.interpretation_notes}</p>
                </div>
              )}

              {/* Technical details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Unit</div>
                  <div className="text-sm font-semibold text-slate-900">{formatLabel(selectedIndicator.unit)}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Aggregation</div>
                  <div className="text-sm font-semibold text-slate-900">{formatLabel(selectedIndicator.aggregation_method)}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Data Source</div>
                  <div className="text-sm font-semibold text-slate-900">{formatLabel(selectedIndicator.data_source)}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Frequency</div>
                  <div className="text-sm font-semibold text-slate-900">{formatLabel(selectedIndicator.collection_frequency)}</div>
                </div>
              </div>

              {/* Default values */}
              {(selectedIndicator.default_baseline !== null || selectedIndicator.default_target !== null) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedIndicator.default_baseline !== null && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Suggested Baseline</div>
                      <div className="text-lg font-bold text-slate-900">
                        {selectedIndicator.default_baseline.toLocaleString()} <span className="text-xs font-normal text-slate-500">{selectedIndicator.unit}</span>
                      </div>
                    </div>
                  )}
                  {selectedIndicator.default_target !== null && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Suggested Target</div>
                      <div className="text-lg font-bold text-blue-700">
                        {selectedIndicator.default_target.toLocaleString()} <span className="text-xs font-normal text-slate-500">{selectedIndicator.unit}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
