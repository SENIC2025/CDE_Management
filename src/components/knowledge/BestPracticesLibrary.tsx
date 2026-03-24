import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Globe,
  BookOpen,
  Filter,
  CheckCircle2,
  Lightbulb,
  Megaphone,
  Share2,
  Briefcase
} from 'lucide-react';
import {
  EU_BEST_PRACTICES,
  PROGRAMME_LIST,
  DOMAIN_LIST,
  PHASE_LIST
} from '../../lib/knowledgeData';
import type { BestPractice } from '../../lib/knowledgeData';

const domainIcons: Record<string, React.ReactNode> = {
  general: <Globe className="h-4 w-4" />,
  communication: <Megaphone className="h-4 w-4" />,
  dissemination: <Share2 className="h-4 w-4" />,
  exploitation: <Briefcase className="h-4 w-4" />
};

const domainColors: Record<string, string> = {
  general: 'text-slate-600 bg-slate-50 border-slate-200',
  communication: 'text-blue-600 bg-blue-50 border-blue-200',
  dissemination: 'text-green-600 bg-green-50 border-green-200',
  exploitation: 'text-purple-600 bg-purple-50 border-purple-200'
};

const phaseColors: Record<string, string> = {
  all: 'bg-slate-100 text-slate-600',
  planning: 'bg-cyan-100 text-cyan-700',
  execution: 'bg-orange-100 text-orange-700',
  reporting: 'bg-indigo-100 text-indigo-700'
};

export default function BestPracticesLibrary() {
  const [filterProgramme, setFilterProgramme] = useState('all');
  const [filterDomain, setFilterDomain] = useState<string>('');
  const [filterPhase, setFilterPhase] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const filtered = EU_BEST_PRACTICES.filter(bp => {
    if (filterProgramme !== 'all' && bp.programme !== 'all' && bp.programme !== filterProgramme) return false;
    if (filterDomain && bp.domain !== filterDomain) return false;
    if (filterPhase && bp.phase !== 'all' && bp.phase !== filterPhase) return false;
    return true;
  });

  function toggleExpand(id: string) {
    const next = new Set(expandedCards);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCards(next);
  }

  // Group by programme
  const grouped: Record<string, BestPractice[]> = {};
  filtered.forEach(bp => {
    const key = bp.programme === 'all' ? 'All Programmes' : bp.programme;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(bp);
  });

  // Sort: "All Programmes" first, then alphabetical
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (a === 'All Programmes') return -1;
    if (b === 'All Programmes') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          Filters:
        </div>

        <select
          value={filterProgramme}
          onChange={e => setFilterProgramme(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
        >
          {PROGRAMME_LIST.map(p => (
            <option key={p} value={p}>{p === 'all' ? 'All Programmes' : p}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
          <button
            onClick={() => setFilterDomain('')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !filterDomain ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          {DOMAIN_LIST.map(d => (
            <button
              key={d}
              onClick={() => setFilterDomain(filterDomain === d ? '' : d)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterDomain === d ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
          <button
            onClick={() => setFilterPhase('')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !filterPhase ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Phases
          </button>
          {PHASE_LIST.filter(p => p !== 'all').map(p => (
            <button
              key={p}
              onClick={() => setFilterPhase(filterPhase === p ? '' : p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterPhase === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-slate-500">
        Showing {filtered.length} of {EU_BEST_PRACTICES.length} best practices
      </div>

      {/* Grouped Cards */}
      {sortedGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No best practices match your filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(groupName => (
            <div key={groupName}>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">{groupName}</h3>
                <span className="text-xs text-slate-400">({grouped[groupName].length})</span>
              </div>

              <div className="space-y-2">
                {grouped[groupName].map(bp => {
                  const isExpanded = expandedCards.has(bp.id);
                  const dColor = domainColors[bp.domain] || domainColors.general;

                  return (
                    <div
                      key={bp.id}
                      className={`border rounded-lg transition-all ${dColor}`}
                    >
                      <button
                        onClick={() => toggleExpand(bp.id)}
                        className="w-full flex items-start gap-3 p-4 text-left"
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {domainIcons[bp.domain]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-800">{bp.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${phaseColors[bp.phase]}`}>
                              {bp.phase === 'all' ? 'All Phases' : bp.phase}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {bp.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0 mt-1">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 ml-7">
                          <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-slate-600">
                            <Lightbulb className="h-3.5 w-3.5" />
                            Practical Tips
                          </div>
                          <ul className="space-y-1.5">
                            {bp.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                          {bp.source && (
                            <p className="text-[10px] text-slate-400 mt-3">Source: {bp.source}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
