import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Target,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  Zap,
  ArrowRight,
  Filter,
  Sparkles,
  BookOpen,
  Package
} from 'lucide-react';
import { getModuleRoute } from '../../lib/complianceMetadata';

interface Issue {
  id: string;
  rule_code: string;
  severity: string;
  description: string;
  status: string;
  module?: string;
  affected_entities?: Array<{ type: string; id: string; name: string }>;
  remediation_suggestion?: string;
  evaluation_details?: any;
}

interface RemediationStep {
  id: string;
  action: string;
  module: string;
  route: string;
  priority: 'immediate' | 'soon' | 'next-cycle';
  estimatedMinutes: number;
  icon: React.ReactNode;
}

interface RemediationPlan {
  issueId: string;
  ruleCode: string;
  severity: string;
  description: string;
  module: string;
  steps: RemediationStep[];
  quickFix: string | null;
  context: string;
}

interface AutoRemediationSuggestionsProps {
  issues: Issue[];
}

// Module icons mapping
const moduleIcons: Record<string, React.ReactNode> = {
  objective: <Target className="h-4 w-4" />,
  objectives: <Target className="h-4 w-4" />,
  stakeholder: <Users className="h-4 w-4" />,
  stakeholders: <Users className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  messages: <MessageSquare className="h-4 w-4" />,
  activity: <BarChart3 className="h-4 w-4" />,
  activities: <BarChart3 className="h-4 w-4" />,
  indicator: <BarChart3 className="h-4 w-4" />,
  indicators: <BarChart3 className="h-4 w-4" />,
  evidence: <FileText className="h-4 w-4" />,
  channel: <Zap className="h-4 w-4" />,
  channels: <Zap className="h-4 w-4" />,
  exploitation: <Package className="h-4 w-4" />,
  uptake: <Package className="h-4 w-4" />,
  strategy: <BookOpen className="h-4 w-4" />,
};

function getModuleIcon(module: string): React.ReactNode {
  return moduleIcons[module?.toLowerCase()] || <FileText className="h-4 w-4" />;
}

// Smart remediation suggestion engine
function generateRemediationPlan(issue: Issue): RemediationPlan {
  const module = issue.module || 'other';
  const details = issue.evaluation_details || {};
  const steps: RemediationStep[] = [];
  let quickFix: string | null = null;
  let context = '';

  const found = details.found ?? 0;
  const required = details.required ?? 0;
  const deficit = typeof required === 'number' ? Math.max(0, required - found) : 0;

  // Generate context-aware suggestions based on module and evaluation details
  switch (module.toLowerCase()) {
    case 'objective':
    case 'objectives': {
      context = found === 0
        ? 'Your project has no CDE objectives defined. EU programmes require documented objectives for Communication, Dissemination, and Exploitation.'
        : `You have ${found} objective(s) but need at least ${required}. Consider adding objectives for any missing CDE domains.`;

      if (found === 0) {
        quickFix = 'Create at least one objective for each CDE domain (Communication, Dissemination, Exploitation)';
      }

      steps.push({
        id: `${issue.id}-s1`,
        action: deficit > 0
          ? `Create ${deficit} more CDE objective(s) to meet the minimum requirement`
          : 'Review existing objectives for completeness and measurable KPIs',
        module: 'objectives',
        route: getModuleRoute('objectives'),
        priority: issue.severity === 'critical' ? 'immediate' : 'soon',
        estimatedMinutes: deficit * 5,
        icon: <Target className="h-4 w-4" />
      });

      if (details.missingDomains && Array.isArray(details.missingDomains)) {
        details.missingDomains.forEach((domain: string) => {
          steps.push({
            id: `${issue.id}-domain-${domain}`,
            action: `Add an objective for the "${domain}" domain`,
            module: 'objectives',
            route: getModuleRoute('objectives'),
            priority: 'soon',
            estimatedMinutes: 5,
            icon: <Target className="h-4 w-4" />
          });
        });
      }

      steps.push({
        id: `${issue.id}-kpi`,
        action: 'Ensure each objective has at least one measurable KPI/indicator linked',
        module: 'indicators',
        route: getModuleRoute('indicators'),
        priority: 'next-cycle',
        estimatedMinutes: 10,
        icon: <BarChart3 className="h-4 w-4" />
      });
      break;
    }

    case 'stakeholder':
    case 'stakeholders': {
      context = found === 0
        ? 'No stakeholder groups are defined. EU projects must identify and engage key stakeholder groups.'
        : `${found} stakeholder group(s) found, but ${required} are recommended for comprehensive coverage.`;

      quickFix = found === 0
        ? 'Create stakeholder groups for: policy makers, industry, academia, civil society, and end users'
        : null;

      steps.push({
        id: `${issue.id}-s1`,
        action: deficit > 0
          ? `Create ${deficit} more stakeholder group(s)`
          : 'Review stakeholder profiles for completeness',
        module: 'stakeholders',
        route: getModuleRoute('stakeholders'),
        priority: 'immediate',
        estimatedMinutes: deficit * 3,
        icon: <Users className="h-4 w-4" />
      });

      steps.push({
        id: `${issue.id}-link`,
        action: 'Link stakeholder groups to relevant activities and messages',
        module: 'activities',
        route: getModuleRoute('activities'),
        priority: 'soon',
        estimatedMinutes: 15,
        icon: <BarChart3 className="h-4 w-4" />
      });
      break;
    }

    case 'message':
    case 'messages': {
      context = `${found} message(s) in library. Clear, audience-specific messages are essential for effective communication.`;

      steps.push({
        id: `${issue.id}-s1`,
        action: deficit > 0
          ? `Create ${deficit} more message(s) to cover key stakeholder groups`
          : 'Review messages for audience specificity and clarity',
        module: 'messages',
        route: getModuleRoute('messages'),
        priority: 'soon',
        estimatedMinutes: deficit * 8,
        icon: <MessageSquare className="h-4 w-4" />
      });

      steps.push({
        id: `${issue.id}-link`,
        action: 'Link messages to target stakeholder groups and objectives',
        module: 'messages',
        route: getModuleRoute('messages'),
        priority: 'next-cycle',
        estimatedMinutes: 10,
        icon: <Target className="h-4 w-4" />
      });
      break;
    }

    case 'activity':
    case 'activities': {
      context = found === 0
        ? 'No CDE activities planned. Activities are the core execution vehicle for your CDE strategy.'
        : `${found} activit${found === 1 ? 'y' : 'ies'} found. Ensure each has a channel, assigned effort, and linked evidence.`;

      quickFix = found === 0 ? 'Plan at least one activity per quarter for each active objective' : null;

      steps.push({
        id: `${issue.id}-s1`,
        action: deficit > 0
          ? `Plan ${deficit} more CDE activit${deficit === 1 ? 'y' : 'ies'}`
          : 'Review activities for completeness (channel, effort, evidence)',
        module: 'activities',
        route: getModuleRoute('activities'),
        priority: 'immediate',
        estimatedMinutes: deficit * 10,
        icon: <BarChart3 className="h-4 w-4" />
      });
      break;
    }

    case 'indicator':
    case 'indicators':
    case 'monitoring': {
      context = `${found} indicator(s) tracked. M&E indicators provide auditable evidence of CDE impact.`;

      steps.push({
        id: `${issue.id}-s1`,
        action: deficit > 0
          ? `Define ${deficit} more indicator(s) with measurable targets`
          : 'Review indicators — ensure each has a target value and measurement method',
        module: 'indicators',
        route: getModuleRoute('indicators'),
        priority: 'soon',
        estimatedMinutes: deficit * 5,
        icon: <BarChart3 className="h-4 w-4" />
      });

      steps.push({
        id: `${issue.id}-evidence`,
        action: 'Upload evidence for each indicator (screenshots, analytics, reports)',
        module: 'evidence',
        route: getModuleRoute('evidence'),
        priority: 'next-cycle',
        estimatedMinutes: 20,
        icon: <FileText className="h-4 w-4" />
      });
      break;
    }

    case 'evidence': {
      context = `${found} evidence item(s) linked. Evidence is critical for EU audit compliance.`;

      steps.push({
        id: `${issue.id}-s1`,
        action: 'Upload evidence files (screenshots, analytics, meeting notes) and link to activities',
        module: 'evidence',
        route: getModuleRoute('evidence'),
        priority: 'immediate',
        estimatedMinutes: 15,
        icon: <FileText className="h-4 w-4" />
      });
      break;
    }

    case 'channel':
    case 'channels': {
      context = `${found} channel(s) configured. Channels define how you reach stakeholders.`;

      steps.push({
        id: `${issue.id}-s1`,
        action: deficit > 0
          ? `Add ${deficit} more channel(s) to your catalogue`
          : 'Review channels for cost metadata and stakeholder reach',
        module: 'channels',
        route: getModuleRoute('channels'),
        priority: 'soon',
        estimatedMinutes: deficit * 3,
        icon: <Zap className="h-4 w-4" />
      });
      break;
    }

    case 'exploitation':
    case 'uptake': {
      context = `${found} exploitation/uptake item(s) found. EU expects a clear exploitation strategy for project results.`;

      quickFix = found === 0
        ? 'Use the Exploitation Wizard to quickly set up your exploitation strategy'
        : null;

      steps.push({
        id: `${issue.id}-s1`,
        action: found === 0
          ? 'Create exploitation opportunities for key project results'
          : 'Review exploitation pipeline — ensure results are moving through stages',
        module: 'exploitation',
        route: getModuleRoute('exploitation'),
        priority: 'immediate',
        estimatedMinutes: 15,
        icon: <Package className="h-4 w-4" />
      });
      break;
    }

    case 'strategy': {
      context = 'Your CDE strategy anchors all communication, dissemination, and exploitation activities.';

      steps.push({
        id: `${issue.id}-s1`,
        action: 'Define or update your CDE strategy with clear goals and timeline',
        module: 'strategy',
        route: getModuleRoute('strategy'),
        priority: 'immediate',
        estimatedMinutes: 20,
        icon: <BookOpen className="h-4 w-4" />
      });
      break;
    }

    default: {
      context = issue.remediation_suggestion || 'Review the issue details and take corrective action.';

      steps.push({
        id: `${issue.id}-s1`,
        action: issue.remediation_suggestion || `Address this ${issue.severity} issue in the ${module} module`,
        module,
        route: getModuleRoute(module),
        priority: issue.severity === 'critical' ? 'immediate' : 'soon',
        estimatedMinutes: 10,
        icon: getModuleIcon(module)
      });
    }
  }

  return {
    issueId: issue.id,
    ruleCode: issue.rule_code,
    severity: issue.severity,
    description: issue.description,
    module,
    steps,
    quickFix,
    context
  };
}

export default function AutoRemediationSuggestions({ issues }: AutoRemediationSuggestionsProps) {
  const navigate = useNavigate();
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  // Only open issues get suggestions
  const openIssues = issues.filter(i => i.status !== 'resolved');

  // Generate remediation plans for all open issues
  const plans = useMemo(() =>
    openIssues.map(issue => generateRemediationPlan(issue)),
    [openIssues]
  );

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      if (moduleFilter !== 'all' && plan.module.toLowerCase() !== moduleFilter.toLowerCase()) return false;
      if (priorityFilter === 'immediate') return plan.steps.some(s => s.priority === 'immediate');
      if (priorityFilter === 'soon') return plan.steps.some(s => s.priority === 'soon');
      return true;
    });
  }, [plans, priorityFilter, moduleFilter]);

  // Aggregate stats
  const totalEstimatedTime = useMemo(() => {
    return filteredPlans.reduce((acc, plan) =>
      acc + plan.steps.reduce((stepAcc, step) => stepAcc + step.estimatedMinutes, 0),
      0
    );
  }, [filteredPlans]);

  const immediateCount = plans.filter(p => p.steps.some(s => s.priority === 'immediate')).length;
  const quickFixCount = plans.filter(p => p.quickFix).length;

  const moduleOptions = useMemo(() => {
    const modules = new Set(plans.map(p => p.module).filter(Boolean));
    return Array.from(modules).sort();
  }, [plans]);

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const priorityColors: Record<string, string> = {
    immediate: 'bg-red-50 text-red-700 border-red-200',
    soon: 'bg-amber-50 text-amber-700 border-amber-200',
    'next-cycle': 'bg-slate-50 text-slate-600 border-slate-200'
  };

  if (openIssues.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900 mb-1">All Clear</h3>
        <p className="text-sm text-slate-600">No open issues require remediation. Great compliance posture!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Smart Remediation Plan</h3>
            <p className="text-sm text-slate-600 mt-0.5">
              AI-generated action plan based on your compliance check results
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="px-3 py-1.5 bg-white rounded-lg border border-blue-200 text-sm">
                <span className="font-bold text-blue-700">{filteredPlans.length}</span>
                <span className="text-slate-600 ml-1">issues to address</span>
              </div>
              {immediateCount > 0 && (
                <div className="px-3 py-1.5 bg-white rounded-lg border border-red-200 text-sm">
                  <span className="font-bold text-red-700">{immediateCount}</span>
                  <span className="text-slate-600 ml-1">need immediate action</span>
                </div>
              )}
              {quickFixCount > 0 && (
                <div className="px-3 py-1.5 bg-white rounded-lg border border-green-200 text-sm">
                  <span className="font-bold text-green-700">{quickFixCount}</span>
                  <span className="text-slate-600 ml-1">quick fixes available</span>
                </div>
              )}
              <div className="px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-sm">
                <span className="font-bold text-slate-700">~{totalEstimatedTime}</span>
                <span className="text-slate-600 ml-1">min estimated effort</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Filter className="h-4 w-4" />
          Filter:
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="immediate">Immediate</option>
          <option value="soon">Soon</option>
        </select>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">All Modules</option>
          {moduleOptions.map(m => (
            <option key={m} value={m}>
              {(m || '').charAt(0).toUpperCase() + (m || '').slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Remediation Plans */}
      <div className="space-y-3">
        {filteredPlans.map(plan => {
          const isExpanded = expandedIssue === plan.issueId;

          return (
            <div key={plan.issueId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Plan Header */}
              <button
                onClick={() => setExpandedIssue(isExpanded ? null : plan.issueId)}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-medium text-slate-900">{plan.ruleCode}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${severityColors[plan.severity]}`}>
                        {plan.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                        {plan.module}
                      </span>
                      {plan.quickFix && (
                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Quick fix
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-700">{plan.description}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {plan.steps.length} step{plan.steps.length !== 1 ? 's' : ''} &middot;
                      ~{plan.steps.reduce((a, s) => a + s.estimatedMinutes, 0)} min
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    : <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  }
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-200">
                  {/* Context */}
                  <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">{plan.context}</div>
                    </div>
                  </div>

                  {/* Quick Fix */}
                  {plan.quickFix && (
                    <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                      <div className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-green-800 mb-0.5">Quick Fix</div>
                          <div className="text-sm text-green-700">{plan.quickFix}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  <div className="p-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                      Action Steps
                    </div>
                    {plan.steps.map((step, idx) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-800">{step.action}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${priorityColors[step.priority]}`}>
                              {step.priority === 'next-cycle' ? 'Next cycle' : step.priority}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ~{step.estimatedMinutes} min
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(step.route)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                        >
                          Go
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Navigate to Module */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <button
                      onClick={() => navigate(getModuleRoute(plan.module))}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {getModuleIcon(plan.module)}
                      Open {plan.module.charAt(0).toUpperCase() + plan.module.slice(1)} module
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
