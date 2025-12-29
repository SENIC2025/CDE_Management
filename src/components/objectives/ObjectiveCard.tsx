import { Edit, Trash2, TrendingUp, Activity, AlertTriangle, Sparkles } from 'lucide-react';
import { type ProjectObjective, projectObjectivesService } from '../../lib/projectObjectivesService';

interface ObjectiveCardProps {
  objective: ProjectObjective;
  onEdit: () => void;
  onDelete: () => void;
  onApplyKPIs: () => void;
}

export default function ObjectiveCard({ objective, onEdit, onDelete, onApplyKPIs }: ObjectiveCardProps) {
  const statusInfo = projectObjectivesService.getStatusInfo(objective.status);

  const domainColors = {
    communication: 'bg-blue-100 text-blue-700 border-blue-200',
    dissemination: 'bg-green-100 text-green-700 border-green-200',
    exploitation: 'bg-orange-100 text-orange-700 border-orange-200'
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const statusColors = {
    on_track: 'bg-green-100 text-green-700',
    at_risk: 'bg-yellow-100 text-yellow-700',
    needs_kpis: 'bg-orange-100 text-orange-700',
    needs_activities: 'bg-orange-100 text-orange-700',
    no_data: 'bg-gray-100 text-gray-700'
  };

  const showApplyKPIsButton = objective.objective_lib_id && (objective.kpis_linked_count === 0 || objective.status === 'needs_kpis');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{objective.title}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${domainColors[objective.domain]}`}>
              {objective.domain}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${priorityColors[objective.priority]}`}>
              {objective.priority.toUpperCase()}
            </span>
            {objective.source === 'strategy' && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
                From CDE Strategy
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">{objective.description}</p>

          {objective.stakeholder_types.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs font-medium text-gray-500">Stakeholders:</span>
              {objective.stakeholder_types.map((type, idx) => (
                <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  {type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {showApplyKPIsButton && (
            <button
              onClick={onApplyKPIs}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Apply KPI suggestions"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit objective"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete objective"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-medium">{objective.kpis_linked_count}</span> KPIs
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-medium">{objective.activities_linked_count}</span> Activities
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Time Horizon:</span>
            <span className="text-sm font-medium text-gray-700 capitalize">{objective.time_horizon}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[objective.status]}`}>
            {statusInfo.label}
          </span>
          {(objective.status === 'at_risk' || objective.status === 'needs_kpis' || objective.status === 'needs_activities') && (
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          )}
        </div>
      </div>

      {objective.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Project Notes:</p>
          <p className="text-sm text-gray-700">{objective.notes}</p>
        </div>
      )}
    </div>
  );
}
