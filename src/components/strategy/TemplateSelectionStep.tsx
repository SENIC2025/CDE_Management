import { useState, useEffect } from 'react';
import { Check, Eye, Settings, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STRATEGY_TEMPLATES, type StrategyTemplate } from '../../lib/strategyTemplates';
import { strategyService, type CDEStrategy } from '../../lib/strategyService';
import { templateService, type CDEStrategyTemplate, type ApplyMode } from '../../lib/templateService';
import { useOrganisation } from '../../contexts/OrganisationContext';
import { useEntitlements } from '../../contexts/EntitlementsContext';

interface TemplateSelectionStepProps {
  strategy: CDEStrategy;
  projectId: string;
  onUpdate: () => void;
}

type TabType = 'system' | 'organisation';

export default function TemplateSelectionStep({ strategy, projectId, onUpdate }: TemplateSelectionStepProps) {
  const navigate = useNavigate();
  const { currentOrg } = useOrganisation();
  const { isOrgAdmin } = useEntitlements();
  const [activeTab, setActiveTab] = useState<TabType>('system');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(strategy.template_code);
  const [previewTemplate, setPreviewTemplate] = useState<StrategyTemplate | null>(null);
  const [orgTemplates, setOrgTemplates] = useState<CDEStrategyTemplate[]>([]);
  const [loadingOrgTemplates, setLoadingOrgTemplates] = useState(false);
  const [orgTemplatesError, setOrgTemplatesError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingOrgTemplate, setApplyingOrgTemplate] = useState<CDEStrategyTemplate | null>(null);
  const [selectedApplyMode, setSelectedApplyMode] = useState<ApplyMode>('merge');

  useEffect(() => {
    if (currentOrg?.id) {
      loadOrgTemplates();
    }
  }, [currentOrg?.id]);

  const loadOrgTemplates = async () => {
    if (!currentOrg?.id) return;

    try {
      setLoadingOrgTemplates(true);
      setOrgTemplatesError(null);
      const data = await templateService.listTemplates(currentOrg.id);
      setOrgTemplates(data);
    } catch (err: any) {
      console.error('[Templates] Error loading org templates:', err);
      setOrgTemplatesError(err?.message || 'Failed to load templates');
    } finally {
      setLoadingOrgTemplates(false);
    }
  };

  const handleApplyTemplate = async (templateCode: string) => {
    try {
      setApplying(true);
      await strategyService.applyTemplate(projectId, templateCode);
      setSelectedTemplate(templateCode);
      onUpdate();
    } catch (err) {
      console.error('Error applying template:', err);
      alert('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  const handleApplyOrgTemplate = (template: CDEStrategyTemplate) => {
    setApplyingOrgTemplate(template);
    setShowApplyModal(true);
  };

  const confirmApplyOrgTemplate = async () => {
    if (!applyingOrgTemplate) return;

    try {
      setApplying(true);
      const result = await templateService.applyTemplateToProject(
        projectId,
        applyingOrgTemplate.template_id,
        selectedApplyMode
      );

      alert(`Template applied successfully!\n\nObjectives added: ${result.objectives_added}\nChannels added: ${result.channels_added}\nKPIs added: ${result.kpis_added}`);

      setShowApplyModal(false);
      setApplyingOrgTemplate(null);
      await loadOrgTemplates();
      onUpdate();
    } catch (err: any) {
      console.error('[Templates] Error applying org template:', err);
      alert(err?.message || 'Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  const getProgrammeBadgeColor = (type: string) => {
    switch (type) {
      case 'horizon':
        return 'bg-blue-100 text-blue-700';
      case 'erasmus':
        return 'bg-purple-100 text-purple-700';
      case 'interreg':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Strategy Template</h2>
        <p className="text-gray-600">
          Start with a proven template aligned with your programme requirements, or build a custom strategy.
        </p>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'system'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            System Templates
          </button>
          <button
            onClick={() => setActiveTab('organisation')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'organisation'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Organisation Templates
          </button>
        </div>

        {activeTab === 'organisation' && isOrgAdmin && (
          <button
            onClick={() => navigate('/strategy/templates')}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            <Settings className="w-4 h-4" />
            <span>Manage Templates</span>
          </button>
        )}
      </div>

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {STRATEGY_TEMPLATES.map((template) => (
          <div
            key={template.template_code}
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedTemplate === template.template_code
                ? 'border-blue-600 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
            onClick={() => setSelectedTemplate(template.template_code)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              </div>
              {selectedTemplate === template.template_code && (
                <Check className="w-6 h-6 text-blue-600 flex-shrink-0 ml-2" />
              )}
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getProgrammeBadgeColor(template.programme_type)}`}>
                {template.programme_type.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                {template.default_objectives.length} objectives
              </span>
              <span className="text-xs text-gray-500">
                {template.default_channel_mix.length} channels
              </span>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewTemplate(template);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>

              {selectedTemplate === template.template_code && strategy.template_code !== template.template_code && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyTemplate(template.template_code);
                  }}
                  disabled={applying}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? 'Applying...' : 'Apply Template'}
                </button>
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      {activeTab === 'organisation' && (
        <div className="mb-8">
          {loadingOrgTemplates ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : orgTemplatesError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-red-800 mb-2">{orgTemplatesError}</div>
                  <button
                    onClick={() => loadOrgTemplates()}
                    className="text-sm text-red-700 font-medium hover:text-red-800 underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : orgTemplates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">No organisation templates available yet.</p>
              {isOrgAdmin && (
                <button
                  onClick={() => navigate('/strategy/templates')}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Settings className="w-4 h-4" />
                  <span>Create Template</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orgTemplates.map((template) => {
                const stats = templateService.getTemplateStats(template);

                return (
                  <div
                    key={template.template_id}
                    className="border-2 rounded-lg p-6 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-gray-600">{template.description}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-xs text-gray-500">{stats.objectiveCount} objectives</span>
                      <span className="text-xs text-gray-500">{stats.channelCount} channels</span>
                      <span className="text-xs text-gray-500">{stats.kpiCount} KPIs</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>v{template.version}</span>
                      <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                    </div>

                    <button
                      onClick={() => handleApplyOrgTemplate(template)}
                      disabled={applying}
                      className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {applying ? 'Applying...' : 'Apply Template'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {strategy.template_code && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Template applied: {STRATEGY_TEMPLATES.find(t => t.template_code === strategy.template_code)?.name}
            </span>
          </div>
          <p className="text-sm text-green-700 mt-2">
            Your strategy structure has been initialized with objectives, channels, and recommended KPIs.
          </p>
        </div>
      )}

      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{previewTemplate.name}</h3>
                <p className="text-gray-600 mt-1">{previewTemplate.description}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Focus Areas</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><strong>Emphasis:</strong> {previewTemplate.focus_guidance.emphasis.join(', ')}</p>
                  <p className="text-sm"><strong>Key Results:</strong> {previewTemplate.focus_guidance.key_results.join(', ')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Objectives ({previewTemplate.default_objectives.length})</h4>
                <div className="space-y-2">
                  {previewTemplate.default_objectives.map((obj, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{obj.objective_type.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          obj.priority === 'high' ? 'bg-red-100 text-red-700' :
                          obj.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {obj.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{obj.notes}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Channel Mix ({previewTemplate.default_channel_mix.length})</h4>
                <div className="space-y-2">
                  {previewTemplate.default_channel_mix.map((ch, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <span className="font-medium text-sm">{ch.channel_type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          ch.intensity === 'high' ? 'bg-green-100 text-green-700' :
                          ch.intensity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ch.intensity}
                        </span>
                        <span className="text-xs text-gray-600">
                          {ch.frequency_json.per_month ? `${ch.frequency_json.per_month}/mo` : ch.frequency_json.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewTemplate(null);
                  handleApplyTemplate(previewTemplate.template_code);
                }}
                disabled={applying}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply This Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showApplyModal && applyingOrgTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Apply Template: {applyingOrgTemplate.name}</h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Application Mode</label>
              <div className="space-y-3">
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="applyMode"
                    value="merge"
                    checked={selectedApplyMode === 'merge'}
                    onChange={() => setSelectedApplyMode('merge')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Merge</div>
                    <div className="text-sm text-gray-600">
                      Add missing objectives and channels from template without removing existing ones (recommended)
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="applyMode"
                    value="replace"
                    checked={selectedApplyMode === 'replace'}
                    onChange={() => setSelectedApplyMode('replace')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Replace</div>
                    <div className="text-sm text-gray-600">
                      Remove all existing objectives and channels, then apply template structure
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="applyMode"
                    value="kpis_only"
                    checked={selectedApplyMode === 'kpis_only'}
                    onChange={() => setSelectedApplyMode('kpis_only')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">KPIs Only</div>
                    <div className="text-sm text-gray-600">
                      Only apply KPI bundle and indicators, keep existing objectives and channels
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Preview:</strong> This will add content from the template based on your selected mode.
                You can always adjust afterwards.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplyingOrgTemplate(null);
                }}
                disabled={applying}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmApplyOrgTemplate}
                disabled={applying}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
