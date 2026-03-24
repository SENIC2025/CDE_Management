import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { DecisionSupportService, RecommendationFlag, ChannelEffectiveness, ObjectiveDiagnostic } from '../lib/decisionSupport';
import { OnboardingStatus, calculateOnboardingProgress, ONBOARDING_STEPS } from '../lib/onboarding';
import { ExportService } from '../lib/exportService';
import { getPlanDisplayName } from '../lib/entitlements';
import { StorageMeter } from '../components/ui';
import FlagOverrideModal from '../components/FlagOverrideModal';
import {
  Target,
  Users,
  Calendar,
  FileCheck,
  TrendingUp,
  Shield,
  AlertCircle,
  CheckCircle,
  Zap,
  AlertTriangle,
  Info,
  Flag,
  Building2,
  Rocket,
  Package,
  Plus,
  Upload,
  BarChart3,
  ArrowRight,
  Clock,
  Sun,
  Moon,
  Sunrise,
  XCircle,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface DashboardStats {
  objectives: number;
  stakeholders: number;
  activities: number;
  evidence: number;
  uptakeOpportunities: number;
  complianceIssues: number;
}

interface RecentActivity {
  id: string;
  title: string;
  domain: string;
  status: string;
  updated_at: string;
}

// ── Toast Component ────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">×</button>
    </div>
  );
}

// ── Time-based greeting ────────────────────────────────
function getGreeting(): { text: string; icon: any } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sunrise };
  if (hour < 18) return { text: 'Good afternoon', icon: Sun };
  return { text: 'Good evening', icon: Moon };
}

// ── CDE workflow progress calculator ───────────────────
function calculateWorkflowProgress(stats: DashboardStats): { percentage: number; steps: { label: string; done: boolean }[] } {
  const steps = [
    { label: 'Objectives', done: stats.objectives > 0 },
    { label: 'Stakeholders', done: stats.stakeholders > 0 },
    { label: 'Activities', done: stats.activities > 0 },
    { label: 'Evidence', done: stats.evidence > 0 },
  ];
  const done = steps.filter(s => s.done).length;
  return { percentage: Math.round((done / steps.length) * 100), steps };
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { currentProject, projects } = useProject();
  const { currentOrg } = useOrganisation();
  const { entitlements, planTier, isOrgAdmin } = useEntitlements();

  // Use the reliable org ID
  const orgId = currentOrg?.id || profile?.org_id;

  const [stats, setStats] = useState<DashboardStats>({
    objectives: 0,
    stakeholders: 0,
    activities: 0,
    evidence: 0,
    uptakeOpportunities: 0,
    complianceIssues: 0,
  });
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<RecommendationFlag[]>([]);
  const [topChannels, setTopChannels] = useState<ChannelEffectiveness[]>([]);
  const [bottomChannels, setBottomChannels] = useState<ChannelEffectiveness[]>([]);
  const [atRiskObjectives, setAtRiskObjectives] = useState<ObjectiveDiagnostic[]>([]);
  const [medianUptakeLag, setMedianUptakeLag] = useState<number | null>(null);
  const [overrideModalFlag, setOverrideModalFlag] = useState<RecommendationFlag | null>(null);
  const [showPortfolioView, setShowPortfolioView] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [exportingPortfolio, setExportingPortfolio] = useState(false);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<{ passed: number; failed: number; total: number }>({ passed: 0, failed: 0, total: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // ── Load dashboard data ────────────────────────────
  useEffect(() => {
    if (orgId) {
      loadDashboardData();
      loadOnboardingStatus();
    } else {
      // No orgId available — stop loading so UI renders (empty state)
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (currentProject) {
      loadProjectStats();
      loadDecisionSupport();
      loadRecentActivities();
      loadComplianceStatus();
    }
  }, [currentProject]);

  async function loadDashboardData() {
    try {
      // Projects are already loaded via ProjectContext — we just need to finish loading
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectStats() {
    if (!currentProject) return;
    const pid = currentProject.id;

    try {
      // Run all counts in parallel
      const [objRes, stakRes, actRes, evRes, uptRes, compRes] = await Promise.all([
        supabase.from('cde_objectives').select('id', { count: 'exact', head: true }).eq('project_id', pid),
        supabase.from('stakeholder_groups').select('id', { count: 'exact', head: true }).eq('project_id', pid),
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('project_id', pid).is('deleted_at', null),
        supabase.from('evidence_items').select('id', { count: 'exact', head: true }).eq('project_id', pid),
        supabase.from('uptake_opportunities').select('id', { count: 'exact', head: true }).eq('project_id', pid),
        supabase.from('compliance_checks').select('id', { count: 'exact', head: true }).eq('project_id', pid).eq('status', 'fail'),
      ]);

      setStats({
        objectives: objRes.count || 0,
        stakeholders: stakRes.count || 0,
        activities: actRes.count || 0,
        evidence: evRes.count || 0,
        uptakeOpportunities: uptRes.count || 0,
        complianceIssues: compRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading project stats:', error);
    }
  }

  async function loadRecentActivities() {
    if (!currentProject) return;

    try {
      const { data } = await supabase
        .from('activities')
        .select('id, title, domain, status, updated_at')
        .eq('project_id', currentProject.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (data) setRecentActivities(data);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  }

  async function loadComplianceStatus() {
    if (!currentProject) return;

    try {
      const [passRes, failRes] = await Promise.all([
        supabase.from('compliance_checks').select('id', { count: 'exact', head: true }).eq('project_id', currentProject.id).eq('status', 'pass'),
        supabase.from('compliance_checks').select('id', { count: 'exact', head: true }).eq('project_id', currentProject.id).eq('status', 'fail'),
      ]);

      const passed = passRes.count || 0;
      const failed = failRes.count || 0;
      setComplianceStatus({ passed, failed, total: passed + failed });
    } catch (error) {
      console.error('Error loading compliance status:', error);
    }
  }

  async function loadOnboardingStatus() {
    if (!orgId) return;

    try {
      const { data } = await supabase
        .from('onboarding_status')
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle();

      if (data) {
        setOnboardingStatus(data as OnboardingStatus);
      }
    } catch (error) {
      console.error('Error loading onboarding status:', error);
    }
  }

  async function loadDecisionSupport() {
    if (!currentProject) return;

    try {
      const service = new DecisionSupportService(currentProject.id);
      await service.initialize();

      const flagsData = await service.generateRecommendationFlags();
      setFlags(flagsData.slice(0, 5));

      const channelData = await service.calculateChannelEffectiveness();
      setTopChannels(channelData.slice(0, 5));
      setBottomChannels(channelData.slice(-5).reverse());

      const objectivesData = await service.calculateObjectiveDiagnostics();
      setAtRiskObjectives(objectivesData.filter(o => o.status !== 'On track'));

      const metricsData = await service.calculateDerivedMetrics();
      setMedianUptakeLag(metricsData.uptake_lag_median_days);
    } catch (error) {
      console.error('Error loading decision support:', error);
    }
  }

  async function handleExportPortfolio() {
    if (!orgId || !entitlements?.portfolio_dashboard_enabled) return;

    setExportingPortfolio(true);
    try {
      const accessibleProjectIds = projects.map(p => p.id);
      await ExportService.downloadPortfolioBundle(orgId, profile!.id, accessibleProjectIds);
      showToast('Portfolio governance pack generated! Files will download shortly.', 'success');
    } catch (error: any) {
      console.error('Error exporting portfolio:', error);
      showToast('Failed to export portfolio: ' + error.message, 'error');
    } finally {
      setExportingPortfolio(false);
    }
  }

  // ── Derived values ─────────────────────────────────
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const workflowProgress = calculateWorkflowProgress(stats);

  const statCards = [
    { label: 'CDE Objectives', value: stats.objectives, icon: Target, color: 'bg-blue-500', hoverColor: 'hover:ring-blue-200', link: '/objectives' },
    { label: 'Stakeholder Groups', value: stats.stakeholders, icon: Users, color: 'bg-green-500', hoverColor: 'hover:ring-green-200', link: '/stakeholders' },
    { label: 'Activities', value: stats.activities, icon: Calendar, color: 'bg-orange-500', hoverColor: 'hover:ring-orange-200', link: '/activities' },
    { label: 'Evidence Items', value: stats.evidence, icon: FileCheck, color: 'bg-cyan-500', hoverColor: 'hover:ring-cyan-200', link: '/monitoring' },
    { label: 'Uptake Opportunities', value: stats.uptakeOpportunities, icon: TrendingUp, color: 'bg-emerald-500', hoverColor: 'hover:ring-emerald-200', link: '/uptake' },
    { label: 'Compliance Issues', value: stats.complianceIssues, icon: Shield, color: stats.complianceIssues > 0 ? 'bg-red-500' : 'bg-slate-400', hoverColor: 'hover:ring-red-200', link: '/compliance' },
  ];

  // ── Loading state ──────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <div className="bg-slate-200 rounded-xl h-48 animate-pulse" />
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="bg-slate-200 rounded h-3 w-16 mb-2 animate-pulse" />
              <div className="bg-slate-200 rounded h-7 w-10 animate-pulse" />
            </div>
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-200 rounded-xl h-64 animate-pulse" />
          <div className="bg-slate-200 rounded-xl h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Hero Section ──────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GreetingIcon size={20} className="text-blue-200" />
              <span className="text-blue-200 text-sm font-medium">{greeting.text}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              {profile?.full_name || 'Welcome'}
            </h1>
            {currentProject ? (
              <p className="text-blue-200 text-sm">
                Working on <span className="text-white font-medium">{currentProject.title}</span>
                {currentProject.programme_profile && (
                  <span> · {currentProject.programme_profile}</span>
                )}
              </p>
            ) : projects.length > 0 ? (
              <p className="text-blue-200 text-sm">
                {projects.length} project{projects.length !== 1 ? 's' : ''} in your organisation
              </p>
            ) : (
              <p className="text-blue-200 text-sm">Let's get started with your first project</p>
            )}
          </div>

          {/* Quick actions */}
          {currentProject && (
            <div className="flex flex-wrap gap-2">
              <Link
                to="/activities"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded-lg transition backdrop-blur-sm"
              >
                <Plus size={14} />
                Add Activity
              </Link>
              <Link
                to="/monitoring"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded-lg transition backdrop-blur-sm"
              >
                <Upload size={14} />
                Upload Evidence
              </Link>
              <Link
                to="/reports"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded-lg transition backdrop-blur-sm"
              >
                <BarChart3 size={14} />
                View Reports
              </Link>
            </div>
          )}
        </div>

        {/* Workflow progress bar */}
        {currentProject && (
          <div className="mt-5 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-200 font-medium">CDE Workflow Progress</span>
              <span className="text-xs text-white font-semibold">{workflowProgress.percentage}%</span>
            </div>
            <div className="flex gap-1">
              {workflowProgress.steps.map((step) => (
                <div key={step.label} className="flex-1" title={step.label}>
                  <div className={`h-1.5 rounded-full ${step.done ? 'bg-green-400' : 'bg-white/20'}`} />
                  <div className="text-[10px] text-blue-200 mt-1 text-center truncate">{step.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Portfolio / Project view toggle */}
      {entitlements?.portfolio_dashboard_enabled && projects.length > 1 && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowPortfolioView(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              !showPortfolioView ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Project View
          </button>
          <button
            onClick={() => setShowPortfolioView(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              showPortfolioView ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 size={16} />
            Portfolio View
          </button>
        </div>
      )}

      {/* ── Onboarding Banner ─────────────────────────── */}
      {onboardingStatus && !onboardingStatus.completed_at && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 text-white p-2.5 rounded-lg flex-shrink-0">
              <Rocket size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Complete Your Setup</h3>
              {/* Progress bar */}
              <div className="w-full bg-blue-100 rounded-full h-2.5 mb-3">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${calculateOnboardingProgress(onboardingStatus.checklist_json)}%` }}
                />
              </div>
              <p className="text-sm text-slate-600 mb-3">
                {calculateOnboardingProgress(onboardingStatus.checklist_json)}% complete —{' '}
                {ONBOARDING_STEPS.filter(s => !onboardingStatus.checklist_json[s.key]).length} steps remaining
              </p>
              <div className="flex gap-2">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  <Rocket size={16} />
                  Continue Setup
                </Link>
                <button
                  onClick={() => setOnboardingStatus({ ...onboardingStatus, completed_at: new Date().toISOString() })}
                  className="text-slate-500 px-4 py-2 hover:text-slate-700 text-sm transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Portfolio View ────────────────────────────── */}
      {showPortfolioView && entitlements?.portfolio_dashboard_enabled ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Building2 size={22} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Organisation Portfolio</h2>
                  <p className="text-sm text-slate-600">Cross-project analytics and insights</p>
                </div>
              </div>
              <button
                onClick={handleExportPortfolio}
                disabled={exportingPortfolio || projects.length === 0}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Package size={16} />
                {exportingPortfolio ? 'Exporting...' : 'Export Portfolio Pack'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="text-sm text-slate-500 mb-1">Total Projects</div>
              <div className="text-3xl font-bold text-slate-900">{projects.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="text-sm text-slate-500 mb-1">Active Projects</div>
              <div className="text-3xl font-bold text-blue-600">{projects.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="text-sm text-slate-500 mb-1">Compliance Issues</div>
              <div className="text-3xl font-bold text-slate-900">
                {complianceStatus.failed}
                {complianceStatus.total > 0 && (
                  <span className="text-sm text-slate-500 font-normal ml-1">/ {complianceStatus.total} checks</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold text-slate-900">Projects Overview</h3>
            </div>
            <div className="divide-y">
              {projects.map((project) => (
                <div key={project.id} className="p-5 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{project.title}</div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {project.programme_profile || 'No programme'}
                        {project.start_date && project.end_date && (
                          <span className="ml-2">
                            · {new Date(project.start_date).toLocaleDateString()} – {new Date(project.end_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : projects.length === 0 ? (
        /* ── Empty State ──────────────────────────────── */
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Layers size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to CDE Manager</h3>
            <p className="text-slate-600 mb-6">
              Create your first project to start managing Communication, Dissemination & Exploitation activities for your EU-funded project.
            </p>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus size={18} />
              Create Your First Project
            </Link>
          </div>
        </div>
      ) : (
        /* ── Project View ─────────────────────────────── */
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  to={card.link}
                  className={`bg-white rounded-xl shadow-sm border hover:shadow-md hover:ring-2 ${card.hoverColor} transition p-4 group`}
                >
                  <div className={`${card.color} text-white p-2 rounded-lg inline-flex group-hover:scale-110 transition mb-3`}>
                    <Icon size={18} />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{card.label}</div>
                </Link>
              );
            })}
          </div>

          {/* Plan & Usage Overview */}
          {entitlements && planTier && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Plan & Usage</h3>
                <Link to="/plans" className="text-xs text-[#1BAE70] hover:text-[#06752E] font-medium">
                  View Plans →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Projects usage */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1.5">Projects</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-slate-900">{projects.length}</span>
                    {entitlements.max_projects !== null ? (
                      <span className="text-sm text-slate-500">/ {entitlements.max_projects}</span>
                    ) : (
                      <span className="text-sm text-slate-500">/ ∞</span>
                    )}
                  </div>
                  {entitlements.max_projects !== null && (
                    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          projects.length >= (entitlements.max_projects || 1) ? 'bg-red-500' :
                          projects.length >= (entitlements.max_projects || 1) * 0.7 ? 'bg-amber-500' :
                          'bg-[#1BAE70]'
                        }`}
                        style={{ width: `${Math.min((projects.length / (entitlements.max_projects || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Team members usage */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1.5">Team Members</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-slate-900">—</span>
                    {entitlements.max_members !== null ? (
                      <span className="text-sm text-slate-500">/ {entitlements.max_members} seats</span>
                    ) : (
                      <span className="text-sm text-slate-500">/ ∞ seats</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Member count loads from admin</div>
                </div>

                {/* Storage usage */}
                <div>
                  <StorageMeter
                    usedMb={0}
                    limitGb={entitlements.max_storage_gb}
                    compact={false}
                    showUpgradeCta={true}
                  />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#1BAE70]" />
                  {getPlanDisplayName(planTier)} Plan
                </span>
                {isOrgAdmin && (
                  <Link to="/governance" className="text-xs text-slate-500 hover:text-slate-700">
                    Manage Plan →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Decision Support Section */}
          {currentProject && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-blue-600 text-white p-2.5 rounded-lg">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Decision Support</h2>
                  <p className="text-sm text-slate-500">AI-powered insights for your project</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Recommendations */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-slate-900">Top Recommendations</h3>
                    {flags.length > 0 && (
                      <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {flags.length} issue{flags.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {flags.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm py-4">
                      <CheckCircle size={18} />
                      No issues detected — your project looks healthy
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {flags.map((flag) => (
                        <div key={flag.id} className={`border-l-4 pl-3 py-2 ${
                          flag.severity === 'high' ? 'border-red-400' :
                          flag.severity === 'warn' ? 'border-orange-400' :
                          'border-blue-400'
                        }`}>
                          <div className="flex items-start gap-2">
                            {flag.severity === 'high' && <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />}
                            {flag.severity === 'warn' && <AlertCircle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />}
                            {flag.severity === 'info' && <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="text-sm font-medium text-slate-900 truncate">{flag.title}</div>
                                {flag.override && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">
                                    {flag.override.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{flag.explanation}</div>
                              <div className="flex items-center gap-3 mt-1.5">
                                <Link
                                  to={flag.deep_link_url}
                                  className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                  {flag.suggested_action} →
                                </Link>
                                <button
                                  onClick={() => setOverrideModalFlag(flag)}
                                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-0.5"
                                >
                                  <Flag size={10} />
                                  {flag.override ? 'Update' : 'Override'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Channel Effectiveness */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="text-base font-semibold text-slate-900 mb-4">Channel Effectiveness</h3>
                  {topChannels.length === 0 ? (
                    <div className="text-sm text-slate-500 py-4">
                      No channel data yet — add activities with channels to see performance insights
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wider">Top Performers</div>
                      <div className="space-y-2 mb-4">
                        {topChannels.slice(0, 3).map((channel) => (
                          <div key={channel.channel_id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700 truncate mr-2">{channel.channel_name}</span>
                            <span className="font-semibold text-green-600 flex-shrink-0">
                              {channel.effectiveness_score.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {bottomChannels.length > 0 && (
                        <>
                          <div className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wider">Needs Attention</div>
                          <div className="space-y-2">
                            {bottomChannels.slice(0, 2).map((channel) => (
                              <div key={channel.channel_id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700 truncate mr-2">{channel.channel_name}</span>
                                <span className="font-semibold text-red-600 flex-shrink-0">
                                  {channel.effectiveness_score.toFixed(3)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* At-Risk Objectives */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="text-base font-semibold text-slate-900 mb-4">At-Risk Objectives</h3>
                  {atRiskObjectives.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm py-4">
                      <CheckCircle size={18} />
                      All objectives on track
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {atRiskObjectives.slice(0, 4).map((obj) => (
                        <div key={obj.objective_id} className={`border-l-4 pl-3 py-2 ${
                          obj.status === 'Blocked' ? 'border-red-400' : 'border-orange-400'
                        }`}>
                          <div className="text-sm font-medium text-slate-900">{obj.objective_title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <span className={obj.status === 'Blocked' ? 'text-red-600 font-medium' : 'text-orange-600 font-medium'}>
                              {obj.status}
                            </span>
                            {obj.reasons[0] && <span> — {obj.reasons[0]}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="text-base font-semibold text-slate-900 mb-4">Key Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Median Uptake Lag</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {medianUptakeLag !== null ? `${medianUptakeLag}d` : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Dissemination → uptake signal
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Evidence Coverage</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {stats.activities > 0
                          ? `${Math.round((stats.evidence / Math.max(stats.activities, 1)) * 100)}%`
                          : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Activities with evidence
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom row: Recent Activities + Compliance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Recent Activities</h2>
                <Link to="/activities" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              <div className="divide-y">
                {recentActivities.length === 0 ? (
                  <div className="p-5 text-center">
                    <Activity size={24} className="text-slate-300 mx-auto mb-2" />
                    <div className="text-sm text-slate-500">No activities yet</div>
                    <Link to="/activities" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                      Create your first activity →
                    </Link>
                  </div>
                ) : (
                  recentActivities.map((activity) => (
                    <Link
                      key={activity.id}
                      to={`/activities`}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">{activity.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                            activity.domain === 'communication' ? 'text-blue-600' :
                            activity.domain === 'dissemination' ? 'text-green-600' :
                            'text-purple-600'
                          }`}>
                            {activity.domain}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(activity.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                        activity.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {activity.status === 'in_progress' ? 'In Progress' : activity.status || 'Planned'}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Compliance Status */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Compliance Status</h2>
                <Link to="/compliance" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              <div className="p-5">
                {complianceStatus.total === 0 ? (
                  <div className="text-center py-4">
                    <Shield size={24} className="text-slate-300 mx-auto mb-2" />
                    <div className="text-sm text-slate-500">No compliance checks configured</div>
                    <Link to="/compliance" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                      Set up compliance rules →
                    </Link>
                  </div>
                ) : (
                  <div>
                    {/* Visual bar */}
                    <div className="flex gap-0.5 mb-4 h-3 rounded-full overflow-hidden">
                      {complianceStatus.passed > 0 && (
                        <div
                          className="bg-green-500 rounded-l-full"
                          style={{ width: `${(complianceStatus.passed / complianceStatus.total) * 100}%` }}
                        />
                      )}
                      {complianceStatus.failed > 0 && (
                        <div
                          className="bg-red-500 rounded-r-full"
                          style={{ width: `${(complianceStatus.failed / complianceStatus.total) * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-sm text-slate-700">
                          <span className="font-semibold">{complianceStatus.passed}</span> passed
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-sm text-slate-700">
                          <span className="font-semibold">{complianceStatus.failed}</span> failed
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Projects list */}
          {projects.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-5 border-b">
                <h2 className="text-base font-semibold text-slate-900">Your Projects</h2>
              </div>
              <div className="divide-y">
                {projects.map((project) => (
                  <div key={project.id} className="p-5 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate">{project.title}</h3>
                          {project.id === currentProject?.id && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              Current
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-slate-500 mt-0.5 truncate">{project.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          {project.programme_profile && <span>{project.programme_profile}</span>}
                          {project.start_date && project.end_date && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(project.start_date).toLocaleDateString()} – {new Date(project.end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Flag Override Modal */}
      {overrideModalFlag && (
        <FlagOverrideModal
          flagCode={overrideModalFlag.flag_code || ''}
          entityType={overrideModalFlag.entity_type || ''}
          entityId={overrideModalFlag.entity_id || ''}
          currentOverride={overrideModalFlag.override}
          onClose={() => setOverrideModalFlag(null)}
          onSaved={() => {
            setOverrideModalFlag(null);
            loadDecisionSupport();
          }}
        />
      )}
    </div>
  );
}
