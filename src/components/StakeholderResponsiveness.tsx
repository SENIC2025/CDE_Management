import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { DecisionSupportService, StakeholderResponsiveness as ResponsivenessType } from '../lib/decisionSupport';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function StakeholderResponsiveness() {
  const { currentProject } = useProject();
  const [stakeholders, setStakeholders] = useState<ResponsivenessType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  async function loadData() {
    if (!currentProject) return;

    setLoading(true);
    try {
      const service = new DecisionSupportService(currentProject.id);
      await service.initialize();
      const data = await service.calculateStakeholderResponsiveness();
      setStakeholders(data);
    } catch (error) {
      console.error('Error loading responsiveness:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-slate-600">Loading responsiveness data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-slate-900">Stakeholder Responsiveness</h2>
        <p className="text-sm text-slate-600 mt-1">
          Response ratio = Response events / Targeted activities
        </p>
      </div>

      {stakeholders.length === 0 ? (
        <div className="p-6 text-center text-slate-600">No stakeholder data available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase">
                  Stakeholder Group
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">
                  Targeted Activities
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">
                  Response Events
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">
                  Responsiveness Ratio
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-700 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stakeholders.map((stakeholder) => {
                const ratioPercent = (stakeholder.responsiveness_ratio * 100).toFixed(0);
                return (
                  <tr key={stakeholder.stakeholder_group_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {stakeholder.stakeholder_group_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">
                      {stakeholder.targeted_activities_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">
                      {stakeholder.response_events_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold">
                      <span
                        className={
                          stakeholder.responsiveness_ratio >= 0.7
                            ? 'text-green-600'
                            : stakeholder.responsiveness_ratio >= 0.4
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }
                      >
                        {ratioPercent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {stakeholder.flag_high_targeting_low_response ? (
                        <div className="flex items-center justify-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded inline-flex">
                          <AlertTriangle size={14} />
                          Low Response
                        </div>
                      ) : (
                        <CheckCircle size={18} className="text-green-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-6 bg-slate-50 border-t">
        <div className="text-sm text-slate-600">
          <strong>High Targeting Low Response:</strong> Groups with 3+ targeted activities and
          response ratio {'<'} 50% may need adjusted engagement strategies.
        </div>
      </div>
    </div>
  );
}
