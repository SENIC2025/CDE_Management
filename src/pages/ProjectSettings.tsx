import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';
import { Settings, FileText, AlertCircle } from 'lucide-react';
import {
  DecisionSupportSettings,
  DEFAULT_DECISION_SUPPORT_SETTINGS,
  ProjectMethodology,
  MethodologyContent,
  DEFAULT_METHODOLOGY_CONTENT,
  validateSettings,
} from '../lib/decisionSupportTypes';
import { logAuditEvent } from '../lib/audit';

export default function ProjectSettings() {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<'decision_support' | 'methodology'>('decision_support');

  const [settings, setSettings] = useState<DecisionSupportSettings>(DEFAULT_DECISION_SUPPORT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<DecisionSupportSettings>(DEFAULT_DECISION_SUPPORT_SETTINGS);
  const [saving, setSaving] = useState(false);

  const [methodologies, setMethodologies] = useState<ProjectMethodology[]>([]);
  const [currentMethodology, setCurrentMethodology] = useState<MethodologyContent>(DEFAULT_METHODOLOGY_CONTENT);
  const [methodologyStatus, setMethodologyStatus] = useState<'draft' | 'approved'>('draft');
  const [changeRationale, setChangeRationale] = useState('');
  const [showMethodologyForm, setShowMethodologyForm] = useState(false);

  const canEdit = permissions.role === 'cde_lead' || permissions.role === 'coordinator' || permissions.role === 'admin';

  useEffect(() => {
    if (currentProject) {
      loadSettings();
      loadMethodologies();
    }
  }, [currentProject]);

  async function loadSettings() {
    if (!currentProject) return;

    const { data } = await supabase
      .from('projects')
      .select('settings_json')
      .eq('id', currentProject.id)
      .single();

    if (data && data.settings_json) {
      const validated = validateSettings(data.settings_json);
      setSettings(validated);
      setOriginalSettings(validated);
    }
  }

  async function loadMethodologies() {
    if (!currentProject) return;

    const { data } = await supabase
      .from('project_methodologies')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('version', { ascending: false });

    if (data && data.length > 0) {
      setMethodologies(data);
      const approved = data.find((m: any) => m.status === 'approved');
      if (approved) {
        setCurrentMethodology(approved.content_json);
        setMethodologyStatus('approved');
      } else {
        setCurrentMethodology(data[0].content_json);
        setMethodologyStatus('draft');
      }
    }
  }

  async function saveSettings() {
    if (!currentProject || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ settings_json: settings })
        .eq('id', currentProject.id);

      if (!error) {
        await logAuditEvent(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'project_settings',
          currentProject.id,
          'update',
          { settings_json: originalSettings },
          { settings_json: settings }
        );

        setOriginalSettings(settings);
        alert('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  }

  function resetSettings() {
    setSettings(DEFAULT_DECISION_SUPPORT_SETTINGS);
  }

  async function saveMethodology() {
    if (!currentProject || !profile || !changeRationale) {
      alert('Change rationale is required');
      return;
    }

    setSaving(true);
    try {
      const nextVersion = methodologies.length > 0 ? Math.max(...methodologies.map(m => m.version)) + 1 : 1;

      const { data, error } = await supabase
        .from('project_methodologies')
        .insert({
          project_id: currentProject.id,
          version: nextVersion,
          status: 'draft',
          content_json: currentMethodology,
          change_rationale: changeRationale,
          created_by: profile.id,
        })
        .select()
        .single();

      if (!error && data) {
        await logAuditEvent(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'project_methodology',
          data.id,
          'create',
          undefined,
          data
        );

        setChangeRationale('');
        setShowMethodologyForm(false);
        loadMethodologies();
        alert('Methodology version created');
      }
    } catch (error) {
      console.error('Error saving methodology:', error);
      alert('Error saving methodology');
    } finally {
      setSaving(false);
    }
  }

  async function approveMethodology(methodologyId: string) {
    if (!currentProject || !profile) return;

    const confirmed = confirm('Approve this methodology version?');
    if (!confirmed) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_methodologies')
        .update({
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', methodologyId);

      if (!error) {
        await logAuditEvent(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'project_methodology',
          methodologyId,
          'approve',
          undefined,
          undefined
        );

        loadMethodologies();
        alert('Methodology approved');
      }
    } catch (error) {
      console.error('Error approving methodology:', error);
      alert('Error approving methodology');
    } finally {
      setSaving(false);
    }
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Select a project</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Project Settings</h1>
        <p className="text-slate-600 mt-1">Configure decision support and methodology</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('decision_support')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'decision_support' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <Settings size={16} />
          Decision Support Settings
        </button>
        <button
          onClick={() => setActiveTab('methodology')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'methodology' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <FileText size={16} />
          Methodology
        </button>
      </div>

      {activeTab === 'decision_support' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-slate-900">Decision Support Thresholds & Definitions</h2>
            <p className="text-sm text-slate-600 mt-1">
              Configure thresholds used in analytics and flag generation
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hourly Rate Default (€)
                </label>
                <input
                  type="number"
                  value={settings.hourly_rate_default}
                  onChange={(e) => setSettings({ ...settings, hourly_rate_default: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!canEdit}
                  min="0"
                />
                <p className="text-xs text-slate-500 mt-1">Used to calculate cost proxy when budget not specified</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Evidence Completeness Threshold (%)
                </label>
                <input
                  type="number"
                  value={settings.evidence_completeness_threshold}
                  onChange={(e) => setSettings({ ...settings, evidence_completeness_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!canEdit}
                  min="0"
                  max="100"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum score for activities to be considered well-evidenced</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  High Targeting Threshold
                </label>
                <input
                  type="number"
                  value={settings.stakeholder_high_targeting_threshold}
                  onChange={(e) => setSettings({ ...settings, stakeholder_high_targeting_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!canEdit}
                  min="1"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum activities to flag low response</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Low Response Ratio Threshold
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.stakeholder_low_response_ratio_threshold}
                  onChange={(e) => setSettings({ ...settings, stakeholder_low_response_ratio_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!canEdit}
                  min="0"
                  max="1"
                />
                <p className="text-xs text-slate-500 mt-1">Below this ratio flags low stakeholder response</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Uptake Lag Alert (days)
                </label>
                <input
                  type="number"
                  value={settings.uptake_no_exploitation_days}
                  onChange={(e) => setSettings({ ...settings, uptake_no_exploitation_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!canEdit}
                  min="1"
                />
                <p className="text-xs text-slate-500 mt-1">Days after dissemination to flag missing exploitation plan</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Inefficient Channel Effort Threshold (hours)
                </label>
                <input
                  type="number"
                  value={settings.inefficient_channel_effort_hours_threshold}
                  onChange={(e) => setSettings({ ...settings, inefficient_channel_effort_hours_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!canEdit}
                  min="1"
                />
                <p className="text-xs text-slate-500 mt-1">Effort hours above which channel flagged if no engagement</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Objective On-Track Progress Threshold
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.objective_on_track_progress_threshold}
                  onChange={(e) => setSettings({ ...settings, objective_on_track_progress_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!canEdit}
                  min="0"
                  max="1"
                />
                <p className="text-xs text-slate-500 mt-1">Ratio of indicator progress to consider on track</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Objective Evidence Coverage Threshold
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.objective_evidence_coverage_threshold}
                  onChange={(e) => setSettings({ ...settings, objective_evidence_coverage_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  disabled={!canEdit}
                  min="0"
                  max="1"
                />
                <p className="text-xs text-slate-500 mt-1">Proportion of activities with good evidence for on-track status</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Definitions</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Meaningful Engagement Definition
                  </label>
                  <textarea
                    value={settings.definitions.meaningful_engagement_definition}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        definitions: {
                          ...settings.definitions,
                          meaningful_engagement_definition: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border rounded"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Evidence Completeness Definition
                  </label>
                  <textarea
                    value={settings.definitions.evidence_completeness_definition}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        definitions: {
                          ...settings.definitions,
                          evidence_completeness_definition: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border rounded"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Uptake Lag Definition
                  </label>
                  <textarea
                    value={settings.definitions.uptake_lag_definition}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        definitions: {
                          ...settings.definitions,
                          uptake_lag_definition: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border rounded"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-3 border-t pt-6">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-slate-400"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={resetSettings}
                  className="border border-slate-300 px-4 py-2 rounded hover:bg-slate-50"
                >
                  Reset to Defaults
                </button>
              </div>
            )}

            {!canEdit && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded">
                <AlertCircle size={16} />
                Only CDE Lead, Coordinator, or Admin can edit these settings
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'methodology' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Project Methodology</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Define C/D/E approach and indicator typology
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => setShowMethodologyForm(!showMethodologyForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {showMethodologyForm ? 'Cancel' : 'Create New Version'}
                </button>
              )}
            </div>

            {showMethodologyForm ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Change Rationale (Required)
                  </label>
                  <textarea
                    value={changeRationale}
                    onChange={(e) => setChangeRationale(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Explain why this methodology version is being created..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Communication Definition
                    </label>
                    <textarea
                      value={currentMethodology.cde_definitions.communication}
                      onChange={(e) =>
                        setCurrentMethodology({
                          ...currentMethodology,
                          cde_definitions: {
                            ...currentMethodology.cde_definitions,
                            communication: e.target.value,
                          },
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Dissemination Definition
                    </label>
                    <textarea
                      value={currentMethodology.cde_definitions.dissemination}
                      onChange={(e) =>
                        setCurrentMethodology({
                          ...currentMethodology,
                          cde_definitions: {
                            ...currentMethodology.cde_definitions,
                            dissemination: e.target.value,
                          },
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Exploitation Definition
                    </label>
                    <textarea
                      value={currentMethodology.cde_definitions.exploitation}
                      onChange={(e) =>
                        setCurrentMethodology({
                          ...currentMethodology,
                          cde_definitions: {
                            ...currentMethodology.cde_definitions,
                            exploitation: e.target.value,
                          },
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={saveMethodology}
                    disabled={saving || !changeRationale}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-slate-400"
                  >
                    {saving ? 'Saving...' : 'Save Draft Version'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="text-sm font-medium text-blue-900 mb-1">Current Status</div>
                  <div className="text-sm text-blue-700">
                    {methodologyStatus === 'approved' ? 'Approved methodology in use' : 'Draft methodology'}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">C/D/E Definitions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded p-4">
                      <div className="font-medium text-slate-900 mb-2">Communication</div>
                      <div className="text-sm text-slate-600">{currentMethodology.cde_definitions.communication}</div>
                    </div>
                    <div className="border rounded p-4">
                      <div className="font-medium text-slate-900 mb-2">Dissemination</div>
                      <div className="text-sm text-slate-600">{currentMethodology.cde_definitions.dissemination}</div>
                    </div>
                    <div className="border rounded p-4">
                      <div className="font-medium text-slate-900 mb-2">Exploitation</div>
                      <div className="text-sm text-slate-600">{currentMethodology.cde_definitions.exploitation}</div>
                    </div>
                  </div>
                </div>

                {methodologies.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-base font-semibold text-slate-900 mb-3">Version History</h3>
                    <div className="space-y-2">
                      {methodologies.map((m) => (
                        <div key={m.id} className="flex items-center justify-between border rounded p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Version {m.version}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  m.status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600 mt-1">{m.change_rationale}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(m.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          {canEdit && m.status === 'draft' && (
                            <button
                              onClick={() => approveMethodology(m.id)}
                              disabled={saving}
                              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
