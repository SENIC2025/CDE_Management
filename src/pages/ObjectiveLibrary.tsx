import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Library, Filter, X, Search, TrendingUp, BookOpen, Target,
  ChevronDown, Plus, Check, Users, Radio, Lightbulb, ArrowRight,
  Layers, Shield, Rocket, GraduationCap, Eye, Handshake, Landmark,
  Leaf,
} from 'lucide-react';
import { OBJECTIVE_CATALOG } from '../lib/objectiveCatalog';
import type { ObjectiveLibrary as ObjectiveType } from '../lib/objectiveLibraryService';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';

// ── Toast ─────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <Check size={16} /> : <X size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────
function formatLabel(str: string): string {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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

function getDomainIcon(domain: string) {
  switch (domain) {
    case 'communication': return TrendingUp;
    case 'dissemination': return BookOpen;
    case 'exploitation': return Target;
    default: return Library;
  }
}

function getMaturityBadge(level: string) {
  const colors: Record<string, string> = {
    basic: 'bg-slate-100 text-slate-700',
    advanced: 'bg-blue-100 text-blue-700',
    expert: 'bg-purple-100 text-purple-700',
  };
  return colors[level] || colors.basic;
}

function getOutcomeIcon(type: string) {
  switch (type) {
    case 'visibility': return Eye;
    case 'knowledge': return Lightbulb;
    case 'capability': return GraduationCap;
    case 'engagement': return Handshake;
    case 'adoption': return Rocket;
    case 'policy_influence': return Landmark;
    case 'sustainability': return Leaf;
    default: return Layers;
  }
}

function getOutcomeColor(type: string) {
  switch (type) {
    case 'visibility': return 'bg-sky-100 text-sky-700';
    case 'knowledge': return 'bg-indigo-100 text-indigo-700';
    case 'capability': return 'bg-teal-100 text-teal-700';
    case 'engagement': return 'bg-pink-100 text-pink-700';
    case 'adoption': return 'bg-orange-100 text-orange-700';
    case 'policy_influence': return 'bg-violet-100 text-violet-700';
    case 'sustainability': return 'bg-emerald-100 text-emerald-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

const DOMAIN_ORDER = ['communication', 'dissemination', 'exploitation'];

// ── Main Component ────────────────────────────────────
export default function ObjectiveLibrary() {
  const { currentProject } = useProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  const [selectedMaturity, setSelectedMaturity] = useState<string>('all');
  const [selectedProgramme, setSelectedProgramme] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveType | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Stats ──────────────────────────────────────────
  const domainStats = useMemo(() => {
    const stats = { communication: 0, dissemination: 0, exploitation: 0 };
    OBJECTIVE_CATALOG.forEach(obj => { stats[obj.domain]++; });
    return stats;
  }, []);

  // ── Filter ─────────────────────────────────────────
  const filteredObjectives = useMemo(() => {
    let results = [...OBJECTIVE_CATALOG];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(obj =>
        obj.title.toLowerCase().includes(term) ||
        obj.code.toLowerCase().includes(term) ||
        obj.description.toLowerCase().includes(term)
      );
    }

    if (selectedDomain !== 'all') {
      results = results.filter(obj => obj.domain === selectedDomain);
    }

    if (selectedOutcome !== 'all') {
      results = results.filter(obj => obj.outcome_type === selectedOutcome);
    }

    if (selectedMaturity !== 'all') {
      results = results.filter(obj => obj.maturity_level === selectedMaturity);
    }

    if (selectedProgramme !== 'all') {
      results = results.filter(obj => obj.programme_relevance.includes(selectedProgramme));
    }

    return results;
  }, [searchTerm, selectedDomain, selectedOutcome, selectedMaturity, selectedProgramme]);

  // ── Group by domain ────────────────────────────────
  const groupedObjectives = useMemo(() => {
    const groups: Record<string, ObjectiveType[]> = {};
    filteredObjectives.forEach(obj => {
      if (!groups[obj.domain]) groups[obj.domain] = [];
      groups[obj.domain].push(obj);
    });
    return groups;
  }, [filteredObjectives]);

  const hasActiveFilters = selectedDomain !== 'all' || selectedOutcome !== 'all' || selectedMaturity !== 'all' || selectedProgramme !== 'all' || searchTerm;

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedDomain('all');
    setSelectedOutcome('all');
    setSelectedMaturity('all');
    setSelectedProgramme('all');
  }, []);

  // ── Add to project ─────────────────────────────────
  async function handleAddToProject(objective: ObjectiveType) {
    if (!currentProject) {
      setToast({ message: 'Select a project first to add objectives.', type: 'error' });
      return;
    }

    setAddingIds(prev => new Set(prev).add(objective.id));

    try {
      // Check for duplicates by matching library code in title
      const { data: existing } = await supabase
        .from('project_objectives')
        .select('id')
        .eq('project_id', currentProject.id)
        .eq('objective_lib_id', objective.id)
        .maybeSingle();

      if (existing) {
        setToast({ message: 'This objective is already in your project.', type: 'error' });
        return;
      }

      const { error } = await supabase.from('project_objectives').insert({
        project_id: currentProject.id,
        objective_lib_id: objective.id,
        title: objective.title,
        description: objective.description,
        domain: objective.domain,
        priority: 'medium',
        status: 'draft',
        source: 'library',
        means_of_verification: [],
      });

      if (error) throw error;

      setToast({ message: `"${objective.title}" added to ${currentProject.title}!`, type: 'success' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      console.error('[ObjectiveLibrary] Add to project error:', err);
      setToast({ message: 'Failed to add objective: ' + (err?.message || 'Unknown error'), type: 'error' });
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(objective.id);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6F4' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* ── Header ──────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1BAE70] to-[#06752E] flex items-center justify-center shadow-lg shadow-green-500/20">
              <Library className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">CDE Objective Library</h1>
              <p className="text-sm text-slate-600">
                {OBJECTIVE_CATALOG.length} professional objectives for Communication, Dissemination & Exploitation in EU-funded projects
              </p>
            </div>
          </div>

          {/* Domain stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {DOMAIN_ORDER.map(domain => {
              const DomainIcon = getDomainIcon(domain);
              const isActive = selectedDomain === domain;
              const colorMap: Record<string, { active: string; hover: string; gradient: string }> = {
                communication: { active: 'bg-blue-50 border-blue-300', hover: 'hover:border-blue-200 hover:bg-blue-50/50', gradient: 'from-blue-500 to-blue-600' },
                dissemination: { active: 'bg-green-50 border-green-300', hover: 'hover:border-green-200 hover:bg-green-50/50', gradient: 'from-green-500 to-green-600' },
                exploitation: { active: 'bg-amber-50 border-amber-300', hover: 'hover:border-amber-200 hover:bg-amber-50/50', gradient: 'from-amber-500 to-amber-600' },
              };
              const c = colorMap[domain];
              return (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(isActive ? 'all' : domain)}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                    isActive ? `${c.active} shadow-sm` : `bg-white border-slate-200 ${c.hover}`
                  }`}
                >
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                    <DomainIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-slate-900">{domainStats[domain as keyof typeof domainStats]}</div>
                    <div className="text-xs text-slate-600 font-medium">{formatLabel(domain)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search & Filters ────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1BAE70] focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-lg transition-colors flex items-center gap-2 text-sm ${
                hasActiveFilters
                  ? 'border-[#1BAE70] bg-green-50 text-[#06752E]'
                  : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && <span className="bg-[#1BAE70] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">!</span>}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Domain</label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1BAE70] focus:border-transparent text-sm"
                >
                  <option value="all">All Domains</option>
                  <option value="communication">Communication</option>
                  <option value="dissemination">Dissemination</option>
                  <option value="exploitation">Exploitation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Outcome Type</label>
                <select
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1BAE70] focus:border-transparent text-sm"
                >
                  <option value="all">All Outcome Types</option>
                  <option value="visibility">Visibility</option>
                  <option value="knowledge">Knowledge</option>
                  <option value="capability">Capability</option>
                  <option value="engagement">Engagement</option>
                  <option value="adoption">Adoption</option>
                  <option value="policy_influence">Policy Influence</option>
                  <option value="sustainability">Sustainability</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Maturity Level</label>
                <select
                  value={selectedMaturity}
                  onChange={(e) => setSelectedMaturity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1BAE70] focus:border-transparent text-sm"
                >
                  <option value="all">All Levels</option>
                  <option value="basic">Basic</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Programme</label>
                <select
                  value={selectedProgramme}
                  onChange={(e) => setSelectedProgramme(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1BAE70] focus:border-transparent text-sm"
                >
                  <option value="all">All Programmes</option>
                  <option value="horizon">Horizon Europe</option>
                  <option value="erasmus">Erasmus+</option>
                  <option value="interreg">Interreg</option>
                  <option value="generic">Generic / All</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Result count ────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredObjectives.length}</span> of {OBJECTIVE_CATALOG.length} objectives
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-[#1BAE70] hover:text-[#06752E] flex items-center gap-1">
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>

        {/* ── Grouped objective cards ──────────────────── */}
        {DOMAIN_ORDER.filter(d => groupedObjectives[d]).map(domain => {
          const DomainIcon = getDomainIcon(domain);
          const objectives = groupedObjectives[domain];
          return (
            <div key={domain} className="mb-10">
              {/* Section header (only when viewing all domains) */}
              {selectedDomain === 'all' && (
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${getDomainHeaderColor(domain)} flex items-center justify-center`}>
                    <DomainIcon className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{formatLabel(domain)}</h2>
                  <span className="text-sm text-slate-500">({objectives.length} objectives)</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {objectives.map(objective => {
                  const OutcomeIcon = getOutcomeIcon(objective.outcome_type);
                  const isAdding = addingIds.has(objective.id);
                  return (
                    <div
                      key={objective.id}
                      className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group flex flex-col"
                    >
                      {/* Top badges */}
                      <div className="flex items-start justify-between mb-3">
                        <div className={`px-2 py-1 rounded border text-xs font-medium ${getDomainColor(objective.domain)}`}>
                          <div className="flex items-center gap-1">
                            <DomainIcon className="h-3 w-3" />
                            {formatLabel(objective.domain)}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getMaturityBadge(objective.maturity_level)}`}>
                          {formatLabel(objective.maturity_level)}
                        </span>
                      </div>

                      {/* Content — clickable for detail */}
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedObjective(objective)}
                      >
                        <div className="text-xs font-mono text-slate-400 mb-1">{objective.code}</div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-2 group-hover:text-[#06752E] transition-colors leading-snug">
                          {objective.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                          {objective.description}
                        </p>
                      </div>

                      {/* Footer: outcome type + add button */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${getOutcomeColor(objective.outcome_type)}`}>
                          <OutcomeIcon className="h-3 w-3" />
                          {formatLabel(objective.outcome_type)}
                        </span>
                        {currentProject && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddToProject(objective); }}
                            disabled={isAdding}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1BAE70] hover:text-[#06752E] transition disabled:opacity-50"
                            title={`Add to ${currentProject.title}`}
                          >
                            {isAdding ? (
                              <span className="animate-spin">⟳</span>
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Add to project
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Empty state ─────────────────────────────── */}
        {filteredObjectives.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No objectives match your search</h3>
            <p className="text-slate-600 mb-4">Try adjusting your search term or clearing the filters</p>
            <button onClick={clearFilters} className="px-4 py-2 text-[#1BAE70] hover:text-[#06752E] font-medium">
              Clear all filters
            </button>
          </div>
        )}

        {/* ── CTA: Create custom if nothing fits ──────── */}
        {!hasActiveFilters && (
          <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6 text-center">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Don't see what you need?</h3>
            <p className="text-sm text-slate-600 mb-4">
              You can always create custom objectives tailored to your specific project requirements.
            </p>
            <Link
              to="/objectives"
              className="inline-flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] transition text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Go to Objectives
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          DETAIL MODAL
         ══════════════════════════════════════════════════ */}
      {selectedObjective && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedObjective(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-slate-400 mb-1">{selectedObjective.code}</div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedObjective.title}</h2>
              </div>
              <button
                onClick={() => setSelectedObjective(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0 ml-4"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Badges */}
              <div className="flex gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded border text-sm font-medium ${getDomainColor(selectedObjective.domain)}`}>
                  {formatLabel(selectedObjective.domain)}
                </span>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getOutcomeColor(selectedObjective.outcome_type)}`}>
                  {formatLabel(selectedObjective.outcome_type)}
                </span>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getMaturityBadge(selectedObjective.maturity_level)}`}>
                  {formatLabel(selectedObjective.maturity_level)}
                </span>
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Description</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedObjective.description}</p>
              </div>

              {/* Programme relevance */}
              {selectedObjective.programme_relevance.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Programme Relevance</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedObjective.programme_relevance.map(prog => (
                      <span key={prog} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                        {prog === 'horizon' ? 'Horizon Europe' :
                         prog === 'erasmus' ? 'Erasmus+' :
                         prog === 'interreg' ? 'Interreg' : 'Generic / All'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested stakeholders */}
              {selectedObjective.default_stakeholder_types.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Suggested Stakeholder Types
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedObjective.default_stakeholder_types.map(st => (
                      <span key={st} className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {formatLabel(st)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested channels */}
              {selectedObjective.suggested_channel_types.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Radio className="h-4 w-4" />
                    Suggested Channels
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedObjective.suggested_channel_types.map(ch => (
                      <span key={ch} className="px-2.5 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        {formatLabel(ch)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested indicators */}
              {selectedObjective.suggested_indicator_codes.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Suggested Indicators
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedObjective.suggested_indicator_codes.map(code => (
                      <span key={code} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded text-xs font-mono font-medium">
                        {code}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Visit the <Link to="/indicators" className="underline hover:text-amber-900 font-medium" onClick={() => setSelectedObjective(null)}>Indicator Library</Link> to see full details for each indicator.
                  </p>
                </div>
              )}

              {/* Add to project button */}
              {currentProject && (
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      handleAddToProject(selectedObjective);
                      setSelectedObjective(null);
                    }}
                    disabled={addingIds.has(selectedObjective.id)}
                    className="w-full flex items-center justify-center gap-2 bg-[#1BAE70] text-white px-4 py-3 rounded-lg hover:bg-[#06752E] transition text-sm font-medium disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add to {currentProject.title}
                  </button>
                </div>
              )}

              {!currentProject && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500 text-center">
                    Select a project from the sidebar to add this objective.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
