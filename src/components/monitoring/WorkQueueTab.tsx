import { AlertCircle, TrendingUp, FileText, PlayCircle } from 'lucide-react';
import { useMemo } from 'react';

interface Indicator {
  id: string;
  name: string;
  unit: string;
  baseline: string;
  target: string;
  locked: boolean;
}

interface IndicatorValue {
  id: string;
  indicator_id: string;
  period: string;
  value: number;
  notes?: string;
}

interface EvidenceLink {
  evidence_item_id: string;
  indicator_id: string;
}

interface WorkQueueTabProps {
  projectId: string;
  selectedPeriod: string;
  indicators: Indicator[];
  indicatorValues: IndicatorValue[];
  evidenceLinks: EvidenceLink[];
  onLogValue: (indicatorId: string) => void;
  onAttachEvidence: (indicatorId: string) => void;
  onViewEvidenceInbox: () => void;
}

export default function WorkQueueTab({
  projectId,
  selectedPeriod,
  indicators,
  indicatorValues,
  evidenceLinks,
  onLogValue,
  onAttachEvidence,
  onViewEvidenceInbox
}: WorkQueueTabProps) {

  const { missingValues, needsEvidence, unlinkedEvidenceCount, lockedIndicatorsNeedingReview } = useMemo(() => {
    const valuesThisPeriod = indicatorValues.filter(v => v.period === selectedPeriod);
    const indicatorIdsWithValues = new Set(valuesThisPeriod.map(v => v.indicator_id));

    const missingValues = indicators.filter(ind => !indicatorIdsWithValues.has(ind.id));

    const valuesThisPeriodIds = valuesThisPeriod.map(v => v.indicator_id);
    const indicatorIdsWithEvidence = new Set(
      evidenceLinks
        .filter(link => valuesThisPeriodIds.includes(link.indicator_id))
        .map(link => link.indicator_id)
    );

    const needsEvidence = valuesThisPeriod
      .filter(v => !indicatorIdsWithEvidence.has(v.indicator_id))
      .map(v => {
        const indicator = indicators.find(ind => ind.id === v.indicator_id);
        return indicator;
      })
      .filter(Boolean) as Indicator[];

    const lockedIndicatorsNeedingReview = indicators.filter(
      ind => ind.locked && !indicatorIdsWithValues.has(ind.id)
    );

    return {
      missingValues,
      needsEvidence,
      unlinkedEvidenceCount: 0,
      lockedIndicatorsNeedingReview
    };
  }, [indicators, indicatorValues, evidenceLinks, selectedPeriod]);

  const totalIssues = missingValues.length + needsEvidence.length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Work Queue</h2>
            <p className="text-sm text-gray-600 mt-1">Period: {selectedPeriod || 'All time'}</p>
          </div>
          {totalIssues > 0 && (
            <button
              onClick={() => missingValues.length > 0 && onLogValue(missingValues[0].id)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Start Logging</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">{missingValues.length}</div>
            <div className="text-sm text-gray-600 mt-1">Missing Values</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-amber-600">{needsEvidence.length}</div>
            <div className="text-sm text-gray-600 mt-1">Missing Evidence</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-gray-400">{lockedIndicatorsNeedingReview.length}</div>
            <div className="text-sm text-gray-600 mt-1">Locked Needs Review</div>
          </div>
        </div>
      </div>

      {missingValues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b bg-red-50">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-gray-900">Missing Indicator Values ({missingValues.length})</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">These indicators have no values for this period</p>
          </div>
          <div className="divide-y">
            {missingValues.slice(0, 10).map(indicator => (
              <div key={indicator.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <TrendingUp className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{indicator.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Unit:</span> {indicator.unit} |
                        <span className="font-medium ml-2">Baseline:</span> {indicator.baseline} |
                        <span className="font-medium ml-2">Target:</span> {indicator.target}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onLogValue(indicator.id)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Log Value
                  </button>
                </div>
              </div>
            ))}
          </div>
          {missingValues.length > 10 && (
            <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
              And {missingValues.length - 10} more...
            </div>
          )}
        </div>
      )}

      {needsEvidence.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b bg-amber-50">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Values Missing Evidence ({needsEvidence.length})</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">Values logged but no evidence attached</p>
          </div>
          <div className="divide-y">
            {needsEvidence.slice(0, 10).map(indicator => (
              <div key={indicator.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <TrendingUp className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{indicator.name}</div>
                      <div className="text-xs text-amber-600 mt-1">Value logged, but missing evidence documentation</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onAttachEvidence(indicator.id)}
                    className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
                  >
                    Attach Evidence
                  </button>
                </div>
              </div>
            ))}
          </div>
          {needsEvidence.length > 10 && (
            <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
              And {needsEvidence.length - 10} more...
            </div>
          )}
        </div>
      )}

      {lockedIndicatorsNeedingReview.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Locked Indicators Needing Review ({lockedIndicatorsNeedingReview.length})</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">Locked indicators missing values for this period</p>
          </div>
          <div className="divide-y">
            {lockedIndicatorsNeedingReview.slice(0, 5).map(indicator => (
              <div key={indicator.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="w-5 h-5 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium text-gray-900">{indicator.name}</div>
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">Locked</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Requires admin action to update</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalIssues === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">
            All indicators for {selectedPeriod || 'this period'} have values and evidence linked.
          </p>
        </div>
      )}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
