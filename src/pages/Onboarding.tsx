import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { logAuditEvent } from '../lib/audit';
import {
  OnboardingStatus,
  OnboardingChecklist,
  ONBOARDING_STEPS,
  calculateOnboardingProgress,
  isOnboardingComplete,
} from '../lib/onboarding';
import {
  CheckCircle,
  Circle,
  ChevronRight,
  Lock,
  Rocket,
  Shield,
  FolderPlus,
  Calendar as CalendarIcon,
  Package,
  Settings,
  BookOpen,
  Users,
  AlertCircle,
} from 'lucide-react';

const PROGRAMME_PROFILES = ['Custom', 'Horizon Europe', 'Erasmus+', 'Interreg'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { currentOrg } = useOrganisation();
  const { entitlements, service, planTier, governance } = useEntitlements();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);

  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    programme_profile: 'Custom',
    start_date: '',
    end_date: '',
  });

  const [reportingPeriods, setReportingPeriods] = useState<Array<{
    id: string;
    label: string;
    start_date: string;
    end_date: string;
  }>>([]);

  const [selectedTemplatePack, setSelectedTemplatePack] = useState<string>('');
  const [decisionSupportForm, setDecisionSupportForm] = useState({
    hourly_rate: 50,
    evidence_threshold: 0.7,
    uptake_window_days: 180,
  });

  useEffect(() => {
    if (currentOrg?.id) {
      loadOnboardingStatus();
      loadProjects();
    }
  }, [currentOrg?.id]);

  async function loadOnboardingStatus() {
    if (!currentOrg?.id || !profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('onboarding_status')
        .select('*')
        .eq('org_id', currentOrg.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setOnboardingStatus(data as OnboardingStatus);
      } else {
        const { data: newStatus } = await supabase
          .from('onboarding_status')
          .insert({
            org_id: currentOrg.id,
            created_by: profile.id,
          })
          .select()
          .single();

        if (newStatus) {
          setOnboardingStatus(newStatus as OnboardingStatus);
        }
      }
    } catch (error) {
      console.error('Error loading onboarding status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    if (!currentOrg?.id) return;

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false });

    if (data) {
      setProjects(data);
    }
  }

  async function updateChecklistItem(key: keyof OnboardingChecklist, value: boolean) {
    if (!onboardingStatus || !profile) return;

    const updatedChecklist = {
      ...onboardingStatus.checklist_json,
      [key]: value,
    };

    const completed = isOnboardingComplete(updatedChecklist);

    const { error } = await supabase
      .from('onboarding_status')
      .update({
        checklist_json: updatedChecklist,
        completed_at: completed ? new Date().toISOString() : null,
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', onboardingStatus.id);

    if (!error) {
      setOnboardingStatus({
        ...onboardingStatus,
        checklist_json: updatedChecklist,
        completed_at: completed ? new Date().toISOString() : null,
      });

      await logAuditEvent(
        currentOrg!.id,
        null,
        profile.id,
        'onboarding_status',
        onboardingStatus.id,
        'update',
        { [key]: onboardingStatus.checklist_json[key] },
        { [key]: value }
      );
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !service) return;

    const check = service.canCreateProject(projects.length);
    if (!check.allowed) {
      alert(check.reason);
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectForm,
          org_id: currentOrg!.id,
          reporting_periods: [],
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('onboarding_status')
        .update({
          project_id: data.id,
        })
        .eq('id', onboardingStatus!.id);

      await updateChecklistItem('project_created', true);
      await loadProjects();
      setProjectForm({
        title: '',
        description: '',
        programme_profile: 'Custom',
        start_date: '',
        end_date: '',
      });
      setActiveStep(2);
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert('Failed to create project: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReportingPeriods() {
    if (!onboardingStatus?.project_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          reporting_periods: reportingPeriods,
        })
        .eq('id', onboardingStatus.project_id);

      if (error) throw error;

      await updateChecklistItem('reporting_periods_set', true);
      setActiveStep(3);
    } catch (error: any) {
      console.error('Error saving reporting periods:', error);
      alert('Failed to save reporting periods: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyTemplatePack() {
    if (!selectedTemplatePack) return;

    setSaving(true);
    try {
      await updateChecklistItem('template_pack_applied', true);
      setActiveStep(4);
    } catch (error: any) {
      console.error('Error applying template pack:', error);
      alert('Failed to apply template pack: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDecisionSupport() {
    if (!onboardingStatus?.project_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          settings_json: {
            decision_support: decisionSupportForm,
          },
        })
        .eq('id', onboardingStatus.project_id);

      if (error) throw error;

      await updateChecklistItem('decision_support_configured', true);
      setActiveStep(5);
    } catch (error: any) {
      console.error('Error saving decision support settings:', error);
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  function addQuarterlyPeriods() {
    const periods = [];
    const year = new Date().getFullYear();
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3;
      const endMonth = startMonth + 2;
      periods.push({
        id: `Q${q}-${year}`,
        label: `Q${q} ${year}`,
        start_date: new Date(year, startMonth, 1).toISOString().split('T')[0],
        end_date: new Date(year, endMonth + 1, 0).toISOString().split('T')[0],
      });
    }
    setReportingPeriods(periods);
  }

  const progress = onboardingStatus ? calculateOnboardingProgress(onboardingStatus.checklist_json) : 0;
  const completed = onboardingStatus?.completed_at;

  const stepIcons = [Shield, FolderPlus, CalendarIcon, Package, Settings, BookOpen, Users];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center py-12">
          <CheckCircle size={64} className="mx-auto text-green-600 mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Onboarding Complete!</h1>
          <p className="text-slate-600 mb-6">You've successfully set up your CDE Manager workspace.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Rocket size={32} className="text-blue-600" />
          Welcome to CDE Manager
        </h1>
        <p className="text-slate-600 mt-1">Complete these steps to get started in 15 minutes</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-700">Setup Progress</span>
          <span className="text-sm font-medium text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 sticky top-6">
            <h3 className="font-semibold text-slate-900 mb-4">Steps</h3>
            <div className="space-y-2">
              {ONBOARDING_STEPS.map((step, index) => {
                const StepIcon = stepIcons[index];
                const isCompleted = onboardingStatus?.checklist_json[step.key];
                const isCurrent = index === activeStep;

                return (
                  <button
                    key={step.key}
                    onClick={() => setActiveStep(index)}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition ${
                      isCurrent ? 'bg-blue-50 text-blue-700' : isCompleted ? 'text-green-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle size={20} className="flex-shrink-0" />
                    ) : (
                      <StepIcon size={20} className="flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            {/* Step 0: Plan Review */}
            {activeStep === 0 && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Review Your Plan & Limits</h2>
                <p className="text-slate-600 mb-6">Understand your organisation's plan tier and feature entitlements</p>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-slate-600">Current Plan</div>
                        <div className="text-2xl font-bold text-slate-900">{planTier}</div>
                      </div>
                      <Shield size={32} className="text-blue-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-slate-600">Project Limit</div>
                        <div className="font-semibold text-slate-900">
                          {entitlements?.max_projects === null ? 'Unlimited' : entitlements?.max_projects}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Portfolio Dashboard</div>
                        <div className="font-semibold text-slate-900">
                          {entitlements?.portfolio_dashboard_enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/governance"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      Open Plans & Governance <ChevronRight size={16} />
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateChecklistItem('plan_reviewed', true);
                        setActiveStep(1);
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Create Project */}
            {activeStep === 1 && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Create Your First Project</h2>
                <p className="text-slate-600 mb-6">Set up a project to start managing CDE activities</p>

                {service && !service.canCreateProject(projects.length).allowed ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-2">
                    <Lock size={20} className="text-orange-600" />
                    <div>
                      <p className="text-sm text-orange-800 font-medium">Project limit reached</p>
                      <p className="text-sm text-orange-600">{service.canCreateProject(projects.length).reason}</p>
                    </div>
                  </div>
                ) : onboardingStatus?.checklist_json.project_created ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle size={20} className="text-green-600 mb-2" />
                    <p className="text-sm text-green-800">Project created successfully!</p>
                    <button
                      onClick={() => setActiveStep(2)}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Project Title *</label>
                      <input
                        type="text"
                        value={projectForm.title}
                        onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="My CDE Project"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <textarea
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Brief project description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                        <input
                          type="date"
                          value={projectForm.start_date}
                          onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                          required
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                        <input
                          type="date"
                          value={projectForm.end_date}
                          onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                          required
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Programme Profile</label>
                      <select
                        value={projectForm.programme_profile}
                        onChange={(e) => setProjectForm({ ...projectForm, programme_profile: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        {PROGRAMME_PROFILES.map((profile) => (
                          <option key={profile} value={profile}>
                            {profile}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                      >
                        {saving ? 'Creating...' : 'Create Project'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStep(0)}
                        className="bg-slate-200 text-slate-700 px-6 py-2 rounded-md hover:bg-slate-300"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Step 2: Reporting Periods */}
            {activeStep === 2 && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Configure Reporting Periods</h2>
                <p className="text-slate-600 mb-6">Define periods for tracking and reporting project progress</p>

                {onboardingStatus?.checklist_json.reporting_periods_set ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle size={20} className="text-green-600 mb-2" />
                    <p className="text-sm text-green-800">Reporting periods configured!</p>
                    <button
                      onClick={() => setActiveStep(3)}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <button
                        onClick={addQuarterlyPeriods}
                        className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300"
                      >
                        Use Quarterly Periods
                      </button>
                    </div>

                    {reportingPeriods.length > 0 && (
                      <div className="space-y-2">
                        {reportingPeriods.map((period, index) => (
                          <div key={period.id} className="border rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">{period.label}</div>
                              <div className="text-sm text-slate-600">
                                {period.start_date} to {period.end_date}
                              </div>
                            </div>
                            <button
                              onClick={() => setReportingPeriods(reportingPeriods.filter((_, i) => i !== index))}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveReportingPeriods}
                        disabled={saving || reportingPeriods.length === 0}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                      >
                        {saving ? 'Saving...' : 'Save & Continue'}
                      </button>
                      <button
                        onClick={() => {
                          updateChecklistItem('reporting_periods_set', true);
                          setActiveStep(3);
                        }}
                        className="text-slate-600 px-4 py-2 hover:text-slate-900"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Template Pack */}
            {activeStep === 3 && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Apply Template Pack</h2>
                <p className="text-slate-600 mb-6">Seed your project with pre-built templates</p>

                {onboardingStatus?.checklist_json.template_pack_applied ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle size={20} className="text-green-600 mb-2" />
                    <p className="text-sm text-green-800">Template pack applied!</p>
                    <button
                      onClick={() => setActiveStep(4)}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setSelectedTemplatePack('starter')}
                        className={`border-2 rounded-lg p-4 text-left transition ${
                          selectedTemplatePack === 'starter' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 mb-2">Starter Pack</div>
                        <div className="text-sm text-slate-600">Basic templates for single project management</div>
                      </button>

                      {entitlements?.shared_templates_enabled && (
                        <button
                          onClick={() => setSelectedTemplatePack('portfolio')}
                          className={`border-2 rounded-lg p-4 text-left transition ${
                            selectedTemplatePack === 'portfolio' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 mb-2">Portfolio Pack</div>
                          <div className="text-sm text-slate-600">Advanced templates for multi-project portfolios</div>
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleApplyTemplatePack}
                        disabled={saving || !selectedTemplatePack}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                      >
                        {saving ? 'Applying...' : 'Apply Template Pack'}
                      </button>
                      <button
                        onClick={() => {
                          updateChecklistItem('template_pack_applied', true);
                          setActiveStep(4);
                        }}
                        className="text-slate-600 px-4 py-2 hover:text-slate-900"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Decision Support */}
            {activeStep === 4 && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Set Decision Support Defaults</h2>
                <p className="text-slate-600 mb-6">Configure key parameters for decision-making support</p>

                {onboardingStatus?.checklist_json.decision_support_configured ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle size={20} className="text-green-600 mb-2" />
                    <p className="text-sm text-green-800">Decision support configured!</p>
                    <button
                      onClick={() => setActiveStep(5)}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Default Hourly Rate (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={decisionSupportForm.hourly_rate}
                        onChange={(e) =>
                          setDecisionSupportForm({ ...decisionSupportForm, hourly_rate: parseFloat(e.target.value) })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Evidence Quality Threshold (0-1)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={decisionSupportForm.evidence_threshold}
                        onChange={(e) =>
                          setDecisionSupportForm({
                            ...decisionSupportForm,
                            evidence_threshold: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Uptake Tracking Window (days)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="365"
                        value={decisionSupportForm.uptake_window_days}
                        onChange={(e) =>
                          setDecisionSupportForm({
                            ...decisionSupportForm,
                            uptake_window_days: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDecisionSupport}
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                      >
                        {saving ? 'Saving...' : 'Save & Continue'}
                      </button>
                      <button
                        onClick={() => {
                          updateChecklistItem('decision_support_configured', true);
                          setActiveStep(5);
                        }}
                        className="text-slate-600 px-4 py-2 hover:text-slate-900"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Methodology */}
            {activeStep === 5 && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Establish Methodology</h2>
                <p className="text-slate-600 mb-6">Define how your project will manage CDE activities</p>

                <div className="space-y-4">
                  {governance?.methodology_governance_mode === 'org_approved' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <AlertCircle size={20} className="text-blue-600 mb-2" />
                      <p className="text-sm text-blue-800">
                        Your organisation uses approved methodologies. Projects inherit the org-level methodology automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-slate-600 mb-4">
                        Create a project methodology to define your approach to communication, dissemination, and engagement.
                      </p>
                      <Link
                        to="/settings"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        Go to Project Settings <ChevronRight size={16} />
                      </Link>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateChecklistItem('methodology_approved', true);
                        setActiveStep(6);
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Team Members */}
            {activeStep === 6 && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Invite Team Members</h2>
                <p className="text-slate-600 mb-6">Add colleagues to collaborate on your projects</p>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-slate-600 mb-4">
                      Team members can be invited and assigned roles from the Admin page after onboarding.
                    </p>
                    <Link
                      to="/admin"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      Go to Admin <ChevronRight size={16} />
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await updateChecklistItem('members_invited', true);
                        await loadOnboardingStatus();
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                      Complete Onboarding
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
