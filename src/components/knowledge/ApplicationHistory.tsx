import {
  Clock,
  Copy,
  Target,
  Users,
  BarChart3,
  Zap,
  FileText,
  Trash2,
  History
} from 'lucide-react';
import type { TemplateApplication } from '../../lib/knowledgeData';
import { ConfirmDialog } from '../ui';
import useConfirm from '../../hooks/useConfirm';

interface ApplicationHistoryProps {
  history: TemplateApplication[];
  onClear?: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  objective: <Target className="h-4 w-4 text-blue-500" />,
  stakeholder: <Users className="h-4 w-4 text-green-500" />,
  activity: <BarChart3 className="h-4 w-4 text-orange-500" />,
  indicator: <BarChart3 className="h-4 w-4 text-cyan-500" />,
  message: <FileText className="h-4 w-4 text-purple-500" />,
  channel: <Zap className="h-4 w-4 text-yellow-500" />
};

const categoryLabels: Record<string, string> = {
  objective: 'objectives',
  stakeholder: 'stakeholders',
  activity: 'activities',
  indicator: 'indicators',
  message: 'messages',
  channel: 'channels'
};

export default function ApplicationHistory({ history, onClear }: ApplicationHistoryProps) {
  const [confirmProps, confirmDialog] = useConfirm();

  if (history.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No templates have been applied to this project yet.</p>
        <p className="text-xs mt-1">
          When you apply a template, it will appear here with a full audit trail.
        </p>
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, TemplateApplication[]> = {};
  history.forEach(app => {
    const dateKey = new Date(app.appliedAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(app);
  });

  const totalItems = history.reduce((sum, app) => sum + app.itemsCreated, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            {history.length} {history.length === 1 ? 'application' : 'applications'}
          </span>
          <span>
            {totalItems} total items created
          </span>
        </div>
        {onClear && (
          <button
            onClick={async () => {
              const ok = await confirmDialog({ title: 'Clear history?', message: 'This only removes the log — created items remain in the project.', variant: 'warning', confirmLabel: 'Clear' });
              if (ok) onClear();
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Clear Log
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([dateLabel, apps]) => (
          <div key={dateLabel}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">{dateLabel}</span>
            </div>
            <div className="space-y-1.5 ml-5 border-l-2 border-slate-100 pl-4">
              {apps.map(app => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex-shrink-0">
                    {categoryIcons[app.templateCategory] || <Copy className="h-4 w-4 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {app.templateName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {app.templateCategory}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Created {app.itemsCreated} {categoryLabels[app.templateCategory] || 'items'}
                      {' • '}
                      {new Date(app.appliedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
