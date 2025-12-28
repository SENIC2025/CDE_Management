import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { strategyService } from '../../lib/strategyService';

interface StrategySummaryStepProps {
  strategyId: string;
  projectId: string;
}

export default function StrategySummaryStep({ strategyId, projectId }: StrategySummaryStepProps) {
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<{ html: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const result = await strategyService.generateStrategySummary(strategyId, projectId);
      setSummary(result);
    } catch (err) {
      console.error('Error generating summary:', err);
      alert('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHTML = () => {
    if (!summary) return;
    const blob = new Blob([summary.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cde-strategy-summary.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Strategy Summary</h2>
        <p className="text-gray-600">
          Generate and export your strategy summary to share with stakeholders.
        </p>
      </div>

      {!summary ? (
        <div className="text-center py-12">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg font-medium"
          >
            {generating ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-end space-x-3 mb-4">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
            <button
              onClick={handleExportHTML}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              <span>Export HTML</span>
            </button>
          </div>

          <div
            className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm"
            dangerouslySetInnerHTML={{ __html: summary.html }}
          />
        </div>
      )}
    </div>
  );
}
