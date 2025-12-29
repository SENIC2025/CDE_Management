import { useState, useEffect, useCallback } from 'react';
import { X, Save, Check, AlertCircle, Sparkles } from 'lucide-react';
import { projectObjectivesService, type ProjectObjective } from '../../lib/projectObjectivesService';
import { objectiveLibraryService } from '../../lib/objectiveLibraryService';

interface ObjectiveEditPanelProps {
  projectId: string;
  objective: ProjectObjective;
  onClose: () => void;
  onUpdate: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export default function ObjectiveEditPanel({ projectId, objective, onClose, onUpdate }: ObjectiveEditPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'kpis' | 'activities'>('details');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [priority, setPriority] = useState(objective.priority);
  const [stakeholderTypes, setStakeholderTypes] = useState(objective.stakeholder_types);
  const [timeHorizon, setTimeHorizon] = useState(objective.time_horizon);
  const [notes, setNotes] = useState(objective.notes || '');

  const [suggestions, setSuggestions] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (objective.objective_lib_id) {
      loadSuggestions();
    }
  }, [objective.objective_lib_id]);

  const loadSuggestions = async () => {
    if (!objective.objective_lib_id) return;

    try {
      setLoadingSuggestions(true);
      const data = await objectiveLibraryService.getSuggestions(objective.objective_lib_id);
      setSuggestions(data);
    } catch (err) {
      console.error('[ObjectiveEdit] Error loading suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const saveChanges = useCallback(async () => {
    try {
      setSaveStatus('saving');

      await projectObjectivesService.updateObjective(objective.objective_id, {
        priority,
        stakeholder_types: stakeholderTypes,
        time_horizon: timeHorizon,
        notes: notes || null
      });

      setSaveStatus('saved');
      setLastSaved(new Date());

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('[ObjectiveEdit] Error saving:', err);
      setSaveStatus('failed');
    }
  }, [objective.objective_id, priority, stakeholderTypes, timeHorizon, notes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        priority !== objective.priority ||
        JSON.stringify(stakeholderTypes) !== JSON.stringify(objective.stakeholder_types) ||
        timeHorizon !== objective.time_horizon ||
        notes !== (objective.notes || '')
      ) {
        saveChanges();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [priority, stakeholderTypes, timeHorizon, notes, saveChanges]);

  const handleApplyKPIs = async () => {
    try {
      const result = await projectObjectivesService.applyKPISuggestions(projectId, objective.objective_id);

      const message = result.bundle_applied
        ? `Applied KPI bundle and ${result.kpis_added} additional indicators`
        : `Applied ${result.kpis_added} suggested indicators`;

      const skipMessage = result.kpis_skipped > 0
        ? ` (${result.kpis_skipped} already existed)`
        : '';

      alert(message + skipMessage);
      onUpdate();
    } catch (err: any) {
      console.error('[ObjectiveEdit] Error applying KPIs:', err);
      alert(err?.message || 'Failed to apply KPI suggestions');
    }
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
    <div className="fixed inset-0 bg-gray-900/50 flex items-end justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Edit Objective</h2>
            <p className="text-sm text-gray-600 mt-1">{objective.title}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              {saveStatus === 'saving' && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">
                    Saved {lastSaved && lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
              {saveStatus === 'failed' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">Failed to save</span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex space-x-6 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('kpis')}
              className={`px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'kpis'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              KPIs
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activities'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Activities
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Horizon</label>
                <select
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="short">Short term (0-12 months)</option>
                  <option value="medium">Medium term (1-2 years)</option>
                  <option value="long">Long term (2+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Stakeholder Groups</label>
                <div className="flex flex-wrap gap-2">
                  {stakeholderOptions.map((stakeholder) => {
                    const isSelected = stakeholderTypes.includes(stakeholder);
                    return (
                      <button
                        key={stakeholder}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? stakeholderTypes.filter((s) => s !== stakeholder)
                            : [...stakeholderTypes, stakeholder];
                          setStakeholderTypes(updated);
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Project-Specific Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any project-specific context or customization notes..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Domain:</span>
                    <span className="ml-2 font-medium capitalize">{objective.domain}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Outcome Type:</span>
                    <span className="ml-2 font-medium capitalize">{objective.outcome_type.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Source:</span>
                    <span className="ml-2 font-medium capitalize">{objective.source}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium capitalize">{objective.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kpis' && (
            <div className="space-y-6">
              {suggestions && (suggestions.kpi_bundle_id || suggestions.indicator_codes.length > 0) && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-900 mb-1">KPI Suggestions Available</h4>
                      <p className="text-sm text-purple-700">
                        This objective has {suggestions.indicator_codes.length} suggested KPI indicators
                        {suggestions.kpi_bundle_id && ' and a recommended KPI bundle'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleApplyKPIs}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                  >
                    Apply KPI Suggestions Now
                  </button>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Linked KPIs</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{objective.kpis_linked_count}</div>
                  <p className="text-sm text-gray-600">KPIs currently linked to this project</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Visit the Monitoring page to view and manage all project KPIs
                  </p>
                </div>
              </div>

              {suggestions && suggestions.channel_types.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">Suggested Channels</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.channel_types.map((channel: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {channel.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Linked Activities</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{objective.activities_linked_count}</div>
                  <p className="text-sm text-gray-600">Activities currently linked to this project</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Visit the Activities page to create and manage project activities
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Activities can be planned and executed to achieve this objective. Use the CDE Strategy Builder
                  to generate planned activities based on your strategic approach.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
