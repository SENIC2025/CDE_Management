import {
  FileText,
  CheckCircle,
  Clock,
  Edit3,
  Shield,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Plus
} from 'lucide-react';

interface ReportDashboardProps {
  reports: any[];
  complianceScore: number;
  lastCheckDate: string | null;
  currentPeriodLabel: string | null;
  onCreateReport: () => void;
  onCreateFromTemplate: () => void;
}

export default function ReportDashboard({
  reports,
  complianceScore,
  lastCheckDate,
  currentPeriodLabel,
  onCreateReport,
  onCreateFromTemplate
}: ReportDashboardProps) {
  const draftCount = reports.filter(r => r.status === 'draft').length;
  const reviewCount = reports.filter(r => r.status === 'review').length;
  const submittedCount = reports.filter(r => r.status === 'submitted').length;
  const totalReports = reports.length;

  const lastSubmitted = reports.find(r => r.status === 'submitted');
  const lastSubmittedDate = lastSubmitted
    ? new Date(lastSubmitted.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const scoreColor = complianceScore >= 80 ? 'text-green-700' : complianceScore >= 50 ? 'text-amber-700' : 'text-red-700';
  const scoreBg = complianceScore >= 80 ? 'bg-green-50 border-green-200' : complianceScore >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <FileText className="h-4 w-4" />
            Total Reports
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalReports}</div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            {draftCount > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{draftCount} draft</span>}
            {reviewCount > 0 && <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">{reviewCount} review</span>}
            {submittedCount > 0 && <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">{submittedCount} submitted</span>}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Calendar className="h-4 w-4" />
            Current Period
          </div>
          <div className="text-lg font-bold text-slate-900">
            {currentPeriodLabel || 'Not set'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {lastSubmittedDate
              ? `Last submitted: ${lastSubmittedDate}`
              : 'No submissions yet'
            }
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${scoreBg}`}>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Shield className="h-4 w-4" />
            Compliance
          </div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {complianceScore > 0 ? `${complianceScore}%` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {lastCheckDate
              ? `Checked: ${new Date(lastCheckDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
              : 'No check run'
            }
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            Report Status
          </div>
          <div className="text-lg font-bold text-slate-900">
            {draftCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <Edit3 className="h-4 w-4 text-slate-500" />
                {draftCount} in draft
              </span>
            ) : reviewCount > 0 ? (
              <span className="flex items-center gap-1.5 text-yellow-700">
                <Clock className="h-4 w-4" />
                {reviewCount} in review
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-green-700">
                <CheckCircle className="h-4 w-4" />
                All submitted
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {totalReports === 0 ? 'Create your first report' : `${submittedCount} of ${totalReports} submitted`}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {totalReports === 0 && (
        <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-6 text-center">
          <FileText className="h-10 w-10 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Get started with your first report</h3>
          <p className="text-sm text-slate-600 mb-4">
            Choose a template to get pre-built sections, or start with a blank report.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onCreateFromTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              From Template
            </button>
            <button
              onClick={onCreateReport}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors"
            >
              Blank Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
