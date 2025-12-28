import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Check, Clock, AlertCircle, Plus, X, ArrowLeft } from 'lucide-react';
import { templateService, type CDEStrategyTemplate, type StrategyTemplateJSON } from '../../lib/templateService';
import { useOrganisation } from '../../contexts/OrganisationContext';

interface TemplateEditorProps {
  templateId?: string;
  onClose: () => void;
  onSave: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export default function TemplateEditor({ templateId, onClose, onSave }: TemplateEditorProps) {
  const { currentOrg } = useOrganisation();
  const [currentTab, setCurrentTab] = useState('focus');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateJson, setTemplateJson] = useState<StrategyTemplateJSON>({
    focus: { emphasis: [], target_audiences: [], key_results: [], assumptions: [], constraints: [] },
    objectives: [],
    channels: [],
    cadence: {},
    roles: {},
    kpis: { extra_indicator_codes: [] }
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(!!templateId);
  const [error, setError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      const template = await templateService.getTemplate(templateId);
      if (template) {
        setName(template.name);
        setDescription(template.description || '');
        setTemplateJson(template.template_json);
      }
    } catch (err) {
      console.error('Error loading template:', err);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!currentOrg?.id) return;

      try {
        setSaveStatus('saving');

        if (templateId) {
          await templateService.updateTemplate(templateId, name, description, templateJson);
        } else {
          await templateService.createTemplate(currentOrg.id, name, description, templateJson);
        }

        setSaveStatus('saved');
        setLastSaved(new Date());

        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Error saving template:', err);
        setSaveStatus('failed');
      }
    }, 1000);
  }, [currentOrg?.id, templateId, name, description, templateJson]);

  const handleSave = async () => {
    if (!currentOrg?.id || !name.trim()) {
      setError('Template name is required');
      return;
    }

    const validation = templateService.validateTemplateJson(templateJson);
    if (!validation.valid) {
      setError(`Validation errors: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      setSaveStatus('saving');

      if (templateId) {
        await templateService.updateTemplate(templateId, name, description, templateJson);
      } else {
        await templateService.createTemplate(currentOrg.id, name, description, templateJson);
      }

      setSaveStatus('saved');
      setLastSaved(new Date());
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving template:', err);
      setSaveStatus('failed');
      setError('Failed to save template');
    }
  };

  const updateField = (field: keyof StrategyTemplateJSON, value: any) => {
    setTemplateJson(prev => ({ ...prev, [field]: value }));
    debouncedSave();
  };

  const tabs = [
    { id: 'focus', label: 'Focus' },
    { id: 'objectives', label: 'Objectives' },
    { id: 'channels', label: 'Channels' },
    { id: 'kpis', label: 'KPIs' },
    { id: 'roles', label: 'Roles' }
  ];

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'saved':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg min-h-screen flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                {templateId ? 'Edit Template' : 'Create Template'}
              </h1>
              <p className="text-blue-100 text-sm mt-1">Organisation: {currentOrg?.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-lg">
              {getSaveStatusIcon()}
              <span className="text-sm">
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && `Saved ${lastSaved?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                {saveStatus === 'failed' && 'Save failed'}
              </span>
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim() || saveStatus === 'saving'}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>Save & Close</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200">
        <div className="max-w-4xl mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Our Standard Horizon Europe Strategy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when and how to use this template..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-48 bg-gray-50 border-r border-gray-200 p-4">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  currentTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {currentTab === 'focus' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Strategic Focus</h2>
                <p className="text-gray-600 text-sm">Define the strategic direction and emphasis areas.</p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    This section will be fully implemented in the next phase. For now, templates will use default focus settings.
                  </p>
                </div>
              </div>
            )}

            {currentTab === 'objectives' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Objectives</h2>
                    <p className="text-gray-600 text-sm">Define objective patterns for this template.</p>
                  </div>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    <span>Add Objective</span>
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    Objective editor will be fully implemented in the next phase. Templates can inherit from system templates.
                  </p>
                </div>
              </div>
            )}

            {currentTab === 'channels' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Channels & Cadence</h2>
                    <p className="text-gray-600 text-sm">Configure communication channels and frequency.</p>
                  </div>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    <span>Add Channel</span>
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    Channel editor will be fully implemented in the next phase. Templates can define channel mix and intensity.
                  </p>
                </div>
              </div>
            )}

            {currentTab === 'kpis' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">KPIs & Measurement</h2>
                <p className="text-gray-600 text-sm">Select KPI bundle and additional indicators.</p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    KPI selector will be fully implemented in the next phase. Templates can reference KPI bundles from the library.
                  </p>
                </div>
              </div>
            )}

            {currentTab === 'roles' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Roles & Responsibilities</h2>
                <p className="text-gray-600 text-sm">Define role requirements and responsibilities.</p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    Role configuration will be fully implemented in the next phase. Templates can specify required roles.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
