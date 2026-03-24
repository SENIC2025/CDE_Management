import { useMemo } from 'react';
import { ComplianceMetadataStore } from '../../lib/complianceMetadata';
import type { ComplianceRunSnapshot } from '../../lib/complianceMetadata';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  BarChart3,
  Clock
} from 'lucide-react';

interface Issue {
  id: string;
  severity: string;
  status: string;
  module?: string;
}

interface HistoryEntry {
  checkId: string;
  checkedAt: string;
  status: string;
  issuesCount: number;
  score: number;
}

interface ComplianceHealthDashboardProps {
  issues: Issue[];
  score: number;
  passed: number;
  failed: number;
  total: number;
  bySeverity: Record<string, { passed: number; failed: number }>;
  byModule: Record<string, { passed: number; failed: number; total: number }>;
  lastCheckDate: string | null;
  history: HistoryEntry[];
}

export default function ComplianceHealthDashboard({
  issues,
  score,
  passed,
  failed,
  total,
  bySeverity,
  byModule,
  lastCheckDate,
  history
}: ComplianceHealthDashboardProps) {
  const openIssues = issues.filter(i => i.status === 'open');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');

  // Calculate trend from history
  const trend = useMemo(() => {
    if (history.length < 2) return { direction: 'stable' as const, delta: 0 };
    const current = history[0].score;
    const previous = history[1].score;
    const delta = current - previous;
    return {
      direction: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'stable' as const,
      delta
    };
  }, [history]);

  // Resolution velocity
  const resolutionRate = useMemo(() => {
    if (issues.length === 0) return 0;
    return Math.round((resolvedIssues.length / issues.length) * 100);
  }, [issues, resolvedIssues]);

  // Score color
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = score >= 80 ? 'bg-green-50 border-green-200' : score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const scoreRingColor = score >= 80 ? 'stroke-green-500' : score >= 50 ? 'stroke-amber-500' : 'stroke-red-500';

  // Stale check warning
  const isStale = lastCheckDate
    ? ComplianceMetadataStore.isCheckStale(lastCheckDate, 30)
    : false;

  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const severityColors: Record<string, { bar: string; text: string }> = {
    critical: { bar: 'bg-red-500', text: 'text-red-700' },
    high: { bar: 'bg-orange-500', text: 'text-orange-700' },
    medium: { bar: 'bg-yellow-500', text: 'text-yellow-700' },
    low: { bar: 'bg-slate-400', text: 'text-slate-600' }
  };

  // Circumference for SVG ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Score Ring */}
        <div className={`rounded-lg border p-5 flex items-center gap-4 ${scoreBg}`}>
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="8"
              />
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                className={scoreRingColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-600 mb-1">Compliance Score</div>
            <div className="flex items-center gap-1.5">
              {trend.direction === 'up' && (
                <TrendingUp className="h-4 w-4 text-green-600" />
              )}
              {trend.direction === 'down' && (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              {trend.direction === 'stable' && (
                <Minus className="h-4 w-4 text-slate-400" />
              )}
              <span className={`text-sm font-medium ${
                trend.direction === 'up' ? 'text-green-600' :
                trend.direction === 'down' ? 'text-red-600' :
                'text-slate-500'
              }`}>
                {trend.direction === 'stable'
                  ? 'Stable'
                  : `${trend.delta > 0 ? '+' : ''}${trend.delta}%`
                }
              </span>
            </div>
            {isStale && (
              <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                <Clock className="h-3 w-3" />
                Check is stale
              </div>
            )}
          </div>
        </div>

        {/* Rules Passed */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-600">Rules Passed</div>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {passed}<span className="text-base font-normal text-slate-400">/{total}</span>
          </div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? (passed / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Open Issues */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-600">Open Issues</div>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{openIssues.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {openIssues.filter(i => i.severity === 'critical').length} critical,{' '}
            {openIssues.filter(i => i.severity === 'high').length} high
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-600">Resolution Rate</div>
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{resolutionRate}%</div>
          <div className="text-xs text-slate-500 mt-1">
            {resolvedIssues.length} of {issues.length} resolved
          </div>
        </div>
      </div>

      {/* Severity Breakdown + Module Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Severity Breakdown */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-600" />
            Issues by Severity
          </h3>
          <div className="space-y-3">
            {severityOrder.map(severity => {
              const data = bySeverity[severity];
              if (!data) return null;
              const total = data.passed + data.failed;
              const colors = severityColors[severity];

              return (
                <div key={severity}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium capitalize ${colors.text}`}>
                      {severity}
                    </span>
                    <span className="text-xs text-slate-500">
                      {data.failed > 0
                        ? `${data.failed} failing`
                        : 'All passing'
                      }
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        data.failed > 0 ? colors.bar : 'bg-green-400'
                      }`}
                      style={{ width: `${total > 0 ? (data.failed / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {Object.keys(bySeverity).length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4">
                Run a compliance check to see severity breakdown
              </div>
            )}
          </div>
        </div>

        {/* Module Health */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-600" />
            Module Health
          </h3>
          <div className="space-y-3">
            {Object.entries(byModule)
              .sort(([, a], [, b]) => (a.passed / a.total) - (b.passed / b.total))
              .map(([module, data]) => {
                const moduleScore = Math.round((data.passed / data.total) * 100);
                const isHealthy = moduleScore >= 80;
                const isWarning = moduleScore >= 50 && moduleScore < 80;

                return (
                  <div key={module}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {module}
                      </span>
                      <span className={`text-xs font-medium ${
                        isHealthy ? 'text-green-600' :
                        isWarning ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {moduleScore}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHealthy ? 'bg-green-500' :
                          isWarning ? 'bg-amber-400' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${moduleScore}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {Object.keys(byModule).length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4">
                Run a compliance check to see module health
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Trend */}
      {history.length > 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-600" />
            Compliance History
          </h3>
          <div className="flex items-end gap-2 h-24">
            {history.slice(0, 10).reverse().map((entry, idx) => {
              const barHeight = Math.max(entry.score, 5);
              const barColor = entry.score >= 80 ? 'bg-green-500' : entry.score >= 50 ? 'bg-amber-400' : 'bg-red-500';

              return (
                <div
                  key={entry.checkId}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div
                    className={`w-full rounded-t ${barColor} transition-all duration-300 hover:opacity-80 cursor-default`}
                    style={{ height: `${barHeight}%` }}
                    title={`${entry.score}% — ${new Date(entry.checkedAt).toLocaleDateString()}`}
                  />
                  <div className="text-[10px] text-slate-400 leading-none">
                    {new Date(entry.checkedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    {entry.score}% — {entry.issuesCount} issues
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
