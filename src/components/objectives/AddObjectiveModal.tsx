import { useState, useMemo } from 'react';
import { X, ChevronLeft, Target, PenTool, BookOpen, Check, Search, Library } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { OBJECTIVE_CATALOG } from '../../lib/objectiveCatalog';
import type { ObjectiveLibrary } from '../../lib/objectiveLibraryService';

interface AddObjectiveModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'choose' | 'custom' | 'library' | 'customize';

function formatLabel(str: string): string {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getDomainColor(domain: string) {
  switch (domain) {
    case 'communication': return 'bg-blue-100 text-blue-700';
    case 'dissemination': return 'bg-green-100 text-green-700';
    case 'exploitation': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getMaturityBadge(level: string) {
  switch (level) {
    case 'basic': return 'bg-slate-100 text-slate-600';
    case 'advanced': return 'bg-blue-100 text-blue-600';
    case 'expert': return 'bg-purple-100 text-purple-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}

const MEANS_OF_VERIFICATION = [
  'Website analytics reports',
  'Social media engagement metrics',
  'Event attendance records',
  'Publication download counts',
  'Media coverage clippings',
  'Survey results and feedback',
  'Stakeholder meeting minutes',
  'Newsletter subscription data',
  'Citation and reference tracking',
  'Training participation records',
  'Partnership agreements signed',
  'Policy briefs distributed',
  'Conference presentations delivered',
  'Peer-reviewed publications',
  'Patent or IP filings',
  'Licensing agreements',
  'Pilot deployment reports',
  'User adoption statistics',
  'Impact assessment reports',
  'External evaluation reports',
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', description: 'Initial planning phase' },
  { value: 'planned', label: 'Planned', description: 'Approved and scheduled' },
  { value: 'in_progress', label: 'In Progress', description: 'Currently being implemented' },
  { value: 'completed', label: 'Completed', description: 'Fully achieved' },
  { value: 'on_hold', label: 'On Hold', description: 'Temporarily paused' },
];

export default function AddObjectiveModal({ projectId, onClose, onSuccess }: AddObjectiveModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customDomain, setCustomDomain] = useState('communication');
  const [customPriority, setCustomPriority] = useState('medium');
  const [customStatus, setCustomStatus] = useState('draft');
  const [customNotes, setCustomNotes] = useState('');
  const [selectedMoV, setSelectedMoV] = useState<string[]>([]);
  const [otherMoV, setOtherMoV] = useState('');
  const [showOtherMoV, setShowOtherMoV] = useState(false);
  const [customTargetDate, setCustomTargetDate] = useState('');
  const [customResponsible, setCustomResponsible] = useState('');

  // Library — uses static catalog (same pattern as IndicatorLibrary page)
  const [selectedLibObjective, setSelectedLibObjective] = useState<ObjectiveLibrary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState<string>('all');

  const filteredCatalog = useMemo(() => {
    let results = [...OBJECTIVE_CATALOG];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(obj =>
        obj.title.toLowerCase().includes(term) ||
        obj.code.toLowerCase().includes(term) ||
        obj.description.toLowerCase().includes(term)
      );
    }

    if (filterDomain !== 'all') {
      results = results.filter(obj => obj.domain === filterDomain);
    }

    return results;
  }, [searchTerm, filterDomain]);

  const buildMeansOfVerification = (): string[] => {
    const movList = [...selectedMoV];
    if (showOtherMoV && otherMoV.trim()) {
      movList.push(otherMoV.trim());
    }
    return movList;
  };

  const handleCreateCustom = async () => {
    if (!customTitle.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('project_objectives')
        .insert({
          project_id: projectId,
          title: customTitle.trim(),
          description: customDescription.trim() || null,
          domain: customDomain,
          priority: customPriority,
          status: customStatus,
          notes: customNotes.trim() || null,
          means_of_verification: buildMeansOfVerification(),
          target_date: customTargetDate || null,
          responsible_person: customResponsible.trim() || null,
          source: 'manual',
        });

      if (insertError) {
        console.error('[AddObjective] Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create objective');
      }

      onSuccess();
    } catch (err: any) {
      console.error('[AddObjective] Create error:', err);
      setError(err?.message || 'Failed to create objective');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFromLibrary = async () => {
    if (!selectedLibObjective) return;

    try {
      setSubmitting(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('project_objectives')
        .insert({
          project_id: projectId,
          objective_lib_id: selectedLibObjective.id,
          title: selectedLibObjective.title,
          description: selectedLibObjective.description || '',
          domain: customDomain,
          priority: customPriority,
          status: customStatus,
          notes: customNotes.trim() || null,
          means_of_verification: buildMeansOfVerification(),
          target_date: customTargetDate || null,
          responsible_person: customResponsible.trim() || null,
          source: 'library',
        });

      if (insertError) {
        console.error('[AddObjective] Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create objective');
      }

      onSuccess();
    } catch (err: any) {
      console.error('[AddObjective] Create error:', err);
      setError(err?.message || 'Failed to create objective');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'customize') {
      setStep('library');
      setSelectedLibObjective(null);
    } else {
      setStep('choose');
    }
  };

  const toggleMoV = (mov: string) => {
    setSelectedMoV(prev =>
      prev.includes(mov) ? prev.filter(m => m !== mov) : [...prev, mov]
    );
  };

  // Shared form fields for both custom and library customize steps
  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
          <select
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="communication">Communication</option>
            <option value="dissemination">Dissemination</option>
            <option value="exploitation">Exploitation</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={customPriority}
            onChange={(e) => setCustomPriority(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {STATUS_OPTIONS.find(o => o.value === customStatus)?.description}
          </p>
        </div>
      </div>

      {/* Target Date & Responsible Person */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Date (optional)</label>
          <input
            type="date"
            value={customTargetDate}
            onChange={(e) => setCustomTargetDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Responsible Person (optional)</label>
          <input
            type="text"
            value={customResponsible}
            onChange={(e) => setCustomResponsible(e.target.value)}
            placeholder="e.g., WP3 Lead, Communications Officer"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Means of Verification */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Means of Verification
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Select one or more methods to verify achievement of this objective
        </p>
        <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto border border-gray-200 rounded-lg p-3">
          {MEANS_OF_VERIFICATION.map((mov) => {
            const isSelected = selectedMoV.includes(mov);
            return (
              <button
                key={mov}
                type="button"
                onClick={() => toggleMoV(mov)}
                className={`flex items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className={`w-4 h-4 rounded border mr-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="leading-tight">{mov}</span>
              </button>
            );
          })}

          {/* Other option */}
          <button
            type="button"
            onClick={() => setShowOtherMoV(!showOtherMoV)}
            className={`flex items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              showOtherMoV
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className={`w-4 h-4 rounded border mr-2 flex-shrink-0 flex items-center justify-center ${
              showOtherMoV ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
            }`}>
              {showOtherMoV && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="leading-tight">Other (specify below)</span>
          </button>
        </div>

        {showOtherMoV && (
          <div className="mt-3">
            <input
              type="text"
              value={otherMoV}
              onChange={(e) => setOtherMoV(e.target.value)}
              placeholder="Describe your verification method..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {selectedMoV.length > 0 && (
          <p className="text-xs text-blue-600 mt-2">
            {selectedMoV.length} method{selectedMoV.length > 1 ? 's' : ''} selected
            {showOtherMoV && otherMoV.trim() ? ' + 1 custom' : ''}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
        <textarea
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Any additional context or notes..."
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {step !== 'choose' && (
              <button
                onClick={handleBack}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'choose' && 'Add Objective'}
              {step === 'custom' && 'Create Custom Objective'}
              {step === 'library' && 'Choose from Library'}
              {step === 'customize' && 'Customize Objective'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Step 1: Choose method */}
          {step === 'choose' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">How would you like to add an objective?</p>

              <button
                onClick={() => setStep('custom')}
                className="w-full flex items-center p-5 border-2 border-blue-200 bg-blue-50 rounded-lg hover:border-blue-400 hover:bg-blue-100 transition-all text-left"
              >
                <div className="p-3 bg-blue-600 text-white rounded-lg mr-4">
                  <PenTool className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">Create Custom Objective</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Define your own objective with title, description, status, and means of verification
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStep('library')}
                className="w-full flex items-center p-5 border-2 border-green-200 bg-green-50/50 rounded-lg hover:border-[#1BAE70] hover:bg-green-50 transition-all text-left"
              >
                <div className="p-3 bg-[#1BAE70] text-white rounded-lg mr-4">
                  <Library className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">Choose from Library</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Browse {OBJECTIVE_CATALOG.length} professional CDE objectives — filter by domain, search, and customise
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2a: Custom objective form */}
          {step === 'custom' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Increase stakeholder awareness of project results"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Describe what this objective aims to achieve..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {renderFormFields()}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustom}
                  disabled={submitting || !customTitle.trim()}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>Create Objective</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2b: Library selection — powered by static OBJECTIVE_CATALOG */}
          {step === 'library' && (
            <div className="space-y-4">
              {/* Search + domain filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title, code, or description..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1BAE70] focus:border-transparent text-sm"
                    autoFocus
                  />
                </div>
                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1BAE70] focus:border-transparent"
                >
                  <option value="all">All Domains</option>
                  <option value="communication">Communication</option>
                  <option value="dissemination">Dissemination</option>
                  <option value="exploitation">Exploitation</option>
                </select>
              </div>

              {/* Result count + link to full library */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {filteredCatalog.length} of {OBJECTIVE_CATALOG.length} objectives
                </span>
                <Link
                  to="/objective-library"
                  onClick={onClose}
                  className="text-[#1BAE70] hover:text-[#06752E] font-medium flex items-center gap-1"
                >
                  <Library className="h-3 w-3" />
                  Browse full library
                </Link>
              </div>

              {/* Objective cards */}
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-10">
                  <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-3 text-sm">No objectives match your search</p>
                  <button
                    onClick={() => { setSearchTerm(''); setFilterDomain('all'); }}
                    className="text-[#1BAE70] font-medium hover:underline text-sm mr-3"
                  >
                    Clear filters
                  </button>
                  <button
                    onClick={() => setStep('custom')}
                    className="text-blue-600 font-medium hover:underline text-sm"
                  >
                    Create custom instead
                  </button>
                </div>
              ) : (
                <div className="grid gap-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredCatalog.map((objective) => (
                    <button
                      key={objective.id}
                      onClick={() => {
                        setSelectedLibObjective(objective);
                        // Pre-fill domain from the library objective
                        setCustomDomain(objective.domain);
                        setStep('customize');
                      }}
                      className="text-left p-3.5 border border-gray-200 rounded-lg hover:border-[#1BAE70] hover:bg-green-50/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-medium text-gray-900 text-sm leading-snug group-hover:text-[#06752E] transition-colors">
                          {objective.title}
                        </h4>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${getMaturityBadge(objective.maturity_level)}`}>
                          {formatLabel(objective.maturity_level)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">
                        {objective.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getDomainColor(objective.domain)}`}>
                          {formatLabel(objective.domain)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{objective.code}</span>
                        {objective.suggested_indicator_codes.length > 0 && (
                          <span className="text-[10px] text-gray-400">
                            {objective.suggested_indicator_codes.length} suggested KPIs
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Customize library objective */}
          {step === 'customize' && selectedLibObjective && (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Target className="w-5 h-5 text-[#1BAE70] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm">{selectedLibObjective.title}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${getDomainColor(selectedLibObjective.domain)}`}>
                        {formatLabel(selectedLibObjective.domain)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{selectedLibObjective.description}</p>
                    {selectedLibObjective.suggested_indicator_codes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-[10px] text-gray-500 mr-1">Suggested KPIs:</span>
                        {selectedLibObjective.suggested_indicator_codes.map(code => (
                          <span key={code} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-mono">
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {renderFormFields()}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFromLibrary}
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>Create Objective</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
