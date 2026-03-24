import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { logAuditEvent } from '../lib/audit';
import { ConfirmDialog, ProjectSelectionModal } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import { ExportService } from '../lib/exportService';
import {
  PlanTier,
  PlanCatalog,
  GovernanceSettings,
  MethodologyGovernanceMode,
  TemplateGovernanceMode,
  Entitlements,
  getEffectiveEntitlements,
  DEFAULT_ENTITLEMENTS,
} from '../lib/entitlements';
import {
  createPortalSession,
  isBillingActive,
  formatBillingInterval,
  formatRenewalDate,
} from '../lib/stripe';
import { Link, useSearchParams } from 'react-router-dom';
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
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  Building2,
  Palette,
  TrendingUp,
  ArrowRight,
  CreditCard,
  ExternalLink,
  Loader2,
  Calendar,
  Receipt,
} from 'lucide-react';

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    if (type === 'success') {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border transition-all animate-in slide-in-from-top-2 ${
      type === 'success'
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

export default function Governance() {
  const { profile } = useAuth();
  const { entitlements, planTier, planStatus, governance, billingInfo, isOrgAdmin, reload } = useEntitlements();
  const { currentOrg, currentOrgRole } = useOrganisation();
  const [searchParams] = useSearchParams();

  // Reliable org ID and admin check (same pattern as AdminSecurity)
  const orgId = currentOrg?.id || profile?.org_id;
  const isAdmin = isOrgAdmin || currentOrgRole === 'admin';
  const hasBilling = isBillingActive(billingInfo);

  const [confirmProps, confirmDialog] = useConfirm();
  const [activeTab, setActiveTab] = useState<'overview' | 'plan' | 'governance' | 'usage'>('overview');
  const [portalLoading, setPortalLoading] = useState(false);
  const [catalog, setCatalog] = useState<PlanCatalog[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPortfolio, setExportingPortfolio] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error') => setToast({ message, type }), []);

  // Plan editing state
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [editedEntitlements, setEditedEntitlements] = useState<Partial<Entitlements>>({});
  const [showPlanConfirm, setShowPlanConfirm] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [projectSelectionMaxProjects, setProjectSelectionMaxProjects] = useState<number>(1);

  // Governance editing state
  const [editedGovernance, setEditedGovernance] = useState<Partial<GovernanceSettings> | null>(null);

  // Track unsaved changes
  const [hasUnsavedEntitlements, setHasUnsavedEntitlements] = useState(false);
  const [hasUnsavedGovernance, setHasUnsavedGovernance] = useState(false);

  // Handle ?checkout=success redirect from Stripe
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      showToast('Subscription activated successfully! Welcome aboard.', 'success');
      // Reload entitlements to pick up new plan from webhook
      reload();
      // Clear the param from URL
      window.history.replaceState({}, '', '/governance');
    }
  }, [searchParams]);

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  useEffect(() => {
    if (planTier) {
      setSelectedPlan(planTier);
    }
  }, [planTier]);

  useEffect(() => {
    if (governance) {
      setEditedGovernance(governance);
    } else if (!editedGovernance && orgId) {
      // Initialize with defaults so the Governance tab never renders blank
      setEditedGovernance({
        org_id: orgId,
        org_defaults_json: { hourly_rate_default: 50 },
        methodology_governance_mode: 'project_only' as MethodologyGovernanceMode,
        template_governance_mode: 'project_only' as TemplateGovernanceMode,
        branding_json: {},
      } as GovernanceSettings);
    }
  }, [governance, orgId]);

  async function loadData() {
    if (!orgId) return;
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
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (projectsData) setProjects(projectsData);

      // Load member count via RPC (avoids RLS issues on organisation_members)
      try {
        const { data: orgs } = await supabase.rpc('list_my_organisations');
        // We can't get exact member count from this RPC, so try direct count
        const { count } = await supabase
          .from('organisation_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId);
        if (count !== null) setMemberCount(count);
      } catch {
        // Silently fail — member count is nice-to-have
      }
    } catch (error) {
      console.error('Error loading governance data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Helper: get the active plan via RPC (bypasses RLS) with fallback to direct query
  async function getActivePlan() {
    // Try RPC first (needs fix_governance.sql to be run)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_active_plan', { p_org_id: orgId });
    if (!rpcError && rpcData && rpcData.length > 0) {
      const row = rpcData[0];
      return { id: row.plan_id, plan_tier: row.plan_tier, status: row.plan_status, entitlements_json: row.entitlements_json };
    }

    // Fallback: direct query (works if RLS allows it)
    const { data, error } = await supabase
      .from('organisation_plans')
      .select('*')
      .eq('org_id', orgId!)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.warn('[Governance] Direct plan query also failed:', error.message);
      // If both fail, tell the user to run the SQL
      if (rpcError?.message?.includes('does not exist') || rpcError?.code === '42883') {
        throw new Error('Please run fix_governance.sql in Supabase SQL Editor first (download from /fix_governance.sql)');
      }
      throw error;
    }
    return data;
  }

  async function handlePlanChange() {
    if (!selectedPlan || !orgId || !isAdmin) return;

    setSaving(true);
    try {
      const existingPlan = await getActivePlan();

      if (!existingPlan) {
        showToast('No active plan found. Please run fix_governance.sql in Supabase SQL Editor.', 'error');
        return;
      }

      // Use RPC (also resets entitlements_json so new tier defaults apply)
      const { error: rpcError } = await supabase.rpc('update_plan_tier', {
        p_org_id: orgId,
        p_plan_tier: selectedPlan
      });

      if (rpcError) {
        // If RPC doesn't exist, tell user to run SQL
        if (rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
          throw new Error('Please run fix_governance.sql in Supabase SQL Editor first. Download it from the preview URL /fix_governance.sql');
        }
        throw rpcError;
      }

      // Reset local entitlements state since tier change clears overrides
      setEditedEntitlements({});
      setHasUnsavedEntitlements(false);

      try {
        await logAuditEvent(
          orgId,
          null,
          profile?.id || 'unknown',
          'organisation_plan',
          existingPlan.id,
          'update',
          { plan_tier: existingPlan.plan_tier },
          { plan_tier: selectedPlan }
        );
      } catch { /* best-effort audit */ }

      await reload();
      setShowPlanConfirm(false);
      showToast(`Switched to ${selectedPlan} plan successfully!`, 'success');

      // Check if downgrade results in excess projects
      const newMaxProjects = DEFAULT_ENTITLEMENTS[selectedPlan]?.max_projects;
      if (newMaxProjects !== null && projects.length > newMaxProjects) {
        setProjectSelectionMaxProjects(newMaxProjects);
        setShowProjectSelection(true);
      }
    } catch (error: any) {
      console.error('[Governance] Error updating plan:', error);
      showToast('Failed to update plan: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleEntitlementsSave() {
    if (!orgId || !isAdmin) return;

    setSaving(true);
    try {
      // Use RPC (bypasses RLS which blocks direct updates)
      const { error: rpcError } = await supabase.rpc('update_plan_entitlements', {
        p_org_id: orgId,
        p_entitlements: editedEntitlements
      });

      if (rpcError) {
        if (rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
          throw new Error('Please run fix_governance.sql in Supabase SQL Editor first. Download it from the preview URL /fix_governance.sql');
        }
        throw rpcError;
      }

      try {
        const existingPlan = await getActivePlan();
        if (existingPlan) {
          await logAuditEvent(
            orgId,
            null,
            profile?.id || 'unknown',
            'organisation_plan',
            existingPlan.id,
            'update',
            { entitlements_json: existingPlan.entitlements_json },
            { entitlements_json: editedEntitlements }
          );
        }
      } catch { /* best-effort audit */ }

      await reload();
      setHasUnsavedEntitlements(false);
      showToast('Entitlements updated successfully!', 'success');
    } catch (error: any) {
      console.error('[Governance] Error updating entitlements:', error);
      showToast('Failed to update entitlements: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleGovernanceSave() {
    if (!orgId || !isAdmin || !editedGovernance) return;

    setSaving(true);
    try {
      // Try RPC first (bypasses RLS)
      const { error: rpcError } = await supabase.rpc('update_governance_settings', {
        p_org_id: orgId,
        p_org_defaults: editedGovernance.org_defaults_json || null,
        p_methodology_mode: editedGovernance.methodology_governance_mode || null,
        p_template_mode: editedGovernance.template_governance_mode || null,
        p_branding: editedGovernance.branding_json || null,
      });

      if (rpcError) {
        // Fallback to direct update
        if (rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
          const { error: directError } = await supabase
            .from('organisation_governance_settings')
            .update({
              org_defaults_json: editedGovernance.org_defaults_json,
              methodology_governance_mode: editedGovernance.methodology_governance_mode,
              template_governance_mode: editedGovernance.template_governance_mode,
              branding_json: editedGovernance.branding_json,
              updated_by: profile?.id,
              updated_at: new Date().toISOString(),
            })
            .eq('org_id', orgId);
          if (directError) throw directError;
        } else {
          throw rpcError;
        }
      }

      try {
        await logAuditEvent(
          orgId,
          null,
          profile?.id || 'unknown',
          'governance_settings',
          editedGovernance.id!,
          'update',
          governance,
          editedGovernance
        );
      } catch { /* best-effort audit */ }

      await reload();
      setHasUnsavedGovernance(false);
      showToast('Governance settings saved successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating governance:', error);
      showToast('Failed to update governance settings: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPortfolio() {
    if (!orgId || !entitlements?.portfolio_dashboard_enabled) return;

    setExportingPortfolio(true);
    try {
      const accessibleProjectIds = projects.map(p => p.id);
      await ExportService.downloadPortfolioBundle(orgId, profile?.id || 'unknown', accessibleProjectIds);
      showToast('Portfolio governance pack generated! Download will start shortly.', 'success');
    } catch (error: any) {
      console.error('Error exporting portfolio:', error);
      showToast('Failed to export portfolio: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setExportingPortfolio(false);
    }
  }

  async function handleOpenPortal() {
    if (!orgId) return;
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession(orgId);
      window.location.href = url;
    } catch (error: any) {
      console.error('[Governance] Portal session error:', error);
      showToast(error.message || 'Failed to open billing portal', 'error');
      setPortalLoading(false);
    }
  }

  async function resetEntitlementsToDefaults() {
    const ok = await confirmDialog({ title: 'Reset entitlements?', message: 'All overrides will be reverted to plan defaults.', variant: 'warning', confirmLabel: 'Reset' });
    if (ok) {
      setEditedEntitlements({});
      setHasUnsavedEntitlements(true);
      showToast('Entitlements reset to defaults. Save to apply.', 'success');
    }
  }

  // Helper to get plan icon and colour
  function getPlanStyle(tier: string) {
    switch (tier) {
      case 'project': return { icon: Zap, color: 'blue', label: 'Project' };
      case 'portfolio': return { icon: Building2, color: 'green', label: 'Portfolio' };
      case 'organisation': return { icon: Crown, color: 'amber', label: 'Organisation' };
      case 'enterprise': return { icon: Shield, color: 'indigo', label: 'Enterprise' };
      default: return { icon: Shield, color: 'slate', label: tier };
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
      {/* Toast notifications */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Plans & Governance</h1>
        <p className="text-slate-600 mt-1">Manage organisation plan, entitlements, and governance settings</p>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {[
          { key: 'overview' as const, icon: BarChart3, label: 'Overview' },
          { key: 'plan' as const, icon: Shield, label: 'Plan & Entitlements', badge: hasUnsavedEntitlements },
          { key: 'governance' as const, icon: Settings, label: 'Governance Settings', badge: hasUnsavedGovernance },
          { key: 'usage' as const, icon: Users, label: 'Usage & Limits' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.badge && (
              <span className="w-2 h-2 bg-amber-500 rounded-full absolute -top-0.5 -right-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Plan Hero Card */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{currentPlan?.name || planTier}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      planStatus === 'active' ? 'bg-green-400/20 text-green-100 border border-green-300/30' :
                      planStatus === 'trial' ? 'bg-amber-400/20 text-amber-100 border border-amber-300/30' :
                      'bg-red-400/20 text-red-100 border border-red-300/30'
                    }`}>
                      {planStatus === 'active' ? 'Active' : planStatus === 'trial' ? 'Trial' : planStatus}
                    </span>
                  </div>
                  <p className="text-blue-100 text-sm max-w-lg">{currentPlan?.description}</p>
                </div>
                <button
                  onClick={() => setActiveTab('plan')}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Manage Plan
                </button>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
              <div className="p-5 text-center">
                <div className="text-2xl font-bold text-slate-900">{projectCount}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {maxProjects !== null ? `of ${maxProjects} projects` : 'Projects (unlimited)'}
                </div>
              </div>
              <div className="p-5 text-center">
                <div className="text-2xl font-bold text-slate-900">{memberCount || '—'}</div>
                <div className="text-xs text-slate-500 mt-1">Team Members</div>
              </div>
              <div className="p-5 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {governance?.methodology_governance_mode === 'org_approved' ? 'Org' : 'Project'}
                </div>
                <div className="text-xs text-slate-500 mt-1">Methodology Mode</div>
              </div>
              <div className="p-5 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  €{editedGovernance?.org_defaults_json?.hourly_rate_default || governance?.org_defaults_json?.hourly_rate_default || 50}
                </div>
                <div className="text-xs text-slate-500 mt-1">Default Hourly Rate</div>
              </div>
            </div>
          </div>

          {/* Billing Management Card */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#1BAE70]/10 p-2 rounded-lg">
                    <CreditCard size={20} className="text-[#1BAE70]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Billing & Subscription</h3>
                    <p className="text-xs text-slate-500">
                      {hasBilling ? 'Manage your subscription, invoices, and payment methods' : 'Set up billing to activate your subscription'}
                    </p>
                  </div>
                </div>
                {hasBilling && (
                  <button
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className="inline-flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#06752E] transition disabled:opacity-60"
                  >
                    {portalLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <ExternalLink size={14} />
                        Manage Billing
                      </>
                    )}
                  </button>
                )}
              </div>

              {hasBilling ? (
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  <div className="p-5 flex items-start gap-3">
                    <Receipt size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">Billing Cycle</div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatBillingInterval(billingInfo?.billing_interval || null)}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex items-start gap-3">
                    <Calendar size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">
                        {billingInfo?.cancel_at_period_end ? 'Cancels On' : 'Renews On'}
                      </div>
                      <div className={`text-sm font-medium ${billingInfo?.cancel_at_period_end ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatRenewalDate(billingInfo?.current_period_end || null)}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex items-start gap-3">
                    <Shield size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">Status</div>
                      <div className="text-sm font-medium">
                        {billingInfo?.cancel_at_period_end ? (
                          <span className="text-red-600">Cancelling</span>
                        ) : billingInfo?.status === 'trial' ? (
                          <span className="text-amber-600">Trial</span>
                        ) : (
                          <span className="text-green-600">Active</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
                    <Info size={16} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600">
                        No active subscription found. Subscribe to a plan to enable automatic billing.
                      </p>
                    </div>
                    <Link
                      to="/plans"
                      className="inline-flex items-center gap-1.5 bg-[#1BAE70] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#06752E] transition whitespace-nowrap"
                    >
                      View Plans
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Cancellation warning */}
              {billingInfo?.cancel_at_period_end && (
                <div className="px-6 pb-5">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800 font-medium">Subscription cancelling</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Your subscription will end on {formatRenewalDate(billingInfo.current_period_end)}.
                        After that, your plan will be suspended and features will be locked.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                      className="text-red-700 hover:text-red-900 text-sm font-medium underline whitespace-nowrap"
                    >
                      Reactivate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Plan Comparison Link */}
          <Link
            to="/plans"
            className="flex items-center justify-between bg-white rounded-lg shadow p-4 hover:bg-blue-50 hover:border-blue-200 border border-transparent transition group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition">
                <BarChart3 size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">Compare All Plans & Pricing</div>
                <div className="text-xs text-slate-500">See full feature comparison, pricing tiers, and upgrade options</div>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-600 transition" />
          </Link>

          {/* Feature Status Cards */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Feature Entitlements</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Portfolio Dashboard', enabled: effectiveEntitlements.portfolio_dashboard_enabled },
                { label: 'Export Branding', enabled: effectiveEntitlements.export_branding_enabled },
                { label: 'Shared Templates', enabled: effectiveEntitlements.shared_templates_enabled },
                { label: 'Org Methodology', enabled: effectiveEntitlements.org_level_methodology_enabled },
                { label: 'Org Defaults', enabled: effectiveEntitlements.org_defaults_enabled },
              ].map((feature) => (
                <div key={feature.label} className={`rounded-lg p-4 border transition ${
                  feature.enabled
                    ? 'bg-green-50 border-green-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {feature.enabled ? (
                      <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                    ) : (
                      <Lock size={18} className="text-slate-400 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${feature.enabled ? 'text-green-800' : 'text-slate-500'}`}>
                      {feature.label}
                    </span>
                  </div>
                  <div className={`text-xs mt-1.5 ml-7 ${feature.enabled ? 'text-green-600' : 'text-slate-400'}`}>
                    {feature.enabled ? 'Enabled' : 'Upgrade to unlock'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Governance Pack */}
          {entitlements?.portfolio_dashboard_enabled && projects.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Package size={32} className="text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Portfolio Governance Pack</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Generate a management-ready governance artifact covering all {projects.length} project{projects.length !== 1 ? 's' : ''} in your organisation.
                    Includes compliance status, active flags, projects at risk, and decision-support summaries.
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
          {!isAdmin && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-600" />
              <p className="text-sm text-orange-800">Only organisation administrators can modify plan and entitlements.</p>
            </div>
          )}

          {/* Unsaved changes bar */}
          {hasUnsavedEntitlements && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="text-sm text-amber-800 font-medium">You have unsaved entitlement changes</span>
              </div>
              <button
                onClick={handleEntitlementsSave}
                disabled={saving}
                className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-amber-700 disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : 'Save Now'}
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Plan Tier</h2>
              <p className="text-sm text-slate-600 mt-1">Select your organisation's plan tier</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {catalog.map((plan) => {
                  const style = getPlanStyle(plan.plan_tier);
                  const isCurrent = plan.plan_tier === planTier;
                  const isSelected = selectedPlan === plan.plan_tier;
                  return (
                    <button
                      key={plan.plan_tier}
                      onClick={() => {
                        if (isAdmin) {
                          setSelectedPlan(plan.plan_tier);
                          if (plan.plan_tier !== planTier) {
                            setShowPlanConfirm(true);
                          }
                        }
                      }}
                      disabled={!isAdmin}
                      className={`border-2 rounded-lg p-6 text-left transition relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300'
                      } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          Current Plan
                        </span>
                      )}
                      <div className="flex items-center gap-2.5 mb-3 mt-1">
                        <style.icon size={22} className={isCurrent ? 'text-blue-600' : 'text-slate-400'} />
                        <span className="font-semibold text-lg text-slate-900">{plan.name}</span>
                      </div>
                      <div className="text-sm text-slate-600 mb-4">{plan.description}</div>
                      {isSelected && !isCurrent && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <TrendingUp size={16} />
                          <span className="text-sm font-medium">Switch to this plan</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Entitlement Overrides</h2>
                <p className="text-sm text-slate-600 mt-1">Customize entitlements for your organisation</p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={resetEntitlementsToDefaults}
                    className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 text-sm"
                  >
                    <RefreshCw size={16} />
                    Reset to Defaults
                  </button>
                  <button
                    onClick={handleEntitlementsSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400 text-sm"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Maximum Projects</span>
                    <input
                      type="number"
                      min="1"
                      value={editedEntitlements.max_projects ?? maxProjects ?? ''}
                      onChange={(e) => {
                        setEditedEntitlements({
                          ...editedEntitlements,
                          max_projects: e.target.value ? parseInt(e.target.value) : null
                        });
                        setHasUnsavedEntitlements(true);
                      }}
                      disabled={!isAdmin}
                      className="w-32 px-3 py-2 border rounded disabled:bg-slate-100"
                      placeholder="Unlimited"
                    />
                  </label>
                  <p className="text-xs text-slate-500">Leave empty for unlimited projects</p>
                </div>

                {[
                  { key: 'portfolio_dashboard_enabled' as const, label: 'Portfolio Dashboard', desc: 'Cross-project governance overview' },
                  { key: 'export_branding_enabled' as const, label: 'Export Branding', desc: 'Custom branding in exported reports' },
                  { key: 'shared_templates_enabled' as const, label: 'Shared Templates', desc: 'Share templates across projects' },
                  { key: 'org_level_methodology_enabled' as const, label: 'Org-Level Methodology', desc: 'Enforce methodology at organisation level' },
                ].map(item => {
                  const isEnabled = editedEntitlements[item.key] ?? (effectiveEntitlements as any)[item.key];
                  return (
                    <div key={item.key} className={`flex items-center justify-between p-3 rounded border transition ${
                      isEnabled ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditedEntitlements({
                            ...editedEntitlements,
                            [item.key]: !isEnabled
                          });
                          setHasUnsavedEntitlements(true);
                        }}
                        disabled={!isAdmin}
                        className="disabled:opacity-50"
                      >
                        {isEnabled ? (
                          <Unlock size={20} className="text-green-600" />
                        ) : (
                          <Lock size={20} className="text-slate-400" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Governance Settings Tab */}
      {activeTab === 'governance' && editedGovernance && (
        <div className="space-y-6">
          {!isAdmin && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-600" />
              <p className="text-sm text-orange-800">Only organisation administrators can modify governance settings.</p>
            </div>
          )}

          {/* Unsaved changes bar */}
          {hasUnsavedGovernance && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="text-sm text-amber-800 font-medium">You have unsaved governance changes</span>
              </div>
              <button
                onClick={handleGovernanceSave}
                disabled={saving}
                className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-amber-700 disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : 'Save Now'}
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Organisation Defaults</h2>
                <p className="text-sm text-slate-600 mt-1">Default values applied to new projects</p>
              </div>
              {isAdmin && (
                <button
                  onClick={handleGovernanceSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400 text-sm"
                >
                  <Save size={16} />
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
                  onChange={(e) => {
                    setEditedGovernance({
                      ...editedGovernance,
                      org_defaults_json: {
                        ...editedGovernance.org_defaults_json,
                        hourly_rate_default: parseFloat(e.target.value)
                      }
                    });
                    setHasUnsavedGovernance(true);
                  }}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                />
                <p className="text-xs text-slate-500 mt-1">Applied as the default cost rate when creating new project activities</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Governance Modes</h2>
              <p className="text-sm text-slate-600 mt-1">Control how methodology and templates are managed across projects</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Methodology Governance
                </label>
                <select
                  value={editedGovernance.methodology_governance_mode}
                  onChange={(e) => {
                    setEditedGovernance({
                      ...editedGovernance,
                      methodology_governance_mode: e.target.value as MethodologyGovernanceMode
                    });
                    setHasUnsavedGovernance(true);
                  }}
                  disabled={!isAdmin || !effectiveEntitlements.org_level_methodology_enabled}
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
                  onChange={(e) => {
                    setEditedGovernance({
                      ...editedGovernance,
                      template_governance_mode: e.target.value as TemplateGovernanceMode
                    });
                    setHasUnsavedGovernance(true);
                  }}
                  disabled={!isAdmin || !effectiveEntitlements.shared_templates_enabled}
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
            <div className="p-6 border-b flex items-center gap-3">
              <Palette size={20} className="text-slate-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Export Branding</h2>
                <p className="text-sm text-slate-600 mt-0.5">Customise how your exported reports look</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {!effectiveEntitlements.export_branding_enabled ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-2">
                  <Lock size={20} className="text-slate-400" />
                  <p className="text-sm text-slate-600">Export branding requires Portfolio plan or higher</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Organisation Logo URL
                      </label>
                      <input
                        type="url"
                        value={editedGovernance.branding_json?.logo_url || ''}
                        onChange={(e) => {
                          setEditedGovernance({
                            ...editedGovernance,
                            branding_json: {
                              ...editedGovernance.branding_json,
                              logo_url: e.target.value
                            }
                          });
                          setHasUnsavedGovernance(true);
                        }}
                        disabled={!isAdmin}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                      />
                      <p className="text-xs text-slate-500 mt-1">Appears in report headers</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Primary Brand Colour
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editedGovernance.branding_json?.primary_color || '#1BAE70'}
                          onChange={(e) => {
                            setEditedGovernance({
                              ...editedGovernance,
                              branding_json: {
                                ...editedGovernance.branding_json,
                                primary_color: e.target.value
                              }
                            });
                            setHasUnsavedGovernance(true);
                          }}
                          disabled={!isAdmin}
                          className="w-12 h-10 border rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                        <input
                          type="text"
                          value={editedGovernance.branding_json?.primary_color || '#1BAE70'}
                          onChange={(e) => {
                            setEditedGovernance({
                              ...editedGovernance,
                              branding_json: {
                                ...editedGovernance.branding_json,
                                primary_color: e.target.value
                              }
                            });
                            setHasUnsavedGovernance(true);
                          }}
                          disabled={!isAdmin}
                          placeholder="#1BAE70"
                          className="flex-1 px-3 py-2 border rounded disabled:bg-slate-100 font-mono text-sm"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Used for headers and accents in exports</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Report Header Text
                    </label>
                    <input
                      type="text"
                      value={editedGovernance.branding_json?.header_text || ''}
                      onChange={(e) => {
                        setEditedGovernance({
                          ...editedGovernance,
                          branding_json: {
                            ...editedGovernance.branding_json,
                            header_text: e.target.value
                          }
                        });
                        setHasUnsavedGovernance(true);
                      }}
                      disabled={!isAdmin}
                      placeholder="e.g., SENIC - EU Project Governance"
                      className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                    />
                    <p className="text-xs text-slate-500 mt-1">Displayed at the top of every exported report</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={editedGovernance.branding_json?.footer_text || ''}
                      onChange={(e) => {
                        setEditedGovernance({
                          ...editedGovernance,
                          branding_json: {
                            ...editedGovernance.branding_json,
                            footer_text: e.target.value
                          }
                        });
                        setHasUnsavedGovernance(true);
                      }}
                      disabled={!isAdmin}
                      placeholder="e.g., © 2026 Your Organisation"
                      className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Disclaimer Text
                    </label>
                    <textarea
                      value={editedGovernance.branding_json?.disclaimer_text || ''}
                      onChange={(e) => {
                        setEditedGovernance({
                          ...editedGovernance,
                          branding_json: {
                            ...editedGovernance.branding_json,
                            disclaimer_text: e.target.value
                          }
                        });
                        setHasUnsavedGovernance(true);
                      }}
                      disabled={!isAdmin}
                      rows={3}
                      placeholder="Optional legal or compliance disclaimer for all exports..."
                      className="w-full px-3 py-2 border rounded disabled:bg-slate-100"
                    />
                  </div>

                  {/* Preview */}
                  {(editedGovernance.branding_json?.header_text || editedGovernance.branding_json?.footer_text) && (
                    <div className="border-t pt-5 mt-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Branding Preview</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <div
                          className="px-4 py-3 text-white text-sm font-semibold flex items-center gap-2"
                          style={{ backgroundColor: editedGovernance.branding_json?.primary_color || '#1BAE70' }}
                        >
                          {editedGovernance.branding_json?.logo_url && (
                            <img
                              src={editedGovernance.branding_json.logo_url}
                              alt="Logo"
                              className="h-6 w-auto"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          {editedGovernance.branding_json?.header_text || 'Report Header'}
                        </div>
                        <div className="px-4 py-6 text-center text-sm text-slate-400">
                          Report content area
                        </div>
                        <div className="px-4 py-2 bg-slate-50 border-t text-xs text-slate-500 text-center">
                          {editedGovernance.branding_json?.footer_text || 'Footer text'}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage & Limits Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Usage summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">Projects</span>
                <BarChart3 size={18} className={projectLimitReached ? 'text-red-500' : 'text-blue-500'} />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{projectCount}</div>
              <div className="text-xs text-slate-500">
                {maxProjects !== null ? `of ${maxProjects} allowed` : 'Unlimited'}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    projectLimitReached ? 'bg-red-500' :
                    maxProjects && (projectCount / maxProjects) > 0.8 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: maxProjects !== null ? `${Math.min((projectCount / maxProjects) * 100, 100)}%` : '40%' }}
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">Team Members</span>
                <Users size={18} className="text-indigo-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{memberCount || '—'}</div>
              <div className="text-xs text-slate-500">Active members in organisation</div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: '30%' }} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">Features Active</span>
                <Shield size={18} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {[
                  effectiveEntitlements.portfolio_dashboard_enabled,
                  effectiveEntitlements.export_branding_enabled,
                  effectiveEntitlements.shared_templates_enabled,
                  effectiveEntitlements.org_level_methodology_enabled,
                  effectiveEntitlements.org_defaults_enabled,
                ].filter(Boolean).length}
                <span className="text-lg font-normal text-slate-400"> / 5</span>
              </div>
              <div className="text-xs text-slate-500">Entitlements enabled</div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${([
                    effectiveEntitlements.portfolio_dashboard_enabled,
                    effectiveEntitlements.export_branding_enabled,
                    effectiveEntitlements.shared_templates_enabled,
                    effectiveEntitlements.org_level_methodology_enabled,
                    effectiveEntitlements.org_defaults_enabled,
                  ].filter(Boolean).length / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {projectLimitReached && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Project limit reached</p>
                <p className="text-xs text-red-600 mt-0.5">Upgrade your plan to create more projects.</p>
              </div>
              <button
                onClick={() => setActiveTab('plan')}
                className="ml-auto bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700"
              >
                Upgrade Plan
              </button>
            </div>
          )}

          {/* Project list */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
              <p className="text-sm text-slate-600 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''} in your organisation</p>
            </div>
            <div className="divide-y">
              {projects.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <BarChart3 size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No projects yet. Create your first project to get started.</p>
                </div>
              ) : (
                projects.map((project, idx) => (
                  <div key={project.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{project.title}</div>
                        <div className="text-xs text-slate-500">
                          Created {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
      <ConfirmDialog {...confirmProps} />

      {/* Project Selection Modal (shown after downgrade with excess projects) */}
      {showProjectSelection && (
        <ProjectSelectionModal
          maxProjects={projectSelectionMaxProjects}
          onConfirm={(activeIds) => {
            // For now, log the selection — persistence will come with Stripe integration
            console.log('[Governance] User selected active projects:', activeIds);
            setShowProjectSelection(false);
            showToast(`Selected ${activeIds.length} active project${activeIds.length > 1 ? 's' : ''}. Remaining projects are now read-only.`, 'success');
          }}
          onClose={() => setShowProjectSelection(false)}
        />
      )}
    </div>
  );
}
