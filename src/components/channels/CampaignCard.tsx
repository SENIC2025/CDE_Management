import { Calendar, Edit, Trash2, AlertTriangle, ChevronDown, DollarSign, User, Target, Radio, Play, CheckCircle, Pause, XCircle, FileEdit } from 'lucide-react';

export interface Campaign {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  domain: string;
  status: string;
  budget: number | null;
  responsible_person: string | null;
  linked_objective_ids: string[];
  linked_channel_ids: string[];
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CampaignCardProps {
  campaign: Campaign;
  objectiveTitles: Record<string, string>;
  channelNames: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: string) => void;
}

const domainConfig: Record<string, { bg: string; text: string; border: string }> = {
  Communication: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Dissemination: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Exploitation: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const statusConfig: Record<string, { icon: typeof Play; color: string; bg: string; label: string }> = {
  draft: { icon: FileEdit, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Draft' },
  planned: { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Planned' },
  active: { icon: Play, color: 'text-green-600', bg: 'bg-green-100', label: 'Active' },
  completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Completed' },
  on_hold: { icon: Pause, color: 'text-amber-600', bg: 'bg-amber-100', label: 'On Hold' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Cancelled' },
};

export default function CampaignCard({ campaign, objectiveTitles, channelNames, onEdit, onDelete, onStatusChange }: CampaignCardProps) {
  const now = new Date();
  const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
  const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
  const isOverdue = endDate && endDate < now && campaign.status !== 'completed' && campaign.status !== 'cancelled';

  const domain = domainConfig[campaign.domain] || domainConfig.Communication;
  const status = statusConfig[campaign.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  // Timeline progress
  let timelineProgress = 0;
  if (campaign.status === 'completed') {
    timelineProgress = 100;
  } else if (startDate && endDate) {
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    if (total > 0) timelineProgress = Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  // Linked entities
  const linkedObjectives = (campaign.linked_objective_ids || []).filter(id => objectiveTitles[id]);
  const linkedChannels = (campaign.linked_channel_ids || []).filter(id => channelNames[id]);

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
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 truncate"
                onClick={onEdit}
              >
                {campaign.name}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${domain.bg} ${domain.text}`}>
                {campaign.domain || 'Communication'}
              </span>
              {isOverdue && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              )}
            </div>
            {campaign.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{campaign.description}</p>
            )}
          </div>

          {/* Quick Status */}
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <div className="relative">
              <select
                value={campaign.status || 'draft'}
                onChange={(e) => onStatusChange(e.target.value)}
                className={`appearance-none text-xs font-medium pl-7 pr-6 py-1.5 rounded-full border-0 cursor-pointer ${status.bg} ${status.color}`}
              >
                <option value="draft">Draft</option>
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
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(campaign.start_date)}</span>
              <span>{formatDate(campaign.end_date)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverdue ? 'bg-red-500' : campaign.status === 'completed' ? 'bg-emerald-500' : 'bg-green-500'
                }`}
                style={{ width: `${timelineProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Metrics Row */}
        <div className="flex items-center gap-4 flex-wrap mb-3">
          {campaign.budget != null && campaign.budget > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-gray-700 font-medium">{formatCurrency(campaign.budget)}</span>
            </div>
          )}
          {campaign.responsible_person && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <span>{campaign.responsible_person}</span>
            </div>
          )}
          {!startDate && !endDate && (
            <span className="text-xs text-gray-400 italic">No dates set</span>
          )}
        </div>

        {/* Linked Entities */}
        {(linkedObjectives.length > 0 || linkedChannels.length > 0) && (
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
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 rounded-b-lg flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Updated {new Date(campaign.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
        </div>
      </div>
    </div>
  );
}
