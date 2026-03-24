import {
  X,
  Target,
  Users,
  BarChart3,
  FileText,
  Shield,
  Package,
  Zap,
  Type,
  Download,
  Printer,
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react';
import type { ReportSection } from '../../lib/reportTemplates';

interface ReportPreviewProps {
  report: {
    id: string;
    title: string;
    reporting_period: string;
    description: string;
    status: string;
    created_at: string;
  };
  sections: ReportSection[];
  projectData: {
    objectives: any[];
    stakeholders: any[];
    activities: any[];
    indicators: any[];
    evidence: any[];
    complianceScore: number;
    exploitationCount: number;
    channels: any[];
  };
  onClose: () => void;
  onExportHtml?: () => void;
}

const sectionIcons: Record<string, React.ReactNode> = {
  'narrative': <Type className="h-4 w-4 text-slate-500" />,
  'data-objectives': <Target className="h-4 w-4 text-blue-500" />,
  'data-stakeholders': <Users className="h-4 w-4 text-green-500" />,
  'data-activities': <BarChart3 className="h-4 w-4 text-orange-500" />,
  'data-indicators': <BarChart3 className="h-4 w-4 text-cyan-500" />,
  'data-evidence': <FileText className="h-4 w-4 text-slate-500" />,
  'data-compliance': <Shield className="h-4 w-4 text-indigo-500" />,
  'data-exploitation': <Package className="h-4 w-4 text-purple-500" />,
  'data-channels': <Zap className="h-4 w-4 text-yellow-500" />
};

export default function ReportPreview({ report, sections, projectData, onClose, onExportHtml }: ReportPreviewProps) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: <Clock className="h-3 w-3" /> },
    review: { label: 'In Review', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
    submitted: { label: 'Submitted', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> }
  };

  const status = statusConfig[report.status] || statusConfig.draft;

  function renderDataTable(type: string) {
    switch (type) {
      case 'data-objectives': {
        if (projectData.objectives.length === 0) return <EmptyData label="objectives" />;
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Title</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Domain</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {projectData.objectives.map((o, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 border border-slate-200">{o.title}</td>
                  <td className="px-3 py-2 border border-slate-200">{o.domain || '—'}</td>
                  <td className="px-3 py-2 border border-slate-200">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      case 'data-stakeholders': {
        if (projectData.stakeholders.length === 0) return <EmptyData label="stakeholders" />;
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Name</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Role</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Priority</th>
              </tr>
            </thead>
            <tbody>
              {projectData.stakeholders.map((s, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 border border-slate-200 font-medium">{s.name}</td>
                  <td className="px-3 py-2 border border-slate-200">{s.role || '—'}</td>
                  <td className="px-3 py-2 border border-slate-200">
                    {s.priority_score ? (
                      <span className="inline-flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          s.priority_score >= 8 ? 'bg-red-400' : s.priority_score >= 5 ? 'bg-amber-400' : 'bg-green-400'
                        }`} />
                        {s.priority_score}/10
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      case 'data-activities': {
        if (projectData.activities.length === 0) return <EmptyData label="activities" />;
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Title</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Domain</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Status</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Effort</th>
              </tr>
            </thead>
            <tbody>
              {projectData.activities.map((a, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 border border-slate-200">{a.title}</td>
                  <td className="px-3 py-2 border border-slate-200">{a.domain || '—'}</td>
                  <td className="px-3 py-2 border border-slate-200">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-3 py-2 border border-slate-200">{a.effort_hours ? `${a.effort_hours}h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      case 'data-indicators': {
        if (projectData.indicators.length === 0) return <EmptyData label="indicators" />;
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Name</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Unit</th>
                <th className="text-right px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Baseline</th>
                <th className="text-right px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Target</th>
              </tr>
            </thead>
            <tbody>
              {projectData.indicators.map((ind, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 border border-slate-200 font-medium">{ind.name}</td>
                  <td className="px-3 py-2 border border-slate-200">{ind.unit || '—'}</td>
                  <td className="px-3 py-2 border border-slate-200 text-right">{ind.baseline ?? '—'}</td>
                  <td className="px-3 py-2 border border-slate-200 text-right font-semibold">{ind.target ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      case 'data-evidence': {
        if (projectData.evidence.length === 0) return <EmptyData label="evidence items" />;
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Title</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Type</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {projectData.evidence.map((e, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 border border-slate-200">{e.title || '—'}</td>
                  <td className="px-3 py-2 border border-slate-200">{e.evidence_type || '—'}</td>
                  <td className="px-3 py-2 border border-slate-200">{e.evidence_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      case 'data-compliance':
        return (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
            <Shield className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-xs text-slate-500 uppercase font-medium">Compliance Score</div>
              <div className={`text-2xl font-bold ${
                projectData.complianceScore >= 80 ? 'text-green-700'
                : projectData.complianceScore >= 50 ? 'text-amber-700'
                : projectData.complianceScore > 0 ? 'text-red-700'
                : 'text-slate-400'
              }`}>
                {projectData.complianceScore > 0 ? `${projectData.complianceScore}%` : 'Not checked'}
              </div>
            </div>
          </div>
        );

      case 'data-exploitation':
        return (
          <div className="px-4 py-3 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-800">
            <strong>{projectData.exploitationCount}</strong> exploitation/uptake {projectData.exploitationCount === 1 ? 'opportunity' : 'opportunities'} recorded.
          </div>
        );

      case 'data-channels': {
        if (projectData.channels.length === 0) return <EmptyData label="channels" />;
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Name</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Type</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600 text-xs uppercase">Cost Type</th>
              </tr>
            </thead>
            <tbody>
              {projectData.channels.map((c, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 border border-slate-200 font-medium">{c.name || '—'}</td>
                  <td className="px-3 py-2 border border-slate-200">{c.channel_type || '—'}</td>
                  <td className="px-3 py-2 border border-slate-200">{c.cost_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900">Report Preview</h2>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onExportHtml && (
              <button
                onClick={onExportHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export HTML
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-8 print:p-0">
          {/* Title & Meta */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">{report.title}</h1>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div>
                <div className="text-[10px] uppercase text-slate-500 font-medium tracking-wide">Period</div>
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {report.reporting_period}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500 font-medium tracking-wide">Status</div>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.icon} {status.label}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500 font-medium tracking-wide">Created</div>
                <div className="text-sm text-slate-700 mt-0.5">
                  {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500 font-medium tracking-wide">Sections</div>
                <div className="text-sm font-semibold text-slate-800 mt-0.5">{sections.length}</div>
              </div>
            </div>
            {report.description && (
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">{report.description}</p>
            )}
          </div>

          {/* Sections */}
          {sections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">This report has no sections yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((section, index) => {
                const isDataSection = section.type !== 'narrative';
                const hasContent = section.content.trim().length > 0;
                const icon = sectionIcons[section.type] || sectionIcons['narrative'];

                return (
                  <div key={section.id} className="group">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-slate-400 font-mono w-5 text-right">{index + 1}.</span>
                      {icon}
                      <h2 className="text-lg font-semibold text-slate-800">{section.title}</h2>
                      {isDataSection && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium uppercase">
                          Auto-populated
                        </span>
                      )}
                    </div>

                    <div className="ml-7">
                      {/* Data table */}
                      {isDataSection && (
                        <div className="mb-3 overflow-x-auto">
                          {renderDataTable(section.type)}
                        </div>
                      )}

                      {/* Narrative content */}
                      {hasContent ? (
                        <div className="prose prose-sm max-w-none text-slate-700">
                          {section.content.split('\n').map((para, pIdx) =>
                            para.trim() ? <p key={pIdx} className="mb-2">{para}</p> : null
                          )}
                        </div>
                      ) : (
                        !isDataSection && (
                          <p className="text-sm text-slate-400 italic">No content written for this section.</p>
                        )
                      )}
                    </div>

                    {index < sections.length - 1 && (
                      <div className="border-b border-slate-100 mt-6" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
            Generated by CDE Manager • {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyData({ label }: { label: string }) {
  return (
    <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-400 italic">
      No {label} data available.
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    planned: 'bg-slate-100 text-slate-600',
    draft: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-600'
  };
  const color = colors[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {status ? status.replace(/_/g, ' ') : '—'}
    </span>
  );
}
