import { Globe, Share2, Mail, CalendarDays, Newspaper, Radio, Edit, Trash2, Activity } from 'lucide-react';

export interface Channel {
  id: string;
  project_id: string;
  name: string;
  type: string;
  description: string | null;
  audience_fit_score: number;
  cost_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ChannelCardProps {
  channel: Channel;
  linkedActivityCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

const typeConfig: Record<string, { icon: typeof Globe; color: string; bg: string; label: string }> = {
  website: { icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Website' },
  social: { icon: Share2, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Social Media' },
  newsletter: { icon: Mail, color: 'text-green-600', bg: 'bg-green-50', label: 'Newsletter' },
  event: { icon: CalendarDays, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Event' },
  press: { icon: Newspaper, color: 'text-red-600', bg: 'bg-red-50', label: 'Press' },
};

function getFitColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-blue-500';
  if (score >= 4) return 'bg-yellow-500';
  return 'bg-red-400';
}

function getFitLabel(score: number): string {
  if (score >= 8) return 'Excellent fit';
  if (score >= 6) return 'Good fit';
  if (score >= 4) return 'Moderate fit';
  return 'Low fit';
}

export default function ChannelCard({ channel, linkedActivityCount, onEdit, onDelete }: ChannelCardProps) {
  const config = typeConfig[channel.type] || { icon: Radio, color: 'text-gray-600', bg: 'bg-gray-50', label: channel.type };
  const TypeIcon = config.icon;
  const fitScore = channel.audience_fit_score || 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
              <TypeIcon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 truncate"
                onClick={onEdit}
              >
                {channel.name}
              </h3>
              <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 p-1"><Edit className="w-4 h-4" /></button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Description */}
        {channel.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{channel.description}</p>
        )}

        {/* Audience Fit Gauge */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Audience Fit</span>
            <span className="text-xs font-medium text-gray-700">{fitScore}/10 — {getFitLabel(fitScore)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getFitColor(fitScore)}`}
              style={{ width: `${(fitScore / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Bottom Row: Cost Notes + Activity Count */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex-1 min-w-0">
            {channel.cost_notes && (
              <p className="text-xs text-gray-500 truncate" title={channel.cost_notes}>
                Cost: {channel.cost_notes}
              </p>
            )}
          </div>
          {linkedActivityCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 ml-2 shrink-0">
              <Activity className="w-3.5 h-3.5" />
              <span>{linkedActivityCount} {linkedActivityCount === 1 ? 'activity' : 'activities'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
