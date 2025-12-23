import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Download, FileText, Eye } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { logReportChange } from '../lib/audit';
import ExecutiveSummaryGenerator from '../components/ExecutiveSummaryGenerator';

export default function Reports() {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const [reports, setReports] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ reporting_period: '', title: '', description: '', narrative_json: '{}', status: 'draft' });

  useEffect(() => { if (currentProject) loadReports(); }, [currentProject]);

  async function loadReports() {
    const { data } = await supabase.from('reports').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setReports(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      const oldReport = reports.find(r => r.id === editingId);
      await supabase.from('reports').update(formData).eq('id', editingId);
      if (profile && currentProject) {
        const action = oldReport?.status !== formData.status ? 'change_status' : 'update';
        await logReportChange(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          action,
          editingId,
          oldReport,
          formData
        );
      }
    } else {
      const { data } = await supabase.from('reports').insert({ ...formData, project_id: currentProject!.id }).select().single();
      if (data && profile && currentProject) {
        await logReportChange(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'create',
          data.id,
          undefined,
          data
        );
      }
    }
    setFormData({ reporting_period: '', title: '', description: '', narrative_json: '{}', status: 'draft' });
    setEditingId(null);
    setShowForm(false);
    loadReports();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete report?')) {
      const oldReport = reports.find(r => r.id === id);
      await supabase.from('reports').delete().eq('id', id);
      if (profile && currentProject && oldReport) {
        await logReportChange(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'delete',
          id,
          oldReport,
          undefined
        );
      }
      loadReports();
    }
  }

  async function exportHTML(reportId: string) {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const objectives = await supabase.from('cde_objectives').select('*').eq('project_id', currentProject!.id);
    const stakeholders = await supabase.from('stakeholders').select('*').eq('project_id', currentProject!.id);
    const activities = await supabase.from('activities').select('*').eq('project_id', currentProject!.id);
    const indicators = await supabase.from('indicators').select('*').eq('project_id', currentProject!.id);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #334155; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
    .meta { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #e2e8f0; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="meta">
    <strong>Period:</strong> ${report.reporting_period}<br>
    <strong>Generated:</strong> ${new Date().toLocaleDateString()}<br>
    <strong>Status:</strong> ${report.status}
  </div>
  ${report.description ? `<p>${report.description}</p>` : ''}

  <h2>Objectives (${objectives.data?.length || 0})</h2>
  <table>
    <tr><th>Title</th><th>Domain</th><th>Status</th></tr>
    ${objectives.data?.map(o => `<tr><td>${o.title}</td><td>${o.domain}</td><td>${o.status}</td></tr>`).join('') || '<tr><td colspan="3">No data</td></tr>'}
  </table>

  <h2>Stakeholders (${stakeholders.data?.length || 0})</h2>
  <table>
    <tr><th>Name</th><th>Role</th><th>Priority</th></tr>
    ${stakeholders.data?.map(s => `<tr><td>${s.name}</td><td>${s.role}</td><td>${s.priority_score}/10</td></tr>`).join('') || '<tr><td colspan="3">No data</td></tr>'}
  </table>

  <h2>Activities (${activities.data?.length || 0})</h2>
  <table>
    <tr><th>Title</th><th>Domain</th><th>Status</th><th>Dates</th></tr>
    ${activities.data?.map(a => `<tr><td>${a.title}</td><td>${a.domain}</td><td>${a.status}</td><td>${a.start_date || ''} - ${a.end_date || ''}</td></tr>`).join('') || '<tr><td colspan="4">No data</td></tr>'}
  </table>

  <h2>Indicators (${indicators.data?.length || 0})</h2>
  <table>
    <tr><th>Name</th><th>Unit</th><th>Baseline</th><th>Target</th></tr>
    ${indicators.data?.map(i => `<tr><td>${i.name}</td><td>${i.unit}</td><td>${i.baseline}</td><td>${i.target}</td></tr>`).join('') || '<tr><td colspan="4">No data</td></tr>'}
  </table>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '_')}_${report.reporting_period}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function previewReport(reportId: string) {
    setShowPreview(reportId);
  }

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Reporting & Exports</h1><p className="text-slate-600 mt-1">Generate and export reports</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Plus size={20} />New Report</button>
      </div>

      <ExecutiveSummaryGenerator />

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b"><h2 className="text-lg font-semibold">Reports</h2></div>
        {reports.length === 0 ? <div className="p-6 text-center text-slate-600">No reports</div> : (
          <div className="divide-y">
            {reports.map(report => (
              <div key={report.id} className="p-6 hover:bg-slate-50">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText size={20} className="text-slate-400 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{report.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{report.reporting_period}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${report.status === 'draft' ? 'bg-slate-100 text-slate-700' : report.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{report.status}</span>
                      </div>
                      {report.description && <p className="text-sm text-slate-600">{report.description}</p>}
                      <p className="text-xs text-slate-500 mt-1">Created: {new Date(report.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => previewReport(report.id)} className="text-blue-600 hover:text-blue-700" title="Preview"><Eye size={18} /></button>
                    <button onClick={() => exportHTML(report.id)} className="text-green-600 hover:text-green-700" title="Export HTML"><Download size={18} /></button>
                    <button onClick={() => { setFormData({ reporting_period: report.reporting_period, title: report.title, description: report.description, narrative_json: report.narrative_json, status: report.status }); setEditingId(report.id); setShowForm(true); }} className="text-blue-600"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(report.id)} className="text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Report</h3></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Reporting Period</label><input type="text" required value={formData.reporting_period} onChange={(e) => setFormData({ ...formData, reporting_period: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="e.g., Y1, M1-M6" /></div>
                <div><label className="block text-sm font-medium mb-1">Status</label><select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="draft">Draft</option><option value="review" disabled={!permissions.canChangeReportStatus('draft')}>Review</option><option value="submitted" disabled={!permissions.canChangeReportStatus('draft')}>Submitted</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Narrative JSON</label><textarea value={formData.narrative_json} onChange={(e) => setFormData({ ...formData, narrative_json: e.target.value })} rows={6} className="w-full px-3 py-2 border rounded font-mono text-sm" placeholder='{"sections": [{"title": "Overview", "content": "..."}]}' /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Report Preview</h3>
              <button onClick={() => setShowPreview(null)} className="text-slate-400 hover:text-slate-600">Close</button>
            </div>
            <div className="p-6">
              {(() => {
                const report = reports.find(r => r.id === showPreview);
                if (!report) return null;
                return (
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{report.title}</h2>
                    <div className="bg-slate-50 p-4 rounded mb-4">
                      <p className="text-sm"><strong>Period:</strong> {report.reporting_period}</p>
                      <p className="text-sm"><strong>Status:</strong> {report.status}</p>
                      <p className="text-sm"><strong>Created:</strong> {new Date(report.created_at).toLocaleDateString()}</p>
                    </div>
                    {report.description && <p className="text-slate-700 mb-4">{report.description}</p>}
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-semibold mt-4 mb-2">Narrative Content</h3>
                      <pre className="text-xs bg-slate-50 p-4 rounded overflow-x-auto">{JSON.stringify(JSON.parse(report.narrative_json || '{}'), null, 2)}</pre>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
