import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { DecisionSupportService, ChannelEffectiveness as ChannelEffectivenessType } from '../lib/decisionSupport';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

export default function ChannelEffectiveness() {
  const { currentProject } = useProject();
  const [channels, setChannels] = useState<ChannelEffectivenessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState<string>('');

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject, domainFilter]);

  async function loadData() {
    if (!currentProject) return;

    setLoading(true);
    try {
      const service = new DecisionSupportService(currentProject.id);
      await service.initialize();
      const data = await service.calculateChannelEffectiveness(
        domainFilter ? { domain: domainFilter } : undefined
      );
      setChannels(data);
    } catch (error) {
      console.error('Error loading channel effectiveness:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-slate-600">Loading channel effectiveness...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Channel Effectiveness Analysis</h2>
            <p className="text-sm text-slate-600 mt-1">
              Effectiveness Score = Meaningful Engagement / Cost Proxy
            </p>
          </div>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Domains</option>
            <option value="communication">Communication</option>
            <option value="dissemination">Dissemination</option>
            <option value="exploitation">Exploitation</option>
          </select>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="p-6 text-center text-slate-600">No channel data available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Channel</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Type</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Activities</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Effort (h)</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Cost Proxy</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Engagement</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Evidence %</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Score</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {channels.map((channel, index) => {
                const isTop = index < 3;
                const isBottom = index >= channels.length - 3;
                return (
                  <tr key={channel.channel_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{channel.channel_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{channel.channel_type}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">{channel.activity_count}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">
                      {channel.effort_hours_total.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">
                      €{channel.cost_proxy_total.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">
                      {channel.meaningful_engagement_total}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">
                      {channel.evidence_completeness_avg.toFixed(0)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold">
                      <span
                        className={
                          isTop
                            ? 'text-green-600'
                            : isBottom
                            ? 'text-red-600'
                            : 'text-slate-900'
                        }
                      >
                        {channel.effectiveness_score.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isTop ? (
                        <TrendingUp size={18} className="text-green-600 mx-auto" />
                      ) : isBottom ? (
                        <TrendingDown size={18} className="text-red-600 mx-auto" />
                      ) : (
                        <BarChart3 size={18} className="text-slate-400 mx-auto" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Total Effort</div>
            <div className="text-2xl font-bold text-slate-900">
              {channels.reduce((sum, c) => sum + c.effort_hours_total, 0).toFixed(0)}h
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Total Cost Proxy</div>
            <div className="text-2xl font-bold text-slate-900">
              €{channels.reduce((sum, c) => sum + c.cost_proxy_total, 0).toFixed(0)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Total Engagement</div>
            <div className="text-2xl font-bold text-slate-900">
              {channels.reduce((sum, c) => sum + c.meaningful_engagement_total, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
