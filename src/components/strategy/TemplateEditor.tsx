import { useState, useEffect } from 'react';
import { Save, Check, Clock, AlertCircle, Plus, X, ArrowLeft, ArrowRight, Download, CheckCircle } from 'lucide-react';
import {
  templateService,
  type StrategyTemplateJSON,
  type FocusEmphasis,
  type TargetAudience,
  FOCUS_EMPHASIS_OPTIONS,
  TARGET_AUDIENCES
} from '../../lib/templateService';
import { useOrganisation } from '../../contexts/OrganisationContext';

interface TemplateEditorProps {
  templateId?: string;
  onClose: () => void;
  onSave: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

const KPI_BUNDLES = [
  { id: 'KPI-HORIZON-STD', name: 'Standard Horizon WP Communication Set', domain: 'Horizon Europe', description: 'Publications, citations, media coverage, stakeholder engagement' },
  { id: 'KPI-ERASMUS-DU', name: 'Erasmus+ Dissemination & Uptake Core Set', domain: 'Erasmus+', description: 'Training uptake, capacity building, educational output adoption' },
  { id: 'KPI-INTERREG-SP', name: 'Interreg Stakeholder & Policy Influence Set', domain: 'Interreg', description: 'Cross-border cooperation, policy influence, territorial uptake' },
  { id: 'KPI-LIGHTWEIGHT', name: 'Lightweight SME / Practitioner Project Set', domain: 'Generic', description: 'Simplified KPIs for smaller projects' },
  { id: 'KPI-SOCIAL-MEDIA', name: 'Social Media Performance Bundle', domain: 'Generic', description: 'Reach, engagement, and conversion across platforms' },
  { id: 'KPI-EVENT-ENGAGE', name: 'Event & Engagement Bundle', domain: 'Generic', description: 'Event effectiveness, attendance, satisfaction' },
  { id: 'KPI-POLICY-IMPACT', name: 'Policy Impact Bundle', domain: 'Generic', description: 'Policy influence, legislative references, institutional adoption' },
  { id: 'KPI-OPEN-SCIENCE', name: 'Open Science & Research Impact Bundle', domain: 'Horizon Europe', description: 'Open access, research dissemination, scientific impact' }
];

const TABS = [
  { id: 'focus', label: 'Focus', step: 1 },
  { id: 'objectives', label: 'Objectives', step: 2 },
  { id: 'channels', label: 'Channels', step: 3 },
  { id: 'kpis', label: 'KPIs', step: 4 },
  { id: 'roles', label: 'Roles', step: 5 }
];

export default function TemplateEditor({ templateId, onClose, onSave }: TemplateEditorProps) {
  const { currentOrg } = useOrganisation();
  const [currentTab, setCurrentTab] = useState('focus');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateJson, setTemplateJson] = useState<StrategyTemplateJSON>({
    focus: {
      emphasis: undefined,
      target_audiences: [],
      key_results: [],
      assumptions: '',
      constraints: ''
    },
    objectives: [],
    channels: [],
    cadence: {},
    roles: {},
    kpis: { extra_indicator_codes: [] }
  });
  const [selectedKpiBundles, setSelectedKpiBundles] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(!!templateId);
  const [error, setError] = useState<string | null>(null);

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
        // Restore multi-select KPI bundles
        const bundleId = template.template_json.kpis?.bundle_id;
        if (bundleId) {
          setSelectedKpiBundles(bundleId.split(',').map(b => b.trim()));
        }
      }
    } catch (err) {
      console.error('Error loading template:', err);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof StrategyTemplateJSON, value: any) => {
    setTemplateJson(prev => ({ ...prev, [field]: value }));
  };

  // Navigation
  const currentTabIndex = TABS.findIndex(t => t.id === currentTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === TABS.length - 1;

  const goNext = () => {
    if (!isLastTab) setCurrentTab(TABS[currentTabIndex + 1].id);
  };

  const goBack = () => {
    if (!isFirstTab) setCurrentTab(TABS[currentTabIndex - 1].id);
  };

  // Save (manual only — no auto-save)
  const handleSave = async (andClose: boolean = false) => {
    if (!currentOrg?.id || !name.trim()) {
      setError('Template name is required');
      setValidationErrors(['Template name is required']);
      setCurrentTab('focus');
      return;
    }

    try {
      setSaveStatus('saving');
      setError(null);
      setValidationErrors([]);

      // Store selected KPI bundles as comma-separated in bundle_id
      const finalJson = {
        ...templateJson,
        kpis: {
          ...templateJson.kpis,
          bundle_id: selectedKpiBundles.join(',') || undefined,
          bundle_name: selectedKpiBundles.map(id => KPI_BUNDLES.find(b => b.id === id)?.name).filter(Boolean).join(', ') || undefined
        }
      };

      if (templateId) {
        await templateService.updateTemplate(templateId, name, description, finalJson);
      } else {
        await templateService.createTemplate(currentOrg.id, name, description, finalJson);
      }

      setSaveStatus('saved');
      setLastSaved(new Date());

      if (andClose) {
        onSave();
        onClose();
      } else {
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err: any) {
      console.error('[Templates] Error saving template:', err);
      setSaveStatus('failed');
      setError(err?.message || 'Failed to save template');
    }
  };

  // Finish = validate + save + close
  const handleFinish = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      setCurrentTab('focus');
      return;
    }

    const validation = templateService.validateTemplateJson(templateJson);
    if (!validation.valid) {
      setError(`Please fix: ${validation.errors.join(', ')}`);
      setValidationErrors(validation.errors);
      setCurrentTab('focus');
      return;
    }

    await handleSave(true);
  };

  // Export as JSON
  const handleExport = () => {
    const exportData = {
      name,
      description,
      template_json: {
        ...templateJson,
        kpis: {
          ...templateJson.kpis,
          bundle_id: selectedKpiBundles.join(',') || undefined,
          bundle_name: selectedKpiBundles.map(id => KPI_BUNDLES.find(b => b.id === id)?.name).filter(Boolean).join(', ') || undefined
        }
      },
      exported_at: new Date().toISOString(),
      organisation: currentOrg?.name || 'Unknown'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${name.toLowerCase().replace(/\s+/g, '-') || 'untitled'}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const toggleKpiBundle = (bundleId: string) => {
    setSelectedKpiBundles(prev =>
      prev.includes(bundleId)
        ? prev.filter(id => id !== bundleId)
        : [...prev, bundleId]
    );
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving': return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'saved': return <Check className="w-4 h-4 text-green-600" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return null;
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{templateId ? 'Edit Template' : 'Create Template'}</h1>
              <p className="text-blue-100 text-sm mt-1">Organisation: {currentOrg?.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Save status indicator */}
            {saveStatus !== 'idle' && (
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-lg">
                {getSaveStatusIcon()}
                <span className="text-sm">
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && `Saved ${lastSaved?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  {saveStatus === 'failed' && 'Save failed'}
                </span>
              </div>
            )}

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              title="Export as JSON"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Export</span>
            </button>

            {/* Save Draft */}
            <button
              onClick={() => handleSave(false)}
              disabled={!name.trim() || saveStatus === 'saving'}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">Save Draft</span>
            </button>

            {/* Finish / Publish */}
            <button
              onClick={handleFinish}
              disabled={!name.trim() || saveStatus === 'saving'}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Publish & Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Name & Description */}
      <div className="p-6 border-b border-gray-200">
        <div className="max-w-4xl mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Our Standard Horizon Europe Strategy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
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

      {/* Step indicator */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {TABS.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currentTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : idx < currentTabIndex
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs border border-current">
                  {idx < currentTabIndex ? '✓' : tab.step}
                </span>
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">Step {currentTabIndex + 1} of {TABS.length}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-red-800">{error}</div>
                <button onClick={() => setError(null)} className="text-xs text-red-600 hover:text-red-700 mt-1">Dismiss</button>
              </div>
            </div>
          )}

          {/* === FOCUS TAB === */}
          {currentTab === 'focus' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Strategic Focus</h2>
              <p className="text-gray-600 text-sm">Define the strategic direction and emphasis areas.</p>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                    {validationErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Emphasis <span className="text-red-600">*</span>
                </label>
                <div className="space-y-2">
                  {FOCUS_EMPHASIS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        templateJson.focus?.emphasis === option.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="emphasis"
                        value={option.value}
                        checked={templateJson.focus?.emphasis === option.value}
                        onChange={(e) => updateField('focus', { ...templateJson.focus, emphasis: e.target.value as FocusEmphasis })}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Target Audiences <span className="text-red-600">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <button onClick={() => updateField('focus', { ...templateJson.focus, target_audiences: [...TARGET_AUDIENCES] })} className="text-xs text-blue-600 hover:text-blue-700">Select All</button>
                    <button onClick={() => updateField('focus', { ...templateJson.focus, target_audiences: [] })} className="text-xs text-gray-600 hover:text-gray-700">Clear</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TARGET_AUDIENCES.map((audience) => {
                    const isSelected = templateJson.focus?.target_audiences?.includes(audience);
                    return (
                      <button
                        key={audience}
                        onClick={() => {
                          const current = templateJson.focus?.target_audiences || [];
                          const updated = isSelected ? current.filter((a) => a !== audience) : [...current, audience];
                          updateField('focus', { ...templateJson.focus, target_audiences: updated });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {audience.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Results (optional)</label>
                <div className="space-y-2">
                  {(templateJson.focus?.key_results || []).map((result, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={result}
                        onChange={(e) => {
                          const updated = [...(templateJson.focus?.key_results || [])];
                          updated[idx] = e.target.value;
                          updateField('focus', { ...templateJson.focus, key_results: updated });
                        }}
                        placeholder="e.g., Increase awareness by 50%"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button onClick={() => {
                        const updated = (templateJson.focus?.key_results || []).filter((_, i) => i !== idx);
                        updateField('focus', { ...templateJson.focus, key_results: updated });
                      }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateField('focus', { ...templateJson.focus, key_results: [...(templateJson.focus?.key_results || []), ''] })}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4" /><span>Add Key Result</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assumptions (optional)</label>
                <textarea
                  value={templateJson.focus?.assumptions || ''}
                  onChange={(e) => updateField('focus', { ...templateJson.focus, assumptions: e.target.value })}
                  placeholder="List any assumptions this strategy is based on..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Constraints (optional)</label>
                <textarea
                  value={templateJson.focus?.constraints || ''}
                  onChange={(e) => updateField('focus', { ...templateJson.focus, constraints: e.target.value })}
                  placeholder="List any constraints or limitations..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* === OBJECTIVES TAB === */}
          {currentTab === 'objectives' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Objectives</h2>
                  <p className="text-gray-600 text-sm">Define objective patterns for this template.</p>
                </div>
                <button
                  onClick={() => {
                    updateField('objectives', [...(templateJson.objectives || []), {
                      objective_type: 'awareness' as const,
                      priority: 'medium' as const,
                      stakeholder_types: [],
                      expected_outcome: 'visibility' as const,
                      notes: ''
                    }]);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /><span>Add Objective</span>
                </button>
              </div>

              {(!templateJson.objectives || templateJson.objectives.length === 0) ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 mb-2">No objectives defined yet.</p>
                  <p className="text-sm text-gray-400">Click "Add Objective" to start building your template.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templateJson.objectives.map((obj, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Objective {idx + 1}</span>
                        <button onClick={() => updateField('objectives', templateJson.objectives!.filter((_, i) => i !== idx))} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                          <select value={obj.objective_type} onChange={(e) => { const u = [...templateJson.objectives!]; u[idx] = { ...u[idx], objective_type: e.target.value as any }; updateField('objectives', u); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                            <option value="awareness">Awareness</option>
                            <option value="engagement">Engagement</option>
                            <option value="capacity_building">Capacity Building</option>
                            <option value="uptake">Uptake</option>
                            <option value="policy_influence">Policy Influence</option>
                            <option value="sustainability">Sustainability</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                          <select value={obj.priority} onChange={(e) => { const u = [...templateJson.objectives!]; u[idx] = { ...u[idx], priority: e.target.value as any }; updateField('objectives', u); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Expected Outcome</label>
                        <select value={obj.expected_outcome} onChange={(e) => { const u = [...templateJson.objectives!]; u[idx] = { ...u[idx], expected_outcome: e.target.value as any }; updateField('objectives', u); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                          <option value="visibility">Visibility</option>
                          <option value="knowledge">Knowledge</option>
                          <option value="capability">Capability</option>
                          <option value="adoption">Adoption</option>
                          <option value="policy_reference">Policy Reference</option>
                          <option value="sustainability">Sustainability</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Stakeholder Types</label>
                        <div className="flex flex-wrap gap-1">
                          {['policy', 'market', 'research', 'society', 'media', 'funders'].map((st) => {
                            const isSelected = obj.stakeholder_types.includes(st);
                            return (
                              <button key={st} onClick={() => { const u = [...templateJson.objectives!]; u[idx] = { ...u[idx], stakeholder_types: isSelected ? obj.stakeholder_types.filter(t => t !== st) : [...obj.stakeholder_types, st] }; updateField('objectives', u); }} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{st}</button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                        <input type="text" value={obj.notes} onChange={(e) => { const u = [...templateJson.objectives!]; u[idx] = { ...u[idx], notes: e.target.value }; updateField('objectives', u); }} placeholder="Brief description of this objective..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === CHANNELS TAB === */}
          {currentTab === 'channels' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Channels & Cadence</h2>
                  <p className="text-gray-600 text-sm">Configure communication channels and frequency.</p>
                </div>
                <button
                  onClick={() => updateField('channels', [...(templateJson.channels || []), { channel_type: 'website', intensity: 'medium' as const, frequency_json: { per_month: 4, description: '' }, linked_objective_ids: [] }])}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /><span>Add Channel</span>
                </button>
              </div>

              {(!templateJson.channels || templateJson.channels.length === 0) ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 mb-2">No channels defined yet.</p>
                  <p className="text-sm text-gray-400">Click "Add Channel" to define communication channels.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templateJson.channels.map((ch, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Channel {idx + 1}</span>
                        <button onClick={() => updateField('channels', templateJson.channels!.filter((_, i) => i !== idx))} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Channel Type</label>
                          <select value={ch.channel_type} onChange={(e) => { const u = [...templateJson.channels!]; u[idx] = { ...u[idx], channel_type: e.target.value }; updateField('channels', u); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                            <option value="website">Website</option>
                            <option value="social_media">Social Media</option>
                            <option value="newsletter">Newsletter</option>
                            <option value="email">Email</option>
                            <option value="press">Press / Media</option>
                            <option value="scientific_publications">Scientific Publications</option>
                            <option value="workshops_events">Workshops & Events</option>
                            <option value="webinars">Webinars</option>
                            <option value="training_materials">Training Materials</option>
                            <option value="policy_briefs">Policy Briefs</option>
                            <option value="policy_documents">Policy Documents</option>
                            <option value="peer_learning">Peer Learning</option>
                            <option value="stakeholder_meetings">Stakeholder Meetings</option>
                            <option value="regional_events">Regional Events</option>
                            <option value="cross_border_exchange">Cross-border Exchange</option>
                            <option value="dissemination_platform">Dissemination Platform</option>
                            <option value="practical_tools">Practical Tools</option>
                            <option value="video">Video Content</option>
                            <option value="podcast">Podcast</option>
                            <option value="infographics">Infographics</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Intensity</label>
                          <select value={ch.intensity} onChange={(e) => { const u = [...templateJson.channels!]; u[idx] = { ...u[idx], intensity: e.target.value as any }; updateField('channels', u); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Frequency (per month)</label>
                          <input type="number" min="0" value={ch.frequency_json.per_month || ''} onChange={(e) => { const u = [...templateJson.channels!]; u[idx] = { ...u[idx], frequency_json: { ...u[idx].frequency_json, per_month: parseInt(e.target.value) || undefined } }; updateField('channels', u); }} placeholder="e.g., 4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                          <input type="text" value={ch.frequency_json.description || ''} onChange={(e) => { const u = [...templateJson.channels!]; u[idx] = { ...u[idx], frequency_json: { ...u[idx].frequency_json, description: e.target.value } }; updateField('channels', u); }} placeholder="e.g., Weekly updates" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cadence Settings */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cadence Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reporting Periods</label>
                    <input type="number" min="1" value={templateJson.cadence?.periods || ''} onChange={(e) => updateField('cadence', { ...templateJson.cadence, periods: parseInt(e.target.value) || undefined })} placeholder="e.g., 4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Project Duration (months)</label>
                    <input type="number" min="1" value={templateJson.cadence?.months || ''} onChange={(e) => updateField('cadence', { ...templateJson.cadence, months: parseInt(e.target.value) || undefined })} placeholder="e.g., 36" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Key Moments</label>
                  <div className="space-y-2">
                    {(templateJson.cadence?.key_moments || []).map((moment, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input type="text" value={moment} onChange={(e) => { const u = [...(templateJson.cadence?.key_moments || [])]; u[idx] = e.target.value; updateField('cadence', { ...templateJson.cadence, key_moments: u }); }} placeholder="e.g., Mid-term review" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => updateField('cadence', { ...templateJson.cadence, key_moments: (templateJson.cadence?.key_moments || []).filter((_, i) => i !== idx) })} className="p-2 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => updateField('cadence', { ...templateJson.cadence, key_moments: [...(templateJson.cadence?.key_moments || []), ''] })} className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"><Plus className="w-4 h-4" /><span>Add Key Moment</span></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === KPIs TAB (MULTI-SELECT) === */}
          {currentTab === 'kpis' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">KPIs & Measurement</h2>
              <p className="text-gray-600 text-sm">Select one or more KPI bundles for this template.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  KPI Bundles <span className="text-xs text-gray-400 ml-2">{selectedKpiBundles.length} selected</span>
                </label>
                <div className="space-y-2">
                  {KPI_BUNDLES.map((bundle) => {
                    const isSelected = selectedKpiBundles.includes(bundle.id);
                    return (
                      <label
                        key={bundle.id}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleKpiBundle(bundle.id)}
                          className="mt-1 mr-3 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900">{bundle.name}</div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{bundle.domain}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">{bundle.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {selectedKpiBundles.length > 0 && (
                  <button onClick={() => setSelectedKpiBundles([])} className="mt-2 text-sm text-red-600 hover:text-red-700">Clear all selections</button>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Extra Indicator Codes (optional)</label>
                <p className="text-xs text-gray-500 mb-3">Add additional indicator codes beyond the selected bundles</p>
                <div className="space-y-2">
                  {(templateJson.kpis?.extra_indicator_codes || []).map((code, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input type="text" value={code} onChange={(e) => { const u = [...(templateJson.kpis?.extra_indicator_codes || [])]; u[idx] = e.target.value; updateField('kpis', { ...templateJson.kpis, extra_indicator_codes: u }); }} placeholder="e.g., custom_metric_01" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      <button onClick={() => updateField('kpis', { ...templateJson.kpis, extra_indicator_codes: (templateJson.kpis?.extra_indicator_codes || []).filter((_, i) => i !== idx) })} className="p-2 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => updateField('kpis', { ...templateJson.kpis, extra_indicator_codes: [...(templateJson.kpis?.extra_indicator_codes || []), ''] })} className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"><Plus className="w-4 h-4" /><span>Add Indicator</span></button>
                </div>
              </div>
            </div>
          )}

          {/* === ROLES TAB === */}
          {currentTab === 'roles' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Roles & Responsibilities</h2>
              <p className="text-gray-600 text-sm">Define role requirements and assign responsibilities.</p>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateJson.roles?.requires_cde_lead || false}
                    onChange={(e) => updateField('roles', { ...templateJson.roles, requires_cde_lead: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Requires CDE Lead</div>
                    <div className="text-sm text-gray-500">This strategy requires a dedicated CDE Lead role</div>
                  </div>
                </label>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Role Responsibilities</h3>
                <p className="text-xs text-gray-500 mb-4">Define what each role is responsible for in this strategy.</p>

                {['coordinator', 'cde_lead', 'contributor', 'wp_leader', 'partner'].map((role) => {
                  const responsibilities = templateJson.roles?.responsibilities?.[role] || [];
                  return (
                    <div key={role} className="mb-4 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700 capitalize">{role.replace(/_/g, ' ')}</h4>
                        <span className="text-xs text-gray-400">{responsibilities.length} items</span>
                      </div>
                      <div className="space-y-2">
                        {responsibilities.map((resp, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <input type="text" value={resp} onChange={(e) => { const u = [...responsibilities]; u[idx] = e.target.value; updateField('roles', { ...templateJson.roles, responsibilities: { ...templateJson.roles?.responsibilities, [role]: u } }); }} placeholder={`${role.replace(/_/g, ' ')} responsibility...`} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                            <button onClick={() => updateField('roles', { ...templateJson.roles, responsibilities: { ...templateJson.roles?.responsibilities, [role]: responsibilities.filter((_, i) => i !== idx) } })} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <button onClick={() => updateField('roles', { ...templateJson.roles, responsibilities: { ...templateJson.roles?.responsibilities, [role]: [...responsibilities, ''] } })} className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded hover:bg-blue-100"><Plus className="w-3 h-3" /><span>Add</span></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={isFirstTab}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isFirstTab
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3">
            {!isLastTab ? (
              <button
                onClick={goNext}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={!name.trim() || saveStatus === 'saving'}
                  className="flex items-center space-x-2 px-4 py-2 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={handleFinish}
                  disabled={!name.trim() || saveStatus === 'saving'}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Publish & Close</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
