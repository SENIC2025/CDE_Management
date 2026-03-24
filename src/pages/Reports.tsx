import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Eye,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  FileCheck,
  Presentation,
  Landmark,
  X,
  ArrowRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { logReportChange } from '../lib/audit';
import ExecutiveSummaryGenerator from '../components/ExecutiveSummaryGenerator';
import { ExportService } from '../lib/exportService';
import ReportDashboard from '../components/reports/ReportDashboard';
import ReportSectionEditor from '../components/reports/ReportSectionEditor';
import ExportHub from '../components/reports/ExportHub';
import ReportPreview from '../components/reports/ReportPreview';
import { PageHeader, PageSkeleton, ConfirmDialog } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import {
  REPORT_TEMPLATES,
  parseLegacyNarrative,
  sectionsToJson,
  createSectionsFromTemplate
} from '../lib/reportTemplates';
import type { ReportSection } from '../lib/reportTemplates';

type ViewMode = 'list' | 'edit';
type FilterStatus = 'all' | 'draft' | 'review' | 'submitted';

const templateIcons: Record<string, React.ReactNode> = {
  'calendar': <Calendar className="h-6 w-6" />,
  'file-check': <FileCheck className="h-6 w-6" />,
  'presentation': <Presentation className="h-6 w-6" />,
  'landmark': <Landmark className="h-6 w-6" />
};

const templateColors: Record<string, string> = {
  'blue': 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100',
  'green': 'border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100',
  'purple': 'border-purple-300 bg-purple-50 text-purple-700 hover:border-purple-400 hover:bg-purple-100',
  'amber': 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100'
};

interface ProjectData {
  objectives: any[];
  stakeholders: any[];
  activities: any[];
  indicators: any[];
  evidence: any[];
  complianceScore: number;
  exploitationCount: number;
  channels: any[];
}

export default function Reports() {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const [confirmProps, confirm] = useConfirm();

  // Reports data
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPreviewId, setShowPreviewId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showExecSummary, setShowExecSummary] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formPeriod, setFormPeriod] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('draft');
  const [formSections, setFormSections] = useState<ReportSection[]>([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Project data for preview & export
  const [projectData, setProjectData] = useState<ProjectData>({
    objectives: [], stakeholders: [], activities: [], indicators: [],
    evidence: [], complianceScore: 0, exploitationCount: 0, channels: []
  });

  // Export state
  const [exportingBundle, setExportingBundle] = useState(false);

  // Compliance info for dashboard
  const [complianceScore, setComplianceScore] = useState(0);
  const [lastCheckDate, setLastCheckDate] = useState<string | null>(null);
  const [currentPeriodLabel, setCurrentPeriodLabel] = useState<string | null>(null);

  // Load reports
  useEffect(() => {
    if (currentProject) {
      loadReports();
      loadProjectData();
      loadComplianceInfo();
    }
  }, [currentProject]);

  async function loadReports() {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('project_id', currentProject!.id)
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  }

  async function loadProjectData() {
    if (!currentProject) return;
    const pid = currentProject.id;

    const [objectives, stakeholders, activities, indicators, evidence, channels, exploitation] = await Promise.all([
      supabase.from('cde_objectives').select('*').eq('project_id', pid),
      supabase.from('stakeholder_groups').select('*').eq('project_id', pid),
      supabase.from('activities').select('*').eq('project_id', pid),
      supabase.from('indicators').select('*').eq('project_id', pid),
      supabase.from('evidence_items').select('*').eq('project_id', pid),
      supabase.from('channels').select('*').eq('project_id', pid),
      supabase.from('uptake_opportunities').select('id').eq('project_id', pid)
    ]);

    setProjectData({
      objectives: objectives.data || [],
      stakeholders: stakeholders.data || [],
      activities: activities.data || [],
      indicators: indicators.data || [],
      evidence: evidence.data || [],
      complianceScore,
      exploitationCount: exploitation.data?.length || 0,
      channels: channels.data || []
    });
  }

  async function loadComplianceInfo() {
    if (!currentProject) return;
    const { data: checks } = await supabase
      .from('compliance_checks')
      .select('checked_at, issues_json, score')
      .eq('project_id', currentProject.id)
      .order('checked_at', { ascending: false })
      .limit(1);

    if (checks && checks.length > 0) {
      const check = checks[0];
      setLastCheckDate(check.checked_at);

      // Parse score from issues_json wrapper or score field
      let score = 0;
      if (check.score) {
        score = check.score;
      } else if (check.issues_json && typeof check.issues_json === 'object' && !Array.isArray(check.issues_json)) {
        const wrapper = check.issues_json as any;
        if (wrapper.scoreData?.overallScore) {
          score = wrapper.scoreData.overallScore;
        }
      }
      setComplianceScore(score);
    }

    // Get current reporting period
    const { data: periods } = await supabase
      .from('reporting_periods')
      .select('label')
      .eq('project_id', currentProject.id)
      .order('start_date', { ascending: false })
      .limit(1);

    if (periods && periods.length > 0) {
      setCurrentPeriodLabel(periods[0].label);
    }
  }

  // Filtered reports
  const filteredReports = useMemo(() => {
    let result = reports;
    if (filterStatus !== 'all') {
      result = result.filter(r => r.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.reporting_period?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, filterStatus, searchQuery]);

  // Create from template
  function handleCreateFromTemplate(templateId: string) {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setFormTitle(`${template.name} — ${currentPeriodLabel || 'Period'}`);
    setFormPeriod(currentPeriodLabel || '');
    setFormDescription('');
    setFormStatus('draft');
    setFormSections(createSectionsFromTemplate(templateId));
    setEditingId(null);
    setShowTemplateSelector(false);
    setViewMode('edit');
  }

  // Create blank
  function handleCreateBlank() {
    setFormTitle('');
    setFormPeriod('');
    setFormDescription('');
    setFormStatus('draft');
    setFormSections([]);
    setEditingId(null);
    setShowTemplateSelector(false);
    setViewMode('edit');
  }

  // Edit existing
  function handleEdit(report: any) {
    setFormTitle(report.title);
    setFormPeriod(report.reporting_period);
    setFormDescription(report.description || '');
    setFormStatus(report.status);
    setFormSections(parseLegacyNarrative(report.narrative_json));
    setEditingId(report.id);
    setViewMode('edit');
  }

  // Save report
  async function handleSave() {
    if (!currentProject || !profile) return;
    if (!formTitle.trim() || !formPeriod.trim()) {
      alert('Title and reporting period are required.');
      return;
    }

    const payload = {
      title: formTitle,
      reporting_period: formPeriod,
      description: formDescription,
      narrative_json: sectionsToJson(formSections),
      status: formStatus
    };

    if (editingId) {
      const oldReport = reports.find(r => r.id === editingId);
      await supabase.from('reports').update(payload).eq('id', editingId);
      const action = oldReport?.status !== formStatus ? 'change_status' : 'update';
      await logReportChange(currentProject.org_id, currentProject.id, profile.id, action, editingId, oldReport, payload);
    } else {
      const { data } = await supabase.from('reports').insert({ ...payload, project_id: currentProject.id }).select().single();
      if (data) {
        await logReportChange(currentProject.org_id, currentProject.id, profile.id, 'create', data.id, undefined, data);
        setEditingId(data.id);
      }
    }

    await loadReports();
    setViewMode('list');
  }

  // Delete
  async function handleDelete(id: string) {
    const ok = await confirm({ title: 'Delete report?', message: 'This report will be permanently deleted. This cannot be undone.' });
    if (!ok) return;
    const oldReport = reports.find(r => r.id === id);
    await supabase.from('reports').delete().eq('id', id);
    if (profile && currentProject && oldReport) {
      await logReportChange(currentProject.org_id, currentProject.id, profile.id, 'delete', id, oldReport, undefined);
    }
    loadReports();
  }

  // Export bundle
  async function handleExportBundle() {
    if (!currentProject || !profile) return;
    if (!permissions.canManageProject()) {
      alert('You need coordinator, cde_lead, or admin role to export the project bundle.');
      return;
    }
    setExportingBundle(true);
    try {
      await ExportService.downloadProjectBundle(currentProject.id, profile.id, currentProject.org_id);
    } catch (error: any) {
      console.error('Export bundle error:', error);
      alert('Failed to export: ' + error.message);
    } finally {
      setExportingBundle(false);
    }
  }

  // Data counts for section editor
  const projectDataCounts = useMemo(() => ({
    objectivesCount: projectData.objectives.length,
    stakeholdersCount: projectData.stakeholders.length,
    activitiesCount: projectData.activities.length,
    indicatorsCount: projectData.indicators.length,
    evidenceCount: projectData.evidence.length,
    complianceScore: complianceScore,
    exploitationCount: projectData.exploitationCount,
    channelsCount: projectData.channels.length
  }), [projectData, complianceScore]);

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Select a project to view reports</p>
      </div>
    );
  }

  // ─── EDIT VIEW ───
  if (viewMode === 'edit') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Reports
            </button>
            <ChevronDown className="h-4 w-4 text-slate-400 -rotate-90" />
            <span className="text-sm font-medium text-slate-800">
              {editingId ? 'Edit Report' : 'New Report'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {editingId ? 'Save Changes' : 'Create Report'}
            </button>
          </div>
        </div>

        {/* Report Meta */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                placeholder="e.g., Periodic Report M1-M12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                <input
                  type="text"
                  value={formPeriod}
                  onChange={e => setFormPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  placeholder="e.g., Y1, M1-M6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="review" disabled={!permissions.canChangeReportStatus('draft')}>Review</option>
                  <option value="submitted" disabled={!permissions.canChangeReportStatus('draft')}>Submitted</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                placeholder="Brief description of this report..."
              />
            </div>
          </div>
        </div>

        {/* Section Editor */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Report Sections</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Drag to reorder. Data sections auto-populate from your project.
              </p>
            </div>
            <span className="text-xs text-slate-400">{formSections.length} sections</span>
          </div>
          <ReportSectionEditor
            sections={formSections}
            onChange={setFormSections}
            projectData={projectDataCounts}
          />
        </div>

        {/* Export Hub (only if editing existing report) */}
        {editingId && (
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <ExportHub
              report={{
                id: editingId,
                title: formTitle,
                reporting_period: formPeriod,
                description: formDescription,
                status: formStatus,
                created_at: reports.find(r => r.id === editingId)?.created_at || new Date().toISOString()
              }}
              sections={formSections}
              projectData={projectData}
              onExportBundle={handleExportBundle}
              bundleExporting={exportingBundle}
              canExportBundle={permissions.canManageProject()}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ───
  if (loading && reports.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Reports & Exports"
        subtitle="Create, edit and export project reports"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExecSummary(!showExecSummary)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-slate-300 text-[#14261C] rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              <FileText className="h-4 w-4" />
              Executive Summary
            </button>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-[#1BAE70] text-white rounded-lg hover:bg-[#06752E] font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Report
            </button>
          </div>
        }
      />

      {/* Dashboard Cards */}
      <ReportDashboard
        reports={reports}
        complianceScore={complianceScore}
        lastCheckDate={lastCheckDate}
        currentPeriodLabel={currentPeriodLabel}
        onCreateReport={handleCreateBlank}
        onCreateFromTemplate={() => setShowTemplateSelector(true)}
      />

      {/* Executive Summary (collapsible) */}
      {showExecSummary && (
        <ExecutiveSummaryGenerator />
      )}

      {/* Report List */}
      <div className="bg-white rounded-lg border border-slate-200">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-0.5">
            {(['all', 'draft', 'review', 'submitted'] as FilterStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Reports */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center">
            {reports.length === 0 ? (
              <div>
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-4">No reports yet. Create your first one.</p>
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Choose a template to get started
                </button>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No reports match your search.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReports.map(report => {
              const sections = parseLegacyNarrative(report.narrative_json);
              const filledSections = sections.filter(s => s.content.trim().length > 0).length;
              const totalSections = sections.length;

              return (
                <div
                  key={report.id}
                  className="p-4 hover:bg-slate-50/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleEdit(report)}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {report.title}
                        </button>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                          {report.reporting_period}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          report.status === 'draft' ? 'bg-slate-100 text-slate-600'
                          : report.status === 'submitted' ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {report.status === 'submitted' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {report.status}
                        </span>
                      </div>
                      {report.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">{report.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Created {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {totalSections > 0 && (
                          <span className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${totalSections > 0 ? (filledSections / totalSections) * 100 : 0}%` }}
                              />
                            </div>
                            {filledSections}/{totalSections} sections
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowPreviewId(report.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(report)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create New Report</h2>
                <p className="text-sm text-slate-500 mt-0.5">Choose a template or start blank</p>
              </div>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {REPORT_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleCreateFromTemplate(template.id)}
                  className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                    templateColors[template.color] || templateColors.blue
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {templateIcons[template.icon] || <FileText className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{template.name}</span>
                      <span className="text-xs opacity-70">{template.sections.length} sections</span>
                    </div>
                    <p className="text-sm mt-1 opacity-80 leading-relaxed">{template.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 opacity-50 mt-0.5 flex-shrink-0" />
                </button>
              ))}

              <div className="border-t border-slate-200 pt-3 mt-3">
                <button
                  onClick={handleCreateBlank}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Start with a Blank Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showPreviewId && (() => {
        const report = reports.find(r => r.id === showPreviewId);
        if (!report) return null;
        const sections = parseLegacyNarrative(report.narrative_json);
        return (
          <ReportPreview
            report={report}
            sections={sections}
            projectData={projectData}
            onClose={() => setShowPreviewId(null)}
          />
        );
      })()}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
