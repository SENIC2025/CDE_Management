import { useState } from 'react';
import {
  Download,
  FileText,
  Table,
  Package,
  Globe,
  CheckCircle,
  Loader2,
  FileDown,
  Printer
} from 'lucide-react';
import type { ReportSection } from '../../lib/reportTemplates';

interface ExportHubProps {
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
  onExportBundle?: () => Promise<void>;
  bundleExporting?: boolean;
  canExportBundle?: boolean;
}

type ExportFormat = 'html' | 'csv-evidence' | 'print' | 'bundle';

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'html',
    label: 'HTML Report',
    description: 'Formatted report with data tables, narrative sections, and print-friendly styling. Opens in any browser.',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'csv-evidence',
    label: 'Evidence Index (CSV)',
    description: 'Spreadsheet of all evidence items linked to this report\'s activities, ready for auditors.',
    icon: <Table className="h-5 w-5" />,
    color: 'text-green-600 bg-green-50 border-green-200'
  },
  {
    id: 'print',
    label: 'Print / PDF',
    description: 'Opens a clean print-ready version. Use your browser\'s Print dialog to save as PDF.',
    icon: <Printer className="h-5 w-5" />,
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  {
    id: 'bundle',
    label: 'Full Project Bundle',
    description: 'Complete project export with all data, evidence index, compliance summary, and decision-support flags.',
    icon: <Package className="h-5 w-5" />,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  }
];

export default function ExportHub({
  report,
  sections,
  projectData,
  onExportBundle,
  bundleExporting,
  canExportBundle = true
}: ExportHubProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [lastExported, setLastExported] = useState<ExportFormat | null>(null);

  function buildDataTable(label: string, headers: string[], rows: string[][]): string {
    if (rows.length === 0) return `<p class="empty-note">No ${label.toLowerCase()} data available.</p>`;
    return `
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    `;
  }

  function renderSectionData(section: ReportSection): string {
    switch (section.type) {
      case 'data-objectives':
        return buildDataTable('Objectives',
          ['Title', 'Domain', 'Status'],
          projectData.objectives.map(o => [o.title, o.domain || '—', o.status || '—'])
        );
      case 'data-stakeholders':
        return buildDataTable('Stakeholders',
          ['Name', 'Role', 'Priority'],
          projectData.stakeholders.map(s => [s.name, s.role || '—', s.priority_score ? `${s.priority_score}/10` : '—'])
        );
      case 'data-activities':
        return buildDataTable('Activities',
          ['Title', 'Domain', 'Status', 'Effort (h)', 'Dates'],
          projectData.activities.map(a => [
            a.title, a.domain || '—', a.status || '—',
            a.effort_hours || '—',
            [a.start_date, a.end_date].filter(Boolean).join(' → ') || '—'
          ])
        );
      case 'data-indicators':
        return buildDataTable('Indicators',
          ['Name', 'Unit', 'Baseline', 'Target'],
          projectData.indicators.map(i => [i.name, i.unit || '—', i.baseline ?? '—', i.target ?? '—'])
        );
      case 'data-evidence':
        return buildDataTable('Evidence Items',
          ['Title', 'Type', 'Date', 'Source'],
          projectData.evidence.map(e => [
            e.title || '—', e.evidence_type || '—',
            e.evidence_date || '—', e.source_url || e.file_path || '—'
          ])
        );
      case 'data-compliance':
        return `<div class="compliance-score">
          <strong>Compliance Score:</strong> <span class="score">${projectData.complianceScore > 0 ? projectData.complianceScore + '%' : 'Not checked'}</span>
        </div>`;
      case 'data-exploitation':
        return `<p>${projectData.exploitationCount} exploitation/uptake ${projectData.exploitationCount === 1 ? 'opportunity' : 'opportunities'} recorded.</p>`;
      case 'data-channels':
        return buildDataTable('Channels',
          ['Name', 'Type', 'Cost Type'],
          projectData.channels.map(c => [c.name || '—', c.channel_type || '—', c.cost_type || '—'])
        );
      default:
        return '';
    }
  }

  function generateReportHtml(): string {
    const sectionHtml = sections.map(section => {
      const dataHtml = section.type !== 'narrative' ? renderSectionData(section) : '';
      const narrativeHtml = section.content
        ? `<div class="narrative">${section.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}</div>`
        : '';

      return `
        <div class="section">
          <h2>${section.title}</h2>
          ${dataHtml}
          ${narrativeHtml}
        </div>
      `;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px; margin: 0 auto; padding: 40px 20px;
      line-height: 1.7; color: #1e293b;
    }
    h1 {
      font-size: 28px; color: #0f172a;
      border-bottom: 3px solid #1BAE70; padding-bottom: 12px; margin-bottom: 20px;
    }
    h2 {
      font-size: 20px; color: #334155;
      margin-top: 36px; margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;
    }
    .meta {
      background: #f8fafc; border: 1px solid #e2e8f0;
      padding: 16px 20px; border-radius: 8px; margin: 20px 0;
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;
    }
    .meta-item { font-size: 14px; }
    .meta-item strong { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 2px; }
    .section { margin: 24px 0; }
    .narrative p { margin: 8px 0; font-size: 15px; color: #334155; }
    table {
      width: 100%; border-collapse: collapse; margin: 16px 0;
      font-size: 13px;
    }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; }
    tr:nth-child(even) { background: #f8fafc; }
    .compliance-score { padding: 12px 16px; background: #f2faf6; border-left: 4px solid #1BAE70; border-radius: 4px; }
    .compliance-score .score { font-size: 24px; font-weight: 700; color: #06752E; }
    .empty-note { font-size: 13px; color: #94a3b8; font-style: italic; padding: 8px 0; }
    .footer {
      margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0;
      font-size: 12px; color: #94a3b8; text-align: center;
    }
    @media print {
      body { padding: 0; max-width: none; }
      .section { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="meta">
    <div class="meta-item"><strong>Period</strong>${report.reporting_period}</div>
    <div class="meta-item"><strong>Status</strong>${report.status}</div>
    <div class="meta-item"><strong>Generated</strong>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div class="meta-item"><strong>Created</strong>${new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
  </div>
  ${report.description ? `<p style="font-size:15px;color:#475569;margin:16px 0;">${report.description}</p>` : ''}
  ${sectionHtml}
  <div class="footer">
    <p>Generated by CDE Manager • ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
  }

  function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateEvidenceCsv(): string {
    const headers = ['Title', 'Type', 'Date', 'Source', 'File Path'];
    const rows = projectData.evidence.map(e => [
      e.title || '', e.evidence_type || '', e.evidence_date || '',
      e.source_url || '', e.file_path || ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    return csvContent;
  }

  async function handleExport(format: ExportFormat) {
    if (format === 'bundle') {
      if (onExportBundle) await onExportBundle();
      return;
    }

    setExporting(format);
    try {
      const slug = report.title.replace(/\s+/g, '_').replace(/[^\w-]/g, '');

      switch (format) {
        case 'html': {
          const html = generateReportHtml();
          downloadFile(`${slug}_${report.reporting_period}.html`, html, 'text/html');
          break;
        }
        case 'csv-evidence': {
          const csv = generateEvidenceCsv();
          downloadFile(`${slug}_evidence_index.csv`, csv, 'text/csv');
          break;
        }
        case 'print': {
          const html = generateReportHtml();
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
          }
          break;
        }
      }
      setLastExported(format);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-700 mb-1">Export Options</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPORT_OPTIONS.map(option => {
          const isExporting = exporting === option.id || (option.id === 'bundle' && bundleExporting);
          const wasExported = lastExported === option.id;
          const isDisabled = option.id === 'bundle' && !canExportBundle;

          return (
            <button
              key={option.id}
              onClick={() => handleExport(option.id)}
              disabled={!!isExporting || isDisabled}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${option.color}`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isExporting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : wasExported ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  option.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{option.label}</span>
                  {wasExported && <span className="text-[10px] text-green-600 font-medium">Exported</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{option.description}</p>
              </div>
              <FileDown className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
