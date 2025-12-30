import { useMemo } from 'react';
import { useOrganisation } from '../../contexts/OrganisationContext';
import { ComplianceMetadataStore } from '../../lib/complianceMetadata';
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  CheckCircle2,
  Info,
  AlertCircle
} from 'lucide-react';

interface Issue {
  id: string;
  rule_code: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
  module?: string;
}

interface ComplianceWorkQueueProps {
  issues: Issue[];
  lastCheckDate: string | null;
  onOpenIssue: (issue: Issue) => void;
  onMarkAcknowledged?: (issueId: string) => void;
}

export default function ComplianceWorkQueue({
  issues,
  lastCheckDate,
  onOpenIssue,
  onMarkAcknowledged
}: ComplianceWorkQueueProps) {
  const { currentOrganisation } = useOrganisation();

  const settings = useMemo(() => {
    if (!currentOrganisation) {
      return { staleDaysThreshold: 30, defaultPeriod: null };
    }
    return ComplianceMetadataStore.getSettings(currentOrganisation.id);
  }, [currentOrganisation]);

  const queues = useMemo(() => {
    const openIssues = issues.filter(i => i.status === 'open');

    const critical = openIssues.filter(i => i.severity === 'critical');
    const high = openIssues.filter(i => i.severity === 'high');
    const medium = openIssues.filter(i => i.severity === 'medium');
    const low = openIssues.filter(i => i.severity === 'low');

    const byModule: Record<string, Issue[]> = {};
    openIssues.forEach(issue => {
      const module = issue.module || 'other';
      if (!byModule[module]) byModule[module] = [];
      byModule[module].push(issue);
    });

    const checkIsStale = lastCheckDate
      ? ComplianceMetadataStore.isCheckStale(lastCheckDate, settings.staleDaysThreshold)
      : true;

    return {
      critical,
      high,
      medium,
      low,
      byModule,
      checkIsStale
    };
  }, [issues, lastCheckDate, settings]);

  const severityConfig = {
    critical: { color: 'bg-red-50 border-red-200 text-red-900', badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
    high: { color: 'bg-orange-50 border-orange-200 text-orange-900', badge: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    medium: { color: 'bg-yellow-50 border-yellow-200 text-yellow-900', badge: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
    low: { color: 'bg-slate-50 border-slate-200 text-slate-900', badge: 'bg-slate-100 text-slate-700', icon: Info }
  };

  function handleProcessNext() {
    if (queues.critical.length > 0) {
      onOpenIssue(queues.critical[0]);
    } else if (queues.high.length > 0) {
      onOpenIssue(queues.high[0]);
    } else if (queues.medium.length > 0) {
      onOpenIssue(queues.medium[0]);
    } else if (queues.low.length > 0) {
      onOpenIssue(queues.low[0]);
    }
  }

  const hasAnyIssues = queues.critical.length > 0 ||
                       queues.high.length > 0 ||
                       queues.medium.length > 0 ||
                       queues.low.length > 0;

  function renderQueue(
    title: string,
    items: Issue[],
    severity: keyof typeof severityConfig,
    description: string
  ) {
    const config = severityConfig[severity];
    const Icon = config.icon;

    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className={`border-b px-4 py-3 flex items-center justify-between ${config.color}`}>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.badge}`}>
            {items.length}
          </span>
        </div>
        <div className="p-2 text-xs text-slate-600 bg-slate-50 border-b border-slate-100">
          {description}
        </div>
        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-slate-400" />
              No {severity} issues
            </div>
          ) : (
            items.slice(0, 10).map((issue) => (
              <div
                key={issue.id}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onOpenIssue(issue)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-2">
                    <div className="text-sm font-medium text-slate-900 mb-1">
                      {issue.rule_code}
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-2">
                      {issue.description}
                    </div>
                  </div>
                  {issue.module && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium flex-shrink-0">
                      {issue.module}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {ComplianceMetadataStore.formatRelativeTime(issue.created_at)}
                  </div>
                  <div className="flex gap-2">
                    {onMarkAcknowledged && issue.status === 'open' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAcknowledged(issue.id);
                        }}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenIssue(issue);
                      }}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                    >
                      Fix Now
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Compliance Work Queue</h2>
          <p className="text-sm text-slate-600 mt-1">
            Priority issues requiring action
          </p>
        </div>
        {hasAnyIssues && (
          <button
            onClick={handleProcessNext}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Process Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {queues.checkIsStale && lastCheckDate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-amber-900 mb-1">Compliance Check is Stale</div>
              <div className="text-sm text-amber-800">
                Last check was {ComplianceMetadataStore.formatRelativeTime(lastCheckDate)}.
                Consider running a new check to ensure current compliance status.
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasAnyIssues && !queues.checkIsStale && (
        <div className="text-center py-12 bg-green-50 rounded-lg border-2 border-dashed border-green-300">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-900 mb-2">All Clear!</h3>
          <p className="text-green-700">
            No open compliance issues. Your project meets all checked requirements.
          </p>
        </div>
      )}

      {!hasAnyIssues && !lastCheckDate && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <Info className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Compliance Check Run</h3>
          <p className="text-slate-600">
            Run your first compliance check to identify any issues.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderQueue(
          'Critical – Act Immediately',
          queues.critical,
          'critical',
          'Project at risk. Address these issues before submission or reporting.'
        )}

        {renderQueue(
          'High – Schedule This Week',
          queues.high,
          'high',
          'Important issues that should be resolved soon to maintain compliance.'
        )}

        {renderQueue(
          'Medium – Plan & Track',
          queues.medium,
          'medium',
          'Moderate issues that require attention but are not immediately blocking.'
        )}

        {renderQueue(
          'Low – Backlog',
          queues.low,
          'low',
          'Minor issues or recommendations for improvement.'
        )}
      </div>

      {Object.keys(queues.byModule).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Issues by Module</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(queues.byModule).map(([module, moduleIssues]) => (
              <div key={module} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-xs font-medium text-slate-600 mb-1">
                  {module.charAt(0).toUpperCase() + module.slice(1)}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {moduleIssues.length}
                </div>
                <div className="text-xs text-slate-500">
                  {moduleIssues.length === 1 ? 'issue' : 'issues'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
