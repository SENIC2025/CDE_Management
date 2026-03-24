import { Calendar, Clock, DollarSign, ChevronDown, Target, Users, Radio, AlertTriangle, CheckCircle, Play, Pause, XCircle, FileText } from 'lucide-react';

export interface Activity {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  domain: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget_estimate: number | null;
  effort_hours: number | null;
  expected_outputs: string | null;
  completeness_score: number | null;
  linked_objective_ids?: string[];
  channel_ids?: string[];
  stakeholder_group_ids?: string[];
  created_at: string;
  updated_at: string;
}

interface ActivityCardProps {
  activity: Activity;
  objectiveTitles: Record<string, string>;
  channelNames: Record<string, string>;
  stakeholderNames: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: string) => void;
}

const domainConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Communication: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  Dissemination: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Exploitation: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
};

const statusConfig: Record<string, { icon: typeof Play; color: string; bg: string; label: string }> = {
  planned: { icon: Calendar, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Planned' },
  active: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Active' },
  completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Cancelled' },
  on_hold: { icon: Pause, color: 'text-amber-600', bg: 'bg-amber-100', label: 'On Hold' },
};

export default function ActivityCard({
  activity,
  objectiveTitles,
  channelNames,
  stakeholderNames,
  onEdit,
  onDelete,
  onStatusChange,
}: ActivityCardProps) {
  const domain = domainConfig[activity.domain] || domainConfig.Communication;
  const status = statusConfig[activity.status] || statusConfig.planned;
  const StatusIcon = status.icon;
  const displayTitle = activity.title;

  // Timeline calculations
  const now = new Date();
  const startDate = activity.start_date ? new Date(activity.start_date) : null;
  const endDate = activity.end_date ? new Date(activity.end_date) : null;
  const isOverdue = endDate && endDate < now && activity.status !== 'completed' && activity.status !== 'cancelled';
  const isUpcoming = startDate && startDate > now && (startDate.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000;
  const isOngoing = startDate && endDate && startDate <= now && endDate >= now;

  // Timeline progress bar
  let timelineProgress = 0;
  if (activity.status === 'completed') {
    timelineProgress = 100;
  } else if (startDate && endDate) {
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    if (total > 0) timelineProgress = Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  // Linked entities
  const linkedObjectives = (activity.linked_objective_ids || []).filter(id => objectiveTitles[id]);
  const linkedChannels = (activity.channel_ids || []).filter(id => channelNames[id]);
  const linkedStakeholders = (activity.stakeholder_group_ids || []).filter(id => stakeholderNames[id]);

  // Completeness indicator
  const completeness = activity.completeness_score || 0;

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatCurrency(amount: number | null) {
    if (!amount) return null;
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  }

  return (
    <div className={`bg-white rounded-lg border ${domain.border} hover:shadow-md transition-shadow`}>
      <div className="p-5">
        {/* Top Row: Title, Domain, Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 truncate"
                onClick={onEdit}
              >
                {displayTitle}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${domain.bg} ${domain.text}`}>
                {activity.domain}
              </span>
              {isOverdue && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              )}
              {isUpcoming && !isOngoing && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                  Starting Soon
                </span>
              )}
            </div>
            {activity.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
            )}
          </div>

          {/* Quick Status Change */}
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <div className="relative">
              <select
                value={activity.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className={`appearance-none text-xs font-medium pl-7 pr-6 py-1.5 rounded-full border-0 cursor-pointer ${status.bg} ${status.color}`}
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <StatusIcon className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${status.color}`} />
              <ChevronDown className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 ${status.color}`} />
            </div>
          </div>
        </div>

        {/* Timeline Bar */}
        {startDate && endDate && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{formatDate(activity.start_date)}</span>
              <span>{formatDate(activity.end_date)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverdue ? 'bg-red-500' : activity.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${timelineProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Metrics Row: Budget, Effort, Expected Outputs, Completeness */}
        <div className="flex items-center gap-4 flex-wrap mb-3">
          {activity.budget_estimate != null && activity.budget_estimate > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-gray-700 font-medium">{formatCurrency(activity.budget_estimate)}</span>
            </div>
          )}
          {activity.effort_hours != null && activity.effort_hours > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700 font-medium">{activity.effort_hours}h</span>
            </div>
          )}
          {(!startDate || !endDate) && (activity.start_date || activity.end_date) && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(activity.start_date)} — {formatDate(activity.end_date)}</span>
            </div>
          )}
          {completeness > 0 && (
            <div className="flex items-center gap-1.5 text-sm" title={`Completeness: ${completeness}%`}>
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${completeness >= 75 ? 'bg-emerald-500' : completeness >= 40 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                  style={{ width: `${Math.min(100, completeness)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{completeness}%</span>
            </div>
          )}
        </div>

        {/* Expected Outputs */}
        {activity.expected_outputs && (
          <div className="mb-3 bg-gray-50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expected Outputs</span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">{activity.expected_outputs}</p>
          </div>
        )}

        {/* Linked Entities */}
        {(linkedObjectives.length > 0 || linkedChannels.length > 0 || linkedStakeholders.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {linkedObjectives.map(id => (
              <span key={id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700">
                <Target className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{objectiveTitles[id]}</span>
              </span>
            ))}
            {linkedChannels.map(id => (
              <span key={id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-cyan-50 text-cyan-700">
                <Radio className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{channelNames[id]}</span>
              </span>
            ))}
            {linkedStakeholders.map(id => (
              <span key={id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                <Users className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{stakeholderNames[id]}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 rounded-b-lg flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Updated {new Date(activity.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
        </div>
      </div>
    </div>
  );
}
