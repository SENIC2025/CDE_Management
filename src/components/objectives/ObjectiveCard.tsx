import { useState } from 'react';
import { Edit, Trash2, CheckCircle, Clock, Play, Pause, FileText, MessageSquare, User, Calendar, ChevronDown, AlertTriangle } from 'lucide-react';
import { type ProjectObjective } from '../../lib/projectObjectivesService';

interface ObjectiveCardProps {
  objective: ProjectObjective;
  linkedMessagesCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: string) => void;
}

const STATUS_STEPS = [
  { value: 'draft', label: 'Draft' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-200', icon: FileText },
  planned: { label: 'Planned', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200', icon: Play },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200', icon: CheckCircle },
  on_hold: { label: 'On Hold', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-200', icon: Pause },
};

const DOMAIN_COLORS: Record<string, string> = {
  communication: 'bg-blue-100 text-blue-700 border-blue-200',
  dissemination: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  exploitation: 'bg-orange-100 text-orange-700 border-orange-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function ObjectiveCard({ objective, linkedMessagesCount, onEdit, onDelete, onStatusChange }: ObjectiveCardProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const domain = (objective.domain || '').toLowerCase();
  const priority = objective.priority || 'medium';
  const status = objective.status || 'draft';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const domainColor = DOMAIN_COLORS[domain] || '';

  const meansOfVerification: string[] = Array.isArray(objective.means_of_verification)
    ? objective.means_of_verification
    : [];

  // Target date logic
  const targetDate = objective.target_date ? new Date(objective.target_date) : null;
  const now = new Date();
  const isOverdue = targetDate && targetDate < now && status !== 'completed';
  const isApproaching = targetDate && !isOverdue && status !== 'completed' &&
    (targetDate.getTime() - now.getTime()) < 14 * 24 * 60 * 60 * 1000; // within 14 days

  // Progress step indicator
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.value === status);
  const isOnHold = status === 'on_hold';

  const handleQuickStatus = (newStatus: string) => {
    setShowStatusDropdown(false);
    if (newStatus !== status) {
      onStatusChange(newStatus);
    }
  };

  return (
    <div className={`bg-white rounded-lg border ${isOverdue ? 'border-red-300' : 'border-gray-200'} p-6 hover:border-gray-300 transition-colors`}>
      {/* Progress Steps */}
      <div className="flex items-center mb-4">
        {isOnHold ? (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <Pause className="w-4 h-4" />
            <span className="font-medium">On Hold</span>
            <span className="text-xs text-gray-400">— workflow paused</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1">
            {STATUS_STEPS.map((step, idx) => {
              const isActive = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.value} className="flex items-center flex-1">
                  <div className="flex items-center flex-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isActive && idx < currentStepIndex ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className={`ml-1.5 text-xs hidden sm:inline ${
                      isCurrent ? 'font-semibold text-blue-700' : isActive ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 rounded ${
                      idx < currentStepIndex ? 'bg-blue-400' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{objective.title}</h3>
            {domain && domainColor && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border capitalize ${domainColor}`}>
                {domain}
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium}`}>
              {priority.toUpperCase()}
            </span>
          </div>
          {objective.description && (
            <p className="text-sm text-gray-600 mb-3">{objective.description}</p>
          )}
        </div>

        <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
          {/* Quick Status Change */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-80`}
              title="Change status"
            >
              <statusConfig.icon className="w-3 h-3" />
              {statusConfig.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showStatusDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {[...STATUS_STEPS, { value: 'on_hold', label: 'On Hold' }].map(opt => {
                    const cfg = STATUS_CONFIG[opt.value];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleQuickStatus(opt.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left ${
                          opt.value === status ? 'bg-blue-50 font-medium' : ''
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span>{opt.label}</span>
                        {opt.value === status && <CheckCircle className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit objective"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete objective"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta row: Owner, Target Date, Linked Messages */}
      <div className="flex items-center flex-wrap gap-4 mb-3 text-sm">
        {objective.responsible_person && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span>{objective.responsible_person}</span>
          </div>
        )}
        {targetDate && (
          <div className={`flex items-center gap-1.5 ${
            isOverdue ? 'text-red-600' : isApproaching ? 'text-amber-600' : 'text-gray-600'
          }`}>
            {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
            {!isOverdue && <Calendar className="w-3.5 h-3.5" />}
            <span className={isOverdue ? 'font-medium' : ''}>
              {isOverdue ? 'Overdue — ' : isApproaching ? 'Due soon — ' : 'Target: '}
              {targetDate.toLocaleDateString()}
            </span>
          </div>
        )}
        {linkedMessagesCount > 0 && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span>{linkedMessagesCount} message{linkedMessagesCount > 1 ? 's' : ''} linked</span>
          </div>
        )}
      </div>

      {/* Means of Verification */}
      {meansOfVerification.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1.5">Means of Verification:</p>
          <div className="flex flex-wrap gap-1.5">
            {meansOfVerification.map((mov, idx) => (
              <span key={idx} className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                {mov}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {objective.notes && (
        <div className="mb-3 text-sm text-gray-600 bg-gray-50 rounded p-2">
          <span className="text-xs font-medium text-gray-500">Notes: </span>
          {objective.notes}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>Created {new Date(objective.created_at).toLocaleDateString()}</span>
        {objective.source && objective.source !== 'manual' && (
          <span className="capitalize">Source: {objective.source}</span>
        )}
      </div>
    </div>
  );
}
