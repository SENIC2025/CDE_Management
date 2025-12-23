import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DecisionSupportService } from '../lib/decisionSupport';
import { FileText, Download, Edit2 } from 'lucide-react';

export default function ExecutiveSummaryGenerator() {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const [summary, setSummary] = useState<string[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportPreset, setExportPreset] = useState<'steering' | 'board' | 'funder'>('steering');

  async function generateSummary() {
    if (!currentProject) return;

    setLoading(true);
    try {
      const service = new DecisionSupportService(currentProject.id);
      await service.initialize();

      const bullets: string[] = [];
      const riskList: string[] = [];

      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('status', 'completed')
        .order('effort_hours', { ascending: false })
        .limit(3);

      if (activities && activities.length > 0) {
        bullets.push(
          `Completed ${activities.length} major activities with total effort of ${activities
            .reduce((sum, a) => sum + Number(a.effort_hours || 0), 0)
            .toFixed(0)} hours`
        );
      }

      const { data: indicators } = await supabase
        .from('indicators')
        .select('*, indicator_values(*)')
        .eq('project_id', currentProject.id)
        .limit(5);

      if (indicators && indicators.length > 0) {
        const indicatorsWithProgress = indicators.filter(
          (ind) => ind.indicator_values && ind.indicator_values.length > 0
        );
        if (indicatorsWithProgress.length > 0) {
          bullets.push(`Tracking ${indicators.length} indicators with ${indicatorsWithProgress.length} showing progress`);
        }
      }

      const { data: evidence } = await supabase
        .from('evidence_items')
        .select('id')
        .eq('project_id', currentProject.id);

      if (evidence && evidence.length > 0) {
        bullets.push(`Collected ${evidence.length} evidence items supporting project claims`);
      }

      const { data: uptakeOpps } = await supabase
        .from('uptake_opportunities')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (uptakeOpps && uptakeOpps.length > 0) {
        const activeOpps = uptakeOpps.filter((opp) => ['prospect', 'engaged'].includes(opp.stage));
        bullets.push(
          `Identified ${uptakeOpps.length} uptake opportunities with ${activeOpps.length} actively engaged`
        );
      }

      const { data: complianceChecks } = await supabase
        .from('compliance_checks')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('checked_at', { ascending: false })
        .limit(1);

      if (complianceChecks && complianceChecks.length > 0) {
        const latestCheck = complianceChecks[0];
        const issues = (latestCheck.issues_json as any[]) || [];
        bullets.push(
          `Latest compliance check: ${issues.length === 0 ? 'All checks passing' : `${issues.length} issues identified`}`
        );
      }

      const flags = await service.generateRecommendationFlags();
      const highPriorityFlags = flags.filter((f) => f.severity === 'high');
      const mediumPriorityFlags = flags.filter((f) => f.severity === 'warn');

      if (highPriorityFlags.length > 0) {
        riskList.push(`${highPriorityFlags.length} high-priority issues requiring immediate attention`);
        highPriorityFlags.slice(0, 2).forEach((flag) => {
          riskList.push(`• ${flag.title}: ${flag.suggested_action}`);
        });
      }

      if (mediumPriorityFlags.length > 0) {
        riskList.push(`${mediumPriorityFlags.length} medium-priority items for next period planning`);
      }

      const objectiveDiagnostics = await service.calculateObjectiveDiagnostics();
      const atRiskObjectives = objectiveDiagnostics.filter((obj) => obj.status !== 'On track');
      if (atRiskObjectives.length > 0) {
        riskList.push(`${atRiskObjectives.length} objectives require attention or course correction`);
      }

      setSummary(bullets);
      setRisks(riskList);
      setEditedSummary(bullets.join('\n'));
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportReport() {
    if (!currentProject) return;

    let content = `<h1>Executive Summary - ${currentProject.title}</h1>`;
    content += `<p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>`;

    if (exportPreset === 'steering') {
      content += `<h2>This Period in Summary</h2><ul>`;
      summary.forEach((bullet) => {
        content += `<li>${bullet}</li>`;
      });
      content += `</ul>`;

      content += `<h2>Top Risks for Next Period</h2><ul>`;
      risks.forEach((risk) => {
        content += `<li>${risk}</li>`;
      });
      content += `</ul>`;

      content += `<h2>Recommended Actions</h2>`;
      content += `<p>Address high-priority issues and review at-risk objectives.</p>`;
    } else if (exportPreset === 'board') {
      content += `<h2>Strategic Overview</h2><ul>`;
      summary.forEach((bullet) => {
        content += `<li>${bullet}</li>`;
      });
      content += `</ul>`;

      content += `<h2>Key Performance Indicators</h2>`;
      content += `<p>Detailed KPI data available in full report.</p>`;

      content += `<h2>Sustainability & Exploitation</h2>`;
      content += `<p>Uptake opportunities and sustainability plans in progress.</p>`;
    } else if (exportPreset === 'funder') {
      content += `<h2>Deliverables & Outputs</h2><ul>`;
      summary.forEach((bullet) => {
        content += `<li>${bullet}</li>`;
      });
      content += `</ul>`;

      content += `<h2>Compliance Status</h2>`;
      content += `<p>All compliance requirements monitored. Full compliance annex available.</p>`;

      content += `<h2>Evidence Index</h2>`;
      content += `<p>Comprehensive evidence repository maintained for all key claims.</p>`;
    }

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-summary-${exportPreset}-${Date.now()}.html`;
    a.click();
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Executive Summary Generator</h2>
            <p className="text-sm text-slate-600 mt-1">Auto-generate period summaries and reports</p>
          </div>
          <button
            onClick={generateSummary}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
          >
            <FileText size={18} />
            {loading ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>
      </div>

      {summary.length > 0 && (
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">This Period in 10 Bullets</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Edit2 size={14} />
                {isEditing ? 'Save' : 'Edit'}
              </button>
            </div>
            {isEditing ? (
              <textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            ) : (
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
                {summary.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-base font-semibold text-slate-900 mb-3">Top Risks for Next Period</h3>
            {risks.length === 0 ? (
              <div className="text-sm text-green-600">No significant risks identified</div>
            ) : (
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
                {risks.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-base font-semibold text-slate-900 mb-3">Export Presets</h3>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="steering"
                  checked={exportPreset === 'steering'}
                  onChange={(e) => setExportPreset(e.target.value as any)}
                  className="rounded"
                />
                <span className="text-sm">Steering Committee</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="board"
                  checked={exportPreset === 'board'}
                  onChange={(e) => setExportPreset(e.target.value as any)}
                  className="rounded"
                />
                <span className="text-sm">Board/Management</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="funder"
                  checked={exportPreset === 'funder'}
                  onChange={(e) => setExportPreset(e.target.value as any)}
                  className="rounded"
                />
                <span className="text-sm">Funder Report</span>
              </label>
            </div>
            <button
              onClick={exportReport}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              <Download size={18} />
              Export as HTML
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
