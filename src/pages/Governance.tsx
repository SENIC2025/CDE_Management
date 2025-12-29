import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { logAuditEvent } from '../lib/audit';
import { ExportService } from '../lib/exportService';
import {
  PlanTier,
  PlanCatalog,
  OrganisationPlan,
  GovernanceSettings,
  MethodologyGovernanceMode,
  TemplateGovernanceMode,
  Entitlements,
  getEffectiveEntitlements,
} from '../lib/entitlements';
import {
  Shield,
  Settings,
  BarChart3,
  Users,
  AlertCircle,
  Save,
  RefreshCw,
  Check,
  X,
  Lock,
  Unlock,
  Info,
  Package,
} from 'lucide-react';

export default function Governance() {
  const { profile } = useAuth();
  const { entitlements, planTier, planStatus, governance, isOrgAdmin, reload } = useEntitlements();
  const [activeTab, setActiveTab] = useState<'overview' | 'plan' | 'governance' | 'usage'>('overview');
  const [catalog, setCatalog] = useState<PlanCatalog[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPortfolio, setExportingPortfolio] = useState(false);

  // Plan editing state
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [editedEntitlements, setEditedEntitlements] = useState<Partial<Entitlements>>({});
  const [showPlanConfirm, setShowPlanConfirm] = useState(false);

  // Governance editing state
  const [editedGovernance, setEditedGovernance] = useState<Partial<GovernanceSettings> | null>(null);

  useEffect(() => {
    if (profile?.org_id) {
      loadData();
    }
  }, [profile?.org_id]);

  useEffect(() => {
    if (planTier) {
      setSelectedPlan(planTier);
    }
  }, [planTier]);

  useEffect(() => {
    if (governance) {
      setEditedGovernance(governance);
    }
  }, [governance]);

  async function loadData() {
    setLoading(true);
    try {
      // Load plan catalog
      const { data: catalogData } = await supabase
        .from('plan_catalog')
        .select('*')
        .order('plan_tier');
      if (catalogData) setCatalog(catalogData);

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, title, created_at')
        .eq('org_id', profile!.org_id)
        .order('created_at', { ascending: false });
      if (projectsData) setProjects(projectsData);
    } catch (error) {
      console.error('Error loading governance data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanChange() {
    if (!selectedPlan || !profile || !isOrgAdmin) return;

    setSaving(true);
    try {
      const { data: existingPlan, error: fetchError } = await supabase
        .from('organisation_plans')
        .select('*')
        .eq('org_id', profile.org_id!)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) {
        console.error('[Governance] Error fetching plan:', fetchError);
        throw fetchError;
      }

      if (!existingPlan) {
        alert('No active plan found. Please contact support.');
        return;
      }

      const { error: updateError } = await supabase
        .from('organisation_plans')
        .update({
          plan_tier: selectedPlan,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPlan.id);

      if (updateError) {
        console.error('[Governance] Error updating plan:', updateError);
        throw updateError;
      }

      await logAuditEvent(
        profile.org_id!,
        null,
        profile.id,
        'organisation_plan',
        existingPlan.id,
        'update',
        { plan_tier: existingPlan.plan_tier },
        { plan_tier: selectedPlan }
      );

      await reload();
      setShowPlanConfirm(false);
      alert('Plan updated successfully');
    } catch (error) {
      console.error('[Governance] Error updating plan:', error);
      alert('Failed to update plan');
    } finally {
      setSaving(false);
    }
  }

  async function handleEntitlementsSave() {
    if (!profile || !isOrgAdmin) return;

    setSaving(true);
    try {
      const { data: existingPlan, error: fetchError } = await supabase
        .from('organisation_plans')
        .select('*')
        .eq('org_id', profile.org_id!)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) {
        console.error('[Governance] Error fetching plan:', fetchError);
        throw fetchError;
      }

      if (!existingPlan) {
        alert('No active plan found. Please contact support.');
        return;
      }

      const { error: updateError } = await supabase
        .from('organisation_plans')
        .update({
          entitlements_json: editedEntitlements,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPlan.id);

      if (updateError) {
        console.error('[Governance] Error updating entitlements:', updateError);
        throw updateError;
      }

      await logAuditEvent(
        profile.org_id!,
        null,
        profile.id,
        'organisation_plan',
        existingPlan.id,
        'update',
        { entitlements_json: existingPlan.entitlements_json },
        { entitlements_json: editedEntitlements }
      );

      await reload();
      alert('Entitlements updated successfully');
    } catch (error) {
      console.error('[Governance] Error updating entitlements:', error);
      alert('Failed to update entitlements');
    } finally {
      setSaving(false);
    }
  }

  async function handleGovernanceSave() {
    if (!profile || !isOrgAdmin || !editedGovernance) return;

    setSaving(true);
    try {
      await supabase
        .from('organisation_governance_settings')
        .update({
          org_defaults_json: editedGovernance.org_defaults_json,
          methodology_governance_mode: editedGovernance.methodology_governance_mode,
          template_governance_mode: editedGovernance.template_governance_mode,
          branding_json: editedGovernance.branding_json,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', profile.org_id!);

      await logAuditEvent(
        profile.org_id!,
        null,
        profile.id,
        'governance_settings',
        editedGovernance.id!,
        'update',
        governance,
        editedGovernance
      );

      await reload();
      alert('Governance settings updated successfully');
    } catch (error) {
      console.error('Error updating governance:', error);
      alert('Failed to update governance settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPortfolio() {
    if (!profile?.org_id || !entitlements?.portfolio_dashboard_enabled) return;

    setExportingPortfolio(true);
    try {
      const accessibleProjectIds = projects.map(p => p.id);
      await ExportService.downloadPortfolioBundle(profile.org_id, profile.id, accessibleProjectIds);
      alert('Portfolio governance pack generated successfully! Files will download shortly.');
    } catch (error: any) {
      console.error('Error exporting portfolio:', error);
      alert('Failed to export portfolio: ' + error.message);
    } finally {
      setExportingPortfolio(false);
    }
  }

  function resetEntitlementsToDefaults() {
    if (confirm('Reset all entitlement overrides to plan defaults?')) {
      setEditedEntitlements({});
    }
  }

  const currentPlan = catalog.find((p) => p.plan_tier === planTier);
  const effectiveEntitlements = entitlements || getEffectiveEntitlements(planTier || 'project', {});
  const projectCount = projects.length;
  const maxProjects = effectiveEntitlements.max_projects;
  const projectLimitReached = maxProjects !== null && projectCount >= maxProjects;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Plans & Governance</h1>
        <p className="text-slate-600 mt-1">Manage organisation plan, entitlements, and governance settings</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <BarChart3 size={18} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'plan' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <Shield size={18} />
          Plan & Entitlements
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'governance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <Settings size={18} />
          Governance Settings
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'usage' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <Users size={18} />
          Usage & Limits
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`px-4 py-2 rounded-lg font-semibold ${
                  planStatus === 'active' ? 'bg-green-100 text-green-800' :
                  planStatus === 'trial' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {currentPlan?.name || planTier} - {planStatus}
                </div>
              </div>
              <p className="text-slate-600 mb-6">{currentPlan?.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Project Limit</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {maxProjects === null ? 'Unlimited' : maxProjects}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Currently using: {projectCount}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Portfolio Dashboard</div>
                  <div className="text-2xl font-bold">
                    {effectiveEntitlements.portfolio_dashboard_enabled ? (
                      <Check size={32} className="text-green-600" />
                    ) : (
                      <X size={32} className="text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Export Branding</div>
                  <div className="text-2xl font-bold">
                    {effectiveEntitlements.export_branding_enabled ? (
                      <Check size={32} className="text-green-600" />
                    ) : (
                      <X size={32} className="text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Shared Templates</div>
                  <div className="text-2xl font-bold">
                    {effectiveEntitlements.shared_templates_enabled ? (
                      <Check size={32} className="text-green-600" />
                    ) : (
                      <X size={32} className="text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Org-Level Methodology</div>
                  <div className="text-2xl font-bold">
                    {effectiveEntitlements.org_level_methodology_enabled ? (
                      <Check size={32} className="text-green-600" />
                    ) : (
                      <X size={32} className="text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Org Defaults</div>
                  <div className="text-2xl font-bold">
                    {effectiveEntitlements.org_defaults_enabled ? (
                      <Check size={32} className="text-green-600" />
                    ) : (
                      <X size={32} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {entitlements?.portfolio_dashboard_enabled && projects.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Package size={32} className="text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Portfolio Governance Pack</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Generate a management-ready governance artifact covering all {projects.length} project{projects.length !== 1 ? 's' : ''} in your organisation.
                    Includes compliance status, active flags, projects at risk, and decision-support summaries.
                    Ideal for steering committees, boards, and internal audits.
                  </p>
                  <button
                    onClick={handleExportPortfolio}
                    disabled={exportingPortfolio}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <Package size={16} />
                    {exportingPortfolio ? 'Generating Pack...' : 'Export Portfolio Pack'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan & Entitlements Tab */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {!isOrgAdmin && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-600" />
              <p className="text-sm text-orange-800">Only organisation administrators can modify plan and entitlements.</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Plan Tier</h2>
              <p className="text-sm text-slate-600 mt-1">Select your organisation's plan tier</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {catalog.map((plan) => (
                  <button
                    key={plan.plan_tier}
                    onClick={() => {
                      if (isOrgAdmin) {
                        setSelectedPlan(plan.plan_tier);
                        if (plan.plan_tier !== planTier) {
                          setShowPlanConfirm(true);
                        }
                      }
                    }}
                    disabled={!isOrgAdmin}
                    className={`border-2 rounded-lg p-6 text-left transition ${
                      selectedPlan === plan.plan_tier
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${!isOrgAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-semibold text-lg text-slate-900 mb-2">{plan.name}</div>
                    <div className="text-sm text-slate-600 mb-4">{plan.description}</div>
                    {selectedPlan === plan.plan_tier && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Check size={18} />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Entitlement Overrides</h2>
                <p className="text-sm text-slate-600 mt-1">Customize entitlements for your organisation</p>
              </div>
              {isOrgAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={resetEntitlementsToDefaults}
                    className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300"
                  >
                    <RefreshCw size={18} />
                    Reset to Defaults
                  </button>
                  <button
                    onClick={handleEntitlementsSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Maximum Projects</span>
                    <input
                      type="number"
                      min="1"
                      value={editedEntitlements.max_projects ?? maxProjects ?? ''}
                      onChange={(e) => setEditedEntitlements({
                        ...editedEntitlements,
                        max_projects: e.target.value ? parseInt(e.target.value) : null
                      })}
                      disabled={!isOrgAdmin}
                      className="w-32 px-3 py-2 border rounded disabled:bg-slate-100"
                      placeholder="Unlimited"
                    />
                  </label>
                  <p className="text-xs text-slate-500">Leave empty for unlimited projects</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <span className="text-sm font-medium text-slate-700">Portfolio Dashboard</span>
                  <button
                    onClick={() => setEditedEntitlements({
                      ...editedEntitlements,
                      portfolio_dashboard_enabled: !editedEntitlements.portfolio_dashboard_enabled
                    })}
                    disabled={!isOrgAdmin}
                    className="disabled:opacity-50"
                  >
                    {(editedEntitlements.portfolio_dashboard_enabled ?? effectiveEntitlements.portfolio_dashboard_enabled) ? (
                      <Unlock size={20} className="text-green-600" />
                    ) : (
                      <Lock size={20} className="text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <span className="text-sm font-medium text-slate-700">Export Branding</span>
                  <button
                    onClick={() => setEditedEntitlements({
                      ...editedEntitlements,
                      export_branding_enabled: !editedEntitlements.export_branding_enabled
                    })}
                    disabled={!isOrgAdmin}
                    className="disabled:opacity-50"
                  >
                    {(editedEntitlements.export_branding_enabled ?? effectiveEntitlements.export_branding_enabled) ? (
                      <Unlock size={20} className="text-green-600" />
                    ) : (
                      <Lock size={20} className="text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <span className="text-sm font-medium text-slate-700">Shared Templates</span>
                  <button
                    onClick={() => setEditedEntitlements({
                      ...editedEntitlements,
                      shared_templates_enabled: !editedEntitlements.shared_templates_enabled
                    })}
                    disabled={!isOrgAdmin}
                    className="disabled:opacity-50"
                  >
                    {(editedEntitlements.shared_templates_enabled ?? effectiveEntitlements.shared_templates_enabled) ? (
                      <Unlock size={20} className="text-green-600" />
                    ) : (
                      <Lock size={20} className="text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <span className="text-sm font-medium text-slate-700">Org-Level Methodology</span>
                  <button
                    onClick={() => setEditedEntitlements({
                      ...editedEntitlements,
                      org_level_methodology_enabled: !editedEntitlements.org_level_methodology_enabled
                    })}
                    disabled={!isOrgAdmin}
                    className="disabled:opacity-50"
                  >
                    {(editedEntitlements.org_level_methodology_enabled ?? effectiveEntitlements.org_level_methodology_enabled) ? (
                      <Unlock size={20} className="text-green-600" />
                    ) : (
                      <Lock size={20} className="text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Governance Settings Tab */}
      {activeTab === 'governance' && editedGovernance && (
        <div className="space-y-6">
          {!isOrgAdmin && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-600" />
              <p className="text-sm text-orange-800">Only organisation administrators can modify governance settings.</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Organisation Defaults</h2>
                <p className="text-sm text-slate-600 mt-1">Default values for new projects</p>
              </div>
              {isOrgAdmin && (
                <button
                  onClick={handleGovernanceSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Default Hourly Rate (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedGovernance.org_defaults_json?.hourly_rate_default || 50}
                  onChange={(e) => setEditedGovernance({
                    ...editedGovernance,
                    org_defaults_json: {
                      ...editedGovernance.org_defaults_json,
                      hourly_rate_default: parseFloat(e.target.value)
                    }
                  })}
                  disabled={!isOrgAdmin}
                  className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Governance Modes</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Methodology Governance
                </label>
                <select
                  value={editedGovernance.methodology_governance_mode}
                  onChange={(e) => setEditedGovernance({
                    ...editedGovernance,
                    methodology_governance_mode: e.target.value as MethodologyGovernanceMode
                  })}
                  disabled={!isOrgAdmin || !effectiveEntitlements.org_level_methodology_enabled}
                  className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                >
                  <option value="project_only">Project Only - Each project manages independently</option>
                  <option value="org_approved">Org Approved - Projects inherit org methodology</option>
                </select>
                {!effectiveEntitlements.org_level_methodology_enabled && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <Info size={12} />
                    Org-level methodology requires Organisation plan
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Template Governance
                </label>
                <select
                  value={editedGovernance.template_governance_mode}
                  onChange={(e) => setEditedGovernance({
                    ...editedGovernance,
                    template_governance_mode: e.target.value as TemplateGovernanceMode
                  })}
                  disabled={!isOrgAdmin || !effectiveEntitlements.shared_templates_enabled}
                  className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                >
                  <option value="project_only">Project Only - Templates not shared</option>
                  <option value="org_shared">Org Shared - Templates shared across organisation</option>
                  <option value="org_locked">Org Locked - Only admins can edit org templates</option>
                </select>
                {!effectiveEntitlements.shared_templates_enabled && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <Info size={12} />
                    Shared templates require Portfolio plan or higher
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Export Branding</h2>
            </div>
            <div className="p-6 space-y-4">
              {!effectiveEntitlements.export_branding_enabled ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-2">
                  <Lock size={20} className="text-slate-400" />
                  <p className="text-sm text-slate-600">Export branding requires Portfolio plan or higher</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={editedGovernance.branding_json?.footer_text || ''}
                      onChange={(e) => setEditedGovernance({
                        ...editedGovernance,
                        branding_json: {
                          ...editedGovernance.branding_json,
                          footer_text: e.target.value
                        }
                      })}
                      disabled={!isOrgAdmin}
                      placeholder="e.g., © 2024 Your Organisation"
                      className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Disclaimer Text
                    </label>
                    <textarea
                      value={editedGovernance.branding_json?.disclaimer_text || ''}
                      onChange={(e) => setEditedGovernance({
                        ...editedGovernance,
                        branding_json: {
                          ...editedGovernance.branding_json,
                          disclaimer_text: e.target.value
                        }
                      })}
                      disabled={!isOrgAdmin}
                      rows={3}
                      placeholder="Optional disclaimer text for exports..."
                      className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage & Limits Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Project Usage</h2>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Projects Created</span>
                  <span className="text-sm font-medium text-slate-900">
                    {projectCount} {maxProjects !== null ? `/ ${maxProjects}` : ''}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      projectLimitReached ? 'bg-red-600' : 'bg-blue-600'
                    }`}
                    style={{ width: maxProjects !== null ? `${Math.min((projectCount / maxProjects) * 100, 100)}%` : '50%' }}
                  />
                </div>
                {projectLimitReached && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle size={16} />
                    Project limit reached. Upgrade plan to create more projects.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{project.title}</div>
                      <div className="text-sm text-slate-600">
                        Created: {new Date(project.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Change Confirmation Modal */}
      {showPlanConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-slate-900">Confirm Plan Change</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Are you sure you want to change from <strong>{planTier}</strong> plan to <strong>{selectedPlan}</strong> plan?
              </p>
              <p className="text-sm text-slate-500">
                This will update your entitlements and may affect available features.
              </p>
            </div>
            <div className="p-6 border-t flex gap-2 justify-end">
              <button
                onClick={() => setShowPlanConfirm(false)}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handlePlanChange}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
              >
                {saving ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
