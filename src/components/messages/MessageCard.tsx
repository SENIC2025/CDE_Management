import { Edit, Trash2, FileText, Eye, CheckCircle, Send, Clock, Target, Users } from 'lucide-react';

export interface Message {
  id: string;
  project_id: string;
  title: string;
  body: string | null;
  value_proposition: string | null;
  domain: string;
  status: string;
  audience: string | null;
  linked_objective_ids: string[];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageCardProps {
  message: Message;
  objectiveTitles: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: FileText },
  review: { label: 'In Review', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  published: { label: 'Published', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Send },
};

const DOMAIN_COLORS: Record<string, string> = {
  communication: 'bg-blue-100 text-blue-700 border-blue-200',
  dissemination: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  exploitation: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function MessageCard({ message, objectiveTitles, onEdit, onDelete }: MessageCardProps) {
  const status = message.status || 'draft';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const domain = (message.domain || '').toLowerCase();
  const domainColor = DOMAIN_COLORS[domain] || 'bg-gray-100 text-gray-700 border-gray-200';

  const linkedObjectives = (message.linked_objective_ids || [])
    .map(id => objectiveTitles[id])
    .filter(Boolean);

  const isExpired = message.expires_at && new Date(message.expires_at) < new Date();

  return (
    <div className={`bg-white rounded-lg border ${isExpired ? 'border-red-200 bg-red-50/30' : 'border-gray-200'} p-6 hover:border-gray-300 transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{message.title}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border capitalize ${domainColor}`}>
              {domain || 'unset'}
            </span>
            <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg border ${statusConfig.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </span>
            {isExpired && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg border bg-red-100 text-red-700 border-red-200">
                <Clock className="w-3 h-3" />
                Expired
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit message"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Value Proposition - highlighted */}
      {message.value_proposition && (
        <div className="mb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Value Proposition</p>
          <p className="text-sm text-gray-800 font-medium">{message.value_proposition}</p>
        </div>
      )}

      {/* Body preview */}
      {message.body && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{message.body}</p>
      )}

      {/* Audience */}
      {message.audience && (
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">Audience:</span>
          <span className="text-xs font-medium text-gray-700">{message.audience}</span>
        </div>
      )}

      {/* Linked Objectives */}
      {linkedObjectives.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Linked Objectives:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {linkedObjectives.map((title, idx) => (
              <span key={idx} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200">
                {title}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>Created {new Date(message.created_at).toLocaleDateString()}</span>
        {message.expires_at && (
          <span className={isExpired ? 'text-red-500' : ''}>
            {isExpired ? 'Expired' : 'Expires'} {new Date(message.expires_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
