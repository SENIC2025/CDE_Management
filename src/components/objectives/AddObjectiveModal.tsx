import { useState, useEffect } from 'react';
import { X, ChevronLeft, Sparkles, Target } from 'lucide-react';
import { objectiveLibraryService, type ObjectiveLibrary } from '../../lib/objectiveLibraryService';
import { projectObjectivesService, type ObjectiveCustomization } from '../../lib/projectObjectivesService';
import SearchBar from '../SearchBar';

interface AddObjectiveModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddObjectiveModal({ projectId, onClose, onSuccess }: AddObjectiveModalProps) {
  const [step, setStep] = useState<'select' | 'customize'>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [libraryObjectives, setLibraryObjectives] = useState<ObjectiveLibrary[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveLibrary | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [maturityFilter, setMaturityFilter] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');

  const [customization, setCustomization] = useState<ObjectiveCustomization>({
    priority: 'medium',
    stakeholder_types: [],
    time_horizon: 'medium',
    notes: ''
  });

  const [applyKPIs, setApplyKPIs] = useState(true);

  useEffect(() => {
    loadLibraryObjectives();
  }, [domainFilter, outcomeFilter, maturityFilter, programmeFilter, searchTerm]);

  const loadLibraryObjectives = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await objectiveLibraryService.listObjectives({
        domain: domainFilter || undefined,
        outcome_type: outcomeFilter || undefined,
        maturity_level: maturityFilter || undefined,
        programme: programmeFilter || undefined,
        search: searchTerm || undefined
      });
      setLibraryObjectives(data);
    } catch (err: any) {
      console.error('[AddObjective] Error loading library:', err);
      setError(err?.message || 'Failed to load objective library');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectObjective = (objective: ObjectiveLibrary) => {
    setSelectedObjective(objective);
    setCustomization({
      priority: 'medium',
      stakeholder_types: objective.default_stakeholder_types || [],
      time_horizon: 'medium',
      notes: ''
    });
    setStep('customize');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedObjective(null);
  };

  const handleSubmit = async (applyKPIsNow: boolean) => {
    if (!selectedObjective) return;

    try {
      setSubmitting(true);
      setError(null);

      const objectiveId = await projectObjectivesService.createObjectiveFromLibrary(
        projectId,
        selectedObjective.objective_lib_id,
        customization
      );

      if (applyKPIsNow) {
        await projectObjectivesService.applyKPISuggestions(projectId, objectiveId);
      }

      onSuccess();
    } catch (err: any) {
      console.error('[AddObjective] Error creating objective:', err);
      setError(err?.message || 'Failed to create objective');
      setSubmitting(false);
    }
  };

  const domainColors = {
    communication: 'border-blue-500 bg-blue-50',
    dissemination: 'border-green-500 bg-green-50',
    exploitation: 'border-orange-500 bg-orange-50'
  };

  const stakeholderOptions = [
    'policymakers',
    'practitioners',
    'researchers',
    'industry',
    'civil_society',
    'public',
    'consortium',
    'educators',
    'students',
    'media'
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {step === 'customize' && (
              <button
                onClick={handleBack}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'select' ? 'Choose from Objective Library' : 'Customize Objective'}
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

          {step === 'select' && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                  <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search objectives..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Domain</label>
                  <select
                    value={domainFilter}
                    onChange={(e) => setDomainFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">All</option>
                    <option value="communication">Communication</option>
                    <option value="dissemination">Dissemination</option>
                    <option value="exploitation">Exploitation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Outcome Type</label>
                  <select
                    value={outcomeFilter}
                    onChange={(e) => setOutcomeFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">All</option>
                    {objectiveLibraryService.getOutcomeTypeOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Programme</label>
                  <select
                    value={programmeFilter}
                    onChange={(e) => setProgrammeFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">All</option>
                    {objectiveLibraryService.getProgrammeOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : libraryObjectives.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  No objectives match your filters
                </div>
              ) : (
                <div className="grid gap-3 max-h-[500px] overflow-y-auto">
                  {libraryObjectives.map((objective) => (
                    <button
                      key={objective.objective_lib_id}
                      onClick={() => handleSelectObjective(objective)}
                      className={`text-left p-4 border-2 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all ${domainColors[objective.domain]}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{objective.title}</h4>
                          <p className="text-sm text-gray-600">{objective.description}</p>
                        </div>
                        {(objective.suggested_kpi_bundle_id || objective.suggested_indicator_codes.length > 0) && (
                          <Sparkles className="w-5 h-5 text-purple-500 ml-3 flex-shrink-0" title="Has KPI suggestions" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2 py-1 bg-white rounded border border-gray-200 capitalize">
                          {objective.outcome_type.replace(/_/g, ' ')}
                        </span>
                        <span className="px-2 py-1 bg-white rounded border border-gray-200 capitalize">
                          {objective.maturity_level}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'customize' && selectedObjective && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Target className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{selectedObjective.title}</h4>
                    <p className="text-sm text-gray-600">{selectedObjective.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={customization.priority}
                    onChange={(e) => setCustomization({ ...customization, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Horizon <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={customization.time_horizon}
                    onChange={(e) => setCustomization({ ...customization, time_horizon: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="short">Short term (0-12 months)</option>
                    <option value="medium">Medium term (1-2 years)</option>
                    <option value="long">Long term (2+ years)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Stakeholder Groups
                </label>
                <div className="flex flex-wrap gap-2">
                  {stakeholderOptions.map((stakeholder) => {
                    const isSelected = customization.stakeholder_types.includes(stakeholder);
                    return (
                      <button
                        key={stakeholder}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? customization.stakeholder_types.filter((s) => s !== stakeholder)
                            : [...customization.stakeholder_types, stakeholder];
                          setCustomization({ ...customization, stakeholder_types: updated });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {stakeholder.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project-Specific Notes (Optional)
                </label>
                <textarea
                  value={customization.notes}
                  onChange={(e) => setCustomization({ ...customization, notes: e.target.value })}
                  placeholder="Add any project-specific context or customization notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {(selectedObjective.suggested_kpi_bundle_id || selectedObjective.suggested_indicator_codes.length > 0) && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyKPIs}
                      onChange={(e) => setApplyKPIs(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">
                      Apply suggested KPIs automatically
                    </span>
                  </label>
                  <p className="text-xs text-purple-700 mt-2 ml-6">
                    This objective has {selectedObjective.suggested_indicator_codes.length} suggested KPI indicators
                    {selectedObjective.suggested_kpi_bundle_id && ' and a recommended KPI bundle'}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit(applyKPIs)}
                  disabled={submitting}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{applyKPIs ? 'Create & Apply KPIs' : 'Create Objective'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
