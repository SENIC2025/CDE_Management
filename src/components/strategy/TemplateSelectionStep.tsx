import { useState } from 'react';
import { Check, Eye } from 'lucide-react';
import { STRATEGY_TEMPLATES, type StrategyTemplate } from '../../lib/strategyTemplates';
import { strategyService, type CDEStrategy } from '../../lib/strategyService';

interface TemplateSelectionStepProps {
  strategy: CDEStrategy;
  projectId: string;
  onUpdate: () => void;
}

export default function TemplateSelectionStep({ strategy, projectId, onUpdate }: TemplateSelectionStepProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(strategy.template_code);
  const [previewTemplate, setPreviewTemplate] = useState<StrategyTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  const handleApplyTemplate = async (templateCode: string) => {
    try {
      setApplying(true);
      await strategyService.applyTemplate(projectId, templateCode);
      setSelectedTemplate(templateCode);
      onUpdate();
    } catch (err) {
      console.error('Error applying template:', err);
      alert('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  const getProgrammeBadgeColor = (type: string) => {
    switch (type) {
      case 'horizon':
        return 'bg-blue-100 text-blue-700';
      case 'erasmus':
        return 'bg-purple-100 text-purple-700';
      case 'interreg':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Strategy Template</h2>
        <p className="text-gray-600">
          Start with a proven template aligned with your programme requirements, or build a custom strategy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {STRATEGY_TEMPLATES.map((template) => (
          <div
            key={template.template_code}
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedTemplate === template.template_code
                ? 'border-blue-600 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
            onClick={() => setSelectedTemplate(template.template_code)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              </div>
              {selectedTemplate === template.template_code && (
                <Check className="w-6 h-6 text-blue-600 flex-shrink-0 ml-2" />
              )}
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getProgrammeBadgeColor(template.programme_type)}`}>
                {template.programme_type.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                {template.default_objectives.length} objectives
              </span>
              <span className="text-xs text-gray-500">
                {template.default_channel_mix.length} channels
              </span>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewTemplate(template);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>

              {selectedTemplate === template.template_code && strategy.template_code !== template.template_code && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyTemplate(template.template_code);
                  }}
                  disabled={applying}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? 'Applying...' : 'Apply Template'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {strategy.template_code && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Template applied: {STRATEGY_TEMPLATES.find(t => t.template_code === strategy.template_code)?.name}
            </span>
          </div>
          <p className="text-sm text-green-700 mt-2">
            Your strategy structure has been initialized with objectives, channels, and recommended KPIs.
          </p>
        </div>
      )}

      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{previewTemplate.name}</h3>
                <p className="text-gray-600 mt-1">{previewTemplate.description}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Focus Areas</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><strong>Emphasis:</strong> {previewTemplate.focus_guidance.emphasis.join(', ')}</p>
                  <p className="text-sm"><strong>Key Results:</strong> {previewTemplate.focus_guidance.key_results.join(', ')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Objectives ({previewTemplate.default_objectives.length})</h4>
                <div className="space-y-2">
                  {previewTemplate.default_objectives.map((obj, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{obj.objective_type.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          obj.priority === 'high' ? 'bg-red-100 text-red-700' :
                          obj.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {obj.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{obj.notes}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Channel Mix ({previewTemplate.default_channel_mix.length})</h4>
                <div className="space-y-2">
                  {previewTemplate.default_channel_mix.map((ch, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <span className="font-medium text-sm">{ch.channel_type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          ch.intensity === 'high' ? 'bg-green-100 text-green-700' :
                          ch.intensity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ch.intensity}
                        </span>
                        <span className="text-xs text-gray-600">
                          {ch.frequency_json.per_month ? `${ch.frequency_json.per_month}/mo` : ch.frequency_json.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewTemplate(null);
                  handleApplyTemplate(previewTemplate.template_code);
                }}
                disabled={applying}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply This Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
