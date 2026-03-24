import { useState } from 'react';
import {
  X,
  Eye,
  Copy,
  CheckCircle,
  AlertTriangle,
  Target,
  Users,
  BarChart3,
  Zap,
  FileText,
  Loader2,
  Clock
} from 'lucide-react';
import { TEMPLATE_FIELDS } from '../../lib/knowledgeData';
import type { TemplateApplication } from '../../lib/knowledgeData';

interface TemplatePreviewModalProps {
  template: {
    id: string;
    name: string;
    category: string;
    description: string;
    content_json: string;
    is_global: boolean;
    created_at: string;
  };
  previousApplications: TemplateApplication[];
  onApply: () => Promise<void>;
  onClose: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  objective: <Target className="h-5 w-5 text-blue-500" />,
  stakeholder: <Users className="h-5 w-5 text-green-500" />,
  activity: <BarChart3 className="h-5 w-5 text-orange-500" />,
  indicator: <BarChart3 className="h-5 w-5 text-cyan-500" />,
  message: <FileText className="h-5 w-5 text-purple-500" />,
  channel: <Zap className="h-5 w-5 text-yellow-500" />
};

const categoryLabels: Record<string, string> = {
  objective: 'objectives',
  stakeholder: 'stakeholders',
  activity: 'activities',
  indicator: 'indicators',
  message: 'messages',
  channel: 'channels'
};

export default function TemplatePreviewModal({
  template,
  previousApplications,
  onApply,
  onClose
}: TemplatePreviewModalProps) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  let items: Record<string, any>[] = [];
  let parseError = false;

  try {
    const parsed = JSON.parse(template.content_json);
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    parseError = true;
  }

  const fields = TEMPLATE_FIELDS[template.category] || [];
  const wasAppliedBefore = previousApplications.length > 0;
  const lastApplication = previousApplications[0];

  async function handleApply() {
    setApplying(true);
    try {
      await onApply();
      setApplied(true);
    } catch {
      alert('Failed to apply template. Please try again.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Template Preview</h2>
              <p className="text-xs text-slate-500">Review what this template will create</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Template Info */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {categoryIcons[template.category] || <FileText className="h-5 w-5 text-slate-400" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-900">{template.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                  {template.category}
                </span>
                {template.is_global && (
                  <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                    Global
                  </span>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-slate-600 mt-1">{template.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Previously Applied Warning */}
        {wasAppliedBefore && !applied && (
          <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-amber-800">Already applied</span>
              <span className="text-amber-700">
                {' — '}This template was applied on{' '}
                {new Date(lastApplication.appliedAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
                {' '}({lastApplication.itemsCreated} {categoryLabels[template.category] || 'items'} created).
                Applying again will create duplicates.
              </span>
            </div>
          </div>
        )}

        {/* Items Preview */}
        <div className="p-5">
          {parseError ? (
            <div className="text-center py-8 text-red-500 text-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Could not parse template content. The JSON may be malformed.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              This template has no items.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">
                  Will create {items.length} {categoryLabels[template.category] || 'items'}:
                </span>
              </div>

              {fields.length > 0 ? (
                /* Structured Preview */
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const titleField = fields.find(f => f.key === 'title' || f.key === 'name');
                    const title = titleField ? item[titleField.key] : `Item ${index + 1}`;

                    return (
                      <div key={index} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-slate-400 font-mono">{index + 1}.</span>
                          <span className="text-sm font-semibold text-slate-800">{title || `Untitled ${template.category}`}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {fields.filter(f => f.key !== (titleField?.key)).map(field => {
                            const val = item[field.key];
                            if (!val && val !== 0) return null;
                            return (
                              <div key={field.key} className="text-xs">
                                <span className="text-slate-400 block">{field.label}</span>
                                <span className="text-slate-700 font-medium">
                                  {field.type === 'select'
                                    ? field.options?.find(o => o.value === val)?.label || val
                                    : String(val)
                                  }
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Raw JSON Preview */
                <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-x-auto border border-slate-200 max-h-64">
                  {JSON.stringify(items, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-slate-200 flex items-center justify-between sticky bottom-0 bg-white rounded-b-xl">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Created {new Date(template.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {applied ? 'Close' : 'Cancel'}
            </button>
            {applied ? (
              <div className="flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Applied Successfully
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying || items.length === 0 || parseError}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {applying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Applying...</>
                ) : (
                  <><Copy className="h-4 w-4" /> Apply to Project ({items.length} {categoryLabels[template.category] || 'items'})</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
