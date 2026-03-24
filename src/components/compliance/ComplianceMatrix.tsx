import { useState, useMemo } from 'react';
import {
  Grid3X3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Minus,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getModuleRoute } from '../../lib/complianceMetadata';

interface Issue {
  id: string;
  rule_code: string;
  severity: string;
  description: string;
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

interface ReportingPeriod {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

interface ScoreData {
  score: number;
  passed: number;
  failed: number;
  total: number;
  byModule: Record<string, { passed: number; failed: number; total: number }>;
}

interface ComplianceMatrixProps {
  issues: Issue[];
  history: HistoryEntry[];
  periods: ReportingPeriod[];
  scoreData: ScoreData;
}

// All tracked modules
const MODULE_ORDER = [
  'objectives',
  'stakeholders',
  'messages',
  'activities',
  'channels',
  'indicators',
  'evidence',
  'exploitation',
  'strategy'
];

const MODULE_LABELS: Record<string, string> = {
  objectives: 'Objectives',
  stakeholders: 'Stakeholders',
  messages: 'Messages',
  activities: 'Activities',
  channels: 'Channels',
  indicators: 'Indicators',
  evidence: 'Evidence',
  exploitation: 'Exploitation',
  strategy: 'Strategy'
};

type CellStatus = 'pass' | 'warning' | 'fail' | 'no-data';

interface MatrixCell {
  module: string;
  period: string;
  status: CellStatus;
  issueCount: number;
  criticalCount: number;
  highCount: number;
  passed: number;
  total: number;
  score: number;
}

export default function ComplianceMatrix({
  issues,
  history,
  periods,
  scoreData
}: ComplianceMatrixProps) {
  const navigate = useNavigate();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // For current period, build data from live issues; for past periods we use history summary
  const todayStr = new Date().toISOString().split('T')[0];
  const currentPeriod = periods.find(p => p.start_date <= todayStr && p.end_date >= todayStr);

  // Build the matrix data
  const matrixData = useMemo(() => {
    const cells: MatrixCell[] = [];

    const displayPeriods = periods.length > 0
      ? periods
      : [{ id: 'current', label: 'Current', start_date: '', end_date: '' }];

    displayPeriods.forEach(period => {
      const isCurrentPeriod = period.id === currentPeriod?.id || period.id === 'current';

      MODULE_ORDER.forEach(module => {
        if (isCurrentPeriod) {
          // Use live issue data for current period
          const moduleIssues = issues.filter(i =>
            (i.module || '').toLowerCase() === module && i.status !== 'resolved'
          );
          const moduleData = scoreData.byModule[module];
          const total = moduleData?.total || 0;
          const passed = moduleData?.passed || 0;
          const failed = moduleData?.failed || moduleIssues.length;
          const criticalCount = moduleIssues.filter(i => i.severity === 'critical').length;
          const highCount = moduleIssues.filter(i => i.severity === 'high').length;

          let status: CellStatus = 'no-data';
          if (total > 0) {
            if (failed === 0) status = 'pass';
            else if (criticalCount > 0 || highCount > 0) status = 'fail';
            else status = 'warning';
          }

          const score = total > 0 ? Math.round((passed / total) * 100) : 0;

          cells.push({
            module,
            period: period.id,
            status,
            issueCount: moduleIssues.length,
            criticalCount,
            highCount,
            passed,
            total,
            score
          });
        } else {
          // For non-current periods, use estimated data
          // In a real implementation, you'd store per-module per-period data
          // For now, show no-data for past/future periods without check data
          cells.push({
            module,
            period: period.id,
            status: 'no-data',
            issueCount: 0,
            criticalCount: 0,
            highCount: 0,
            passed: 0,
            total: 0,
            score: 0
          });
        }
      });
    });

    return cells;
  }, [issues, periods, scoreData, currentPeriod]);

  // Module summary for the current period
  const moduleSummaries = useMemo(() => {
    return MODULE_ORDER.map(module => {
      const moduleIssues = issues.filter(i =>
        (i.module || '').toLowerCase() === module
      );
      const openIssues = moduleIssues.filter(i => i.status !== 'resolved');
      const resolvedIssues = moduleIssues.filter(i => i.status === 'resolved');
      const criticalCount = openIssues.filter(i => i.severity === 'critical').length;
      const highCount = openIssues.filter(i => i.severity === 'high').length;
      const moduleData = scoreData.byModule[module];

      return {
        module,
        label: MODULE_LABELS[module] || module,
        openCount: openIssues.length,
        resolvedCount: resolvedIssues.length,
        criticalCount,
        highCount,
        passed: moduleData?.passed || 0,
        total: moduleData?.total || 0,
        score: moduleData?.total ? Math.round((moduleData.passed / moduleData.total) * 100) : 0
      };
    });
  }, [issues, scoreData]);

  // Overall module health color
  function getModuleHealthColor(summary: typeof moduleSummaries[0]): string {
    if (summary.total === 0) return 'text-slate-400';
    if (summary.criticalCount > 0) return 'text-red-600';
    if (summary.highCount > 0) return 'text-orange-600';
    if (summary.openCount > 0) return 'text-amber-600';
    return 'text-green-600';
  }

  function getCellBg(cell: MatrixCell): string {
    switch (cell.status) {
      case 'pass': return 'bg-green-100 hover:bg-green-200';
      case 'warning': return 'bg-amber-100 hover:bg-amber-200';
      case 'fail': return 'bg-red-100 hover:bg-red-200';
      default: return 'bg-slate-50 hover:bg-slate-100';
    }
  }

  function getCellIcon(cell: MatrixCell) {
    switch (cell.status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  }

  const displayPeriods = periods.length > 0
    ? periods
    : [{ id: 'current', label: 'Current', start_date: '', end_date: '' }];

  // Heat map score bar for each module
  function ScoreBar({ score }: { score: number }) {
    const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : score > 0 ? 'bg-red-500' : 'bg-slate-200';
    return (
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matrix Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Grid3X3 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Cross-Module Compliance Matrix</h3>
            <p className="text-sm text-slate-600">Visual overview of compliance status across all modules and reporting periods</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300 flex items-center justify-center">
              <CheckCircle className="h-3 w-3 text-green-600" />
            </div>
            Passing
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300 flex items-center justify-center">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
            </div>
            Warnings
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-300 flex items-center justify-center">
              <XCircle className="h-3 w-3 text-red-600" />
            </div>
            Failing
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Minus className="h-3 w-3 text-slate-400" />
            </div>
            No data
          </div>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left p-3 text-sm font-semibold text-slate-700 bg-slate-50 min-w-[160px]">
                Module
              </th>
              <th className="text-center p-3 text-sm font-semibold text-slate-700 bg-slate-50 w-20">
                Score
              </th>
              {displayPeriods.map(period => (
                <th
                  key={period.id}
                  className={`text-center p-3 text-sm font-semibold min-w-[120px] ${
                    period.id === currentPeriod?.id || period.id === 'current'
                      ? 'bg-blue-50 text-blue-800 border-b-2 border-blue-300'
                      : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>{period.label}</div>
                  {period.id === currentPeriod?.id && (
                    <div className="text-[10px] font-normal text-blue-600 mt-0.5">Active</div>
                  )}
                </th>
              ))}
              <th className="text-center p-3 text-sm font-semibold text-slate-700 bg-slate-50 w-20">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {moduleSummaries.map(summary => {
              const isExpanded = expandedModule === summary.module;
              const moduleIssues = issues.filter(i =>
                (i.module || '').toLowerCase() === summary.module && i.status !== 'resolved'
              );

              return (
                <>
                  <tr
                    key={summary.module}
                    className={`border-b border-slate-100 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setExpandedModule(isExpanded ? null : summary.module)}
                  >
                    {/* Module Name */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-slate-400" />
                          : <ChevronDown className="h-4 w-4 text-slate-400" />
                        }
                        <span className={`text-sm font-medium ${getModuleHealthColor(summary)}`}>
                          {summary.label}
                        </span>
                        {summary.openCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                            {summary.openCount}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Score */}
                    <td className="p-3">
                      <div className="text-center">
                        {summary.total > 0 ? (
                          <>
                            <div className={`text-sm font-bold ${
                              summary.score >= 80 ? 'text-green-700'
                                : summary.score >= 50 ? 'text-amber-700'
                                  : 'text-red-700'
                            }`}>
                              {summary.score}%
                            </div>
                            <ScoreBar score={summary.score} />
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">&mdash;</span>
                        )}
                      </div>
                    </td>

                    {/* Period Cells */}
                    {displayPeriods.map(period => {
                      const cell = matrixData.find(c =>
                        c.module === summary.module && c.period === period.id
                      );
                      if (!cell) return <td key={period.id} className="p-3 text-center"><Minus className="h-4 w-4 text-slate-300 mx-auto" /></td>;

                      return (
                        <td
                          key={period.id}
                          className={`p-3 text-center ${
                            period.id === currentPeriod?.id || period.id === 'current'
                              ? 'border-x border-blue-100'
                              : ''
                          }`}
                          onMouseEnter={() => setShowTooltip(`${summary.module}-${period.id}`)}
                          onMouseLeave={() => setShowTooltip(null)}
                        >
                          <div className="relative inline-flex flex-col items-center">
                            <div className={`p-2 rounded-lg ${getCellBg(cell)} transition-colors`}>
                              {getCellIcon(cell)}
                            </div>
                            {cell.issueCount > 0 && (
                              <div className="text-[10px] text-slate-600 mt-0.5">
                                {cell.issueCount} issue{cell.issueCount !== 1 ? 's' : ''}
                              </div>
                            )}
                            {cell.status === 'no-data' && (
                              <div className="text-[10px] text-slate-400 mt-0.5">No data</div>
                            )}

                            {/* Tooltip */}
                            {showTooltip === `${summary.module}-${period.id}` && cell.status !== 'no-data' && (
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-lg">
                                <div className="font-medium">{summary.label} — {period.label}</div>
                                <div className="mt-1">
                                  {cell.passed}/{cell.total} rules passing ({cell.score}%)
                                </div>
                                {cell.criticalCount > 0 && (
                                  <div className="text-red-300">{cell.criticalCount} critical</div>
                                )}
                                {cell.highCount > 0 && (
                                  <div className="text-orange-300">{cell.highCount} high</div>
                                )}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 -mt-1"></div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Trend */}
                    <td className="p-3 text-center">
                      {summary.total > 0 ? (
                        summary.openCount === 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 mx-auto" />
                        ) : summary.criticalCount > 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600 mx-auto" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-amber-600 mx-auto" />
                        )
                      ) : (
                        <Minus className="h-4 w-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>

                  {/* Expanded Module Issues */}
                  {isExpanded && (
                    <tr key={`${summary.module}-expanded`}>
                      <td colSpan={displayPeriods.length + 3} className="bg-slate-50 p-0">
                        <div className="p-4 space-y-2">
                          {moduleIssues.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-green-700 p-3 bg-green-50 rounded-lg">
                              <CheckCircle className="h-4 w-4" />
                              All rules passing for {summary.label}
                            </div>
                          ) : (
                            <>
                              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                Open Issues in {summary.label}
                              </div>
                              {moduleIssues.slice(0, 5).map(issue => (
                                <div key={issue.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 text-sm">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    issue.severity === 'critical' ? 'bg-red-100 text-red-700'
                                      : issue.severity === 'high' ? 'bg-orange-100 text-orange-700'
                                        : issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {issue.severity}
                                  </span>
                                  <span className="font-mono text-xs text-slate-500">{issue.rule_code}</span>
                                  <span className="text-slate-700 flex-1 truncate">{issue.description}</span>
                                </div>
                              ))}
                              {moduleIssues.length > 5 && (
                                <div className="text-xs text-slate-500 pl-2">
                                  +{moduleIssues.length - 5} more issues
                                </div>
                              )}
                            </>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(getModuleRoute(summary.module));
                            }}
                            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
                          >
                            Open {summary.label} module
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(() => {
          const passingModules = moduleSummaries.filter(m => m.total > 0 && m.openCount === 0).length;
          const warningModules = moduleSummaries.filter(m => m.openCount > 0 && m.criticalCount === 0 && m.highCount === 0).length;
          const failingModules = moduleSummaries.filter(m => m.criticalCount > 0 || m.highCount > 0).length;
          const uncheckedModules = moduleSummaries.filter(m => m.total === 0).length;

          return (
            <>
              <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{passingModules}</div>
                <div className="text-xs text-green-600 mt-1">Modules passing</div>
              </div>
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{warningModules}</div>
                <div className="text-xs text-amber-600 mt-1">With warnings</div>
              </div>
              <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
                <div className="text-2xl font-bold text-red-700">{failingModules}</div>
                <div className="text-xs text-red-600 mt-1">Modules failing</div>
              </div>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-center">
                <div className="text-2xl font-bold text-slate-500">{uncheckedModules}</div>
                <div className="text-xs text-slate-500 mt-1">Not checked</div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Guidance */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-700 mb-1">How to read this matrix</p>
          <p>
            Each row represents a CDE module, each column a reporting period.
            Green cells mean all rules pass; amber means minor issues; red indicates critical or high-severity failures.
            Click any row to see the specific issues. Run compliance checks regularly to fill in data across periods.
          </p>
        </div>
      </div>
    </div>
  );
}
