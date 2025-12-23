import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { DecisionSupportService, RecommendationFlag, ChannelEffectiveness, ObjectiveDiagnostic } from '../lib/decisionSupport';
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
} from 'lucide-react';

interface DashboardStats {
  objectives: number;
  stakeholders: number;
  activities: number;
  evidence: number;
  uptakeOpportunities: number;
  complianceIssues: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { currentProject } = useProject();
  const { entitlements } = useEntitlements();
  const [stats] = useState<DashboardStats>({
    objectives: 0,
    stakeholders: 0,
    activities: 0,
    evidence: 0,
    uptakeOpportunities: 0,
    complianceIssues: 0,
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<RecommendationFlag[]>([]);
  const [topChannels, setTopChannels] = useState<ChannelEffectiveness[]>([]);
  const [bottomChannels, setBottomChannels] = useState<ChannelEffectiveness[]>([]);
  const [atRiskObjectives, setAtRiskObjectives] = useState<ObjectiveDiagnostic[]>([]);
  const [medianUptakeLag, setMedianUptakeLag] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [overrideModalFlag, setOverrideModalFlag] = useState<RecommendationFlag | null>(null);
  const [showPortfolioView, setShowPortfolioView] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState<{projectCount: number, totalIssues: number}>({
    projectCount: 0,
    totalIssues: 0,
  });

  useEffect(() => {
    if (profile?.org_id) {
      loadDashboardData();
    }
  }, [profile]);

  useEffect(() => {
    if (currentProject) {
      loadDecisionSupport();
    }
  }, [currentProject, selectedPeriod]);

  async function loadDashboardData() {
    try {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', profile!.org_id)
        .order('created_at', { ascending: false });

      if (projectsData) {
        setProjects(projectsData);
        setPortfolioStats({
          projectCount: projectsData.length,
          totalIssues: 0,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
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

  const statCards = [
    { label: 'CDE Objectives', value: stats.objectives, icon: Target, color: 'bg-blue-500', link: '/objectives' },
    { label: 'Stakeholder Groups', value: stats.stakeholders, icon: Users, color: 'bg-green-500', link: '/stakeholders' },
    { label: 'Activities', value: stats.activities, icon: Calendar, color: 'bg-orange-500', link: '/activities' },
    { label: 'Evidence Items', value: stats.evidence, icon: FileCheck, color: 'bg-cyan-500', link: '/monitoring' },
    { label: 'Uptake Opportunities', value: stats.uptakeOpportunities, icon: TrendingUp, color: 'bg-emerald-500', link: '/uptake' },
    { label: 'Compliance Issues', value: stats.complianceIssues, icon: Shield, color: 'bg-red-500', link: '/compliance' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome back, {profile?.name}</p>
        </div>
        {entitlements?.portfolio_dashboard_enabled && projects.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPortfolioView(false)}
              className={`px-4 py-2 rounded-md transition ${
                !showPortfolioView ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Project View
            </button>
            <button
              onClick={() => setShowPortfolioView(true)}
              className={`px-4 py-2 rounded-md transition flex items-center gap-2 ${
                showPortfolioView ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Building2 size={18} />
              Portfolio View
            </button>
          </div>
        )}
      </div>

      {showPortfolioView && entitlements?.portfolio_dashboard_enabled ? (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-900">Organisation Portfolio</h2>
            </div>
            <p className="text-sm text-blue-700">Cross-project analytics and insights across your organisation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-slate-600 mb-1">Total Projects</div>
              <div className="text-3xl font-bold text-slate-900">{portfolioStats.projectCount}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-slate-600 mb-1">Active Projects</div>
              <div className="text-3xl font-bold text-slate-900">{projects.length}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-slate-600 mb-1">Projects at Risk</div>
              <div className="text-3xl font-bold text-red-600">0</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-slate-900">Projects Overview</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{project.title}</div>
                        <div className="text-sm text-slate-600">{project.description || 'No description'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          Active
                        </span>
                        <Link
                          to="/"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="max-w-md mx-auto">
            <AlertCircle className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Projects Yet</h3>
            <p className="text-slate-600 mb-4">
              Get started by creating your first project to manage CDE activities.
            </p>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Create First Project
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  to={card.link}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${card.color} text-white p-3 rounded-lg group-hover:scale-110 transition`}>
                      <Icon size={24} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{card.value}</div>
                  <div className="text-slate-600 text-sm">{card.label}</div>
                </Link>
              );
            })}
          </div>

          {currentProject && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg border border-blue-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-600 text-white p-3 rounded-lg">
                  <Zap size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Decision Support</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Recommendations</h3>
                  {flags.length === 0 ? (
                    <div className="text-sm text-slate-600">No issues detected</div>
                  ) : (
                    <div className="space-y-3">
                      {flags.map((flag) => (
                        <div key={flag.id} className="border-l-4 border-red-400 pl-4 py-2">
                          <div className="flex items-start gap-2">
                            {flag.severity === 'high' && <AlertTriangle size={18} className="text-red-600 mt-0.5" />}
                            {flag.severity === 'warn' && <AlertCircle size={18} className="text-orange-600 mt-0.5" />}
                            {flag.severity === 'info' && <Info size={18} className="text-blue-600 mt-0.5" />}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-slate-900">{flag.title}</div>
                                {flag.override && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                    {flag.override.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 mt-1">{flag.explanation}</div>
                              {flag.override && (
                                <div className="text-xs text-slate-500 italic mt-1">
                                  Override: {flag.override.rationale}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Link
                                  to={flag.deep_link_url}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  {flag.suggested_action} →
                                </Link>
                                <button
                                  onClick={() => setOverrideModalFlag(flag)}
                                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                                >
                                  <Flag size={12} />
                                  {flag.override ? 'Update Override' : 'Override'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Channel Effectiveness</h3>
                  {topChannels.length === 0 ? (
                    <div className="text-sm text-slate-600">No channel data</div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-green-700 mb-2">Top Performers</div>
                      <div className="space-y-2 mb-4">
                        {topChannels.slice(0, 3).map((channel) => (
                          <div key={channel.channel_id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{channel.channel_name}</span>
                            <span className="font-semibold text-green-600">
                              {channel.effectiveness_score.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {bottomChannels.length > 0 && (
                        <>
                          <div className="text-xs font-semibold text-red-700 mb-2">Needs Attention</div>
                          <div className="space-y-2">
                            {bottomChannels.slice(0, 2).map((channel) => (
                              <div key={channel.channel_id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700">{channel.channel_name}</span>
                                <span className="font-semibold text-red-600">
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

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">At-Risk Objectives</h3>
                  {atRiskObjectives.length === 0 ? (
                    <div className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle size={18} />
                      All objectives on track
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {atRiskObjectives.slice(0, 4).map((obj) => (
                        <div key={obj.objective_id} className="border-l-4 border-orange-400 pl-3 py-1">
                          <div className="text-sm font-semibold text-slate-900">{obj.objective_title}</div>
                          <div className="text-xs text-orange-600 mt-1">
                            {obj.status} - {obj.reasons[0] || 'Needs attention'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Median Uptake Lag</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {medianUptakeLag !== null ? `${medianUptakeLag} days` : 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Time from dissemination to first uptake signal
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Recent Activities</h2>
              </div>
              <div className="p-6">
                <div className="text-sm text-slate-600">No recent activities</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Compliance Status</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle size={20} />
                  <span className="text-sm font-medium">All checks passing</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Your Projects</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {projects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{project.title}</h3>
                      <p className="text-sm text-slate-600 mb-2">{project.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Programme: {project.programme_profile}</span>
                        <span>
                          {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
