import { useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronRight,
  MessageSquare,
  Shield,
  X,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import type { CustomRule } from '../../lib/complianceMetadata';
import type { CustomRuleVerdict } from '../../lib/complianceMetadata';

interface CustomRuleVerificationModalProps {
  customRules: CustomRule[];
  previousVerdicts: CustomRuleVerdict[];
  onComplete: (verdicts: CustomRuleVerdict[]) => void;
  onSkip: () => void;
}

type VerdictValue = 'pass' | 'fail' | 'not-assessed';

interface RuleState {
  verdict: VerdictValue;
  note: string;
  showNote: boolean;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-slate-600'
};

export default function CustomRuleVerificationModal({
  customRules,
  previousVerdicts,
  onComplete,
  onSkip
}: CustomRuleVerificationModalProps) {
  // Initialize state from previous verdicts where available
  const [ruleStates, setRuleStates] = useState<Record<string, RuleState>>(() => {
    const states: Record<string, RuleState> = {};
    customRules.forEach(rule => {
      const prev = previousVerdicts.find(v => v.ruleId === rule.id);
      states[rule.id] = {
        verdict: prev?.verdict || 'not-assessed',
        note: prev?.note || '',
        showNote: false
      };
    });
    return states;
  });

  // Current step (review rules one by one, or all at once)
  const [viewMode, setViewMode] = useState<'list' | 'step'>('list');
  const [currentStep, setCurrentStep] = useState(0);

  function updateState(ruleId: string, updates: Partial<RuleState>) {
    setRuleStates(prev => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], ...updates }
    }));
  }

  const assessedCount = useMemo(
    () => Object.values(ruleStates).filter(s => s.verdict !== 'not-assessed').length,
    [ruleStates]
  );

  const passedCount = useMemo(
    () => Object.values(ruleStates).filter(s => s.verdict === 'pass').length,
    [ruleStates]
  );

  const failedCount = useMemo(
    () => Object.values(ruleStates).filter(s => s.verdict === 'fail').length,
    [ruleStates]
  );

  function handleComplete() {
    const verdicts: CustomRuleVerdict[] = customRules.map(rule => ({
      ruleId: rule.id,
      ruleCode: rule.code,
      ruleTitle: rule.title,
      ruleSeverity: rule.severity,
      module: rule.module,
      verdict: ruleStates[rule.id]?.verdict || 'not-assessed',
      note: ruleStates[rule.id]?.note || '',
      assessedAt: new Date().toISOString()
    }));
    onComplete(verdicts);
  }

  // Step-by-step mode
  const currentRule = viewMode === 'step' ? customRules[currentStep] : null;
  const currentState = currentRule ? ruleStates[currentRule.id] : null;

  function VerdictButton({ ruleId, value, label, icon, color, activeColor }: {
    ruleId: string; value: VerdictValue; label: string;
    icon: React.ReactNode; color: string; activeColor: string;
  }) {
    const isActive = ruleStates[ruleId]?.verdict === value;
    return (
      <button
        onClick={() => updateState(ruleId, { verdict: value })}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
          isActive ? activeColor : color
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Custom Rule Verification</h3>
              <p className="text-sm text-slate-500">
                {customRules.length} custom {customRules.length === 1 ? 'rule' : 'rules'} to assess
              </p>
            </div>
          </div>
          <button onClick={onSkip} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-3 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>{assessedCount} of {customRules.length} assessed</span>
            <div className="flex items-center gap-3">
              {passedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" /> {passedCount} pass
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-3 w-3" /> {failedCount} fail
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${customRules.length > 0 ? (assessedCount / customRules.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* View mode toggle */}
        <div className="px-5 pt-3 flex gap-2 flex-shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Checklist View
          </button>
          <button
            onClick={() => { setViewMode('step'); setCurrentStep(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'step' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Step-by-Step
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {viewMode === 'list' ? (
            /* ─── CHECKLIST VIEW ─── */
            <div className="space-y-3">
              {customRules.map((rule, idx) => {
                const state = ruleStates[rule.id];
                return (
                  <div
                    key={rule.id}
                    className={`rounded-lg border transition-colors ${
                      state.verdict === 'pass'
                        ? 'border-green-200 bg-green-50/50'
                        : state.verdict === 'fail'
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-slate-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Verdict indicator */}
                        <div className="flex-shrink-0 mt-0.5">
                          {state.verdict === 'pass'
                            ? <CheckCircle className="h-5 w-5 text-green-600" />
                            : state.verdict === 'fail'
                              ? <XCircle className="h-5 w-5 text-red-600" />
                              : <HelpCircle className="h-5 w-5 text-slate-300" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Rule info */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-sm font-medium text-slate-900">{rule.code}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${severityColors[rule.severity]}`}>
                              {rule.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                              {rule.module}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-slate-800 mb-0.5">{rule.title}</div>
                          {rule.description && (
                            <div className="text-xs text-slate-500 mb-2">{rule.description}</div>
                          )}
                          {rule.passCriteria && (
                            <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-2 inline-block">
                              Pass criteria: {rule.passCriteria}
                            </div>
                          )}

                          {/* Verdict buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <VerdictButton
                              ruleId={rule.id}
                              value="pass"
                              label="Pass"
                              icon={<CheckCircle className="h-4 w-4" />}
                              color="border-slate-200 text-slate-600 hover:border-green-300 hover:bg-green-50"
                              activeColor="border-green-500 bg-green-100 text-green-800"
                            />
                            <VerdictButton
                              ruleId={rule.id}
                              value="fail"
                              label="Fail"
                              icon={<XCircle className="h-4 w-4" />}
                              color="border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50"
                              activeColor="border-red-500 bg-red-100 text-red-800"
                            />
                            <button
                              onClick={() => updateState(rule.id, { showNote: !state.showNote })}
                              className={`flex items-center gap-1 px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-colors ${
                                state.note
                                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              {state.note ? 'Edit Note' : 'Add Note'}
                            </button>
                          </div>

                          {/* Note field */}
                          {state.showNote && (
                            <textarea
                              value={state.note}
                              onChange={(e) => updateState(rule.id, { note: e.target.value })}
                              placeholder="Optional note — rationale, evidence reference, or observation..."
                              rows={2}
                              className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ─── STEP-BY-STEP VIEW ─── */
            currentRule && currentState && (
              <div className="space-y-4">
                {/* Step indicator */}
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Rule {currentStep + 1} of {customRules.length}</span>
                  <div className="flex gap-1">
                    {customRules.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentStep(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          idx === currentStep
                            ? 'bg-indigo-500'
                            : ruleStates[customRules[idx].id]?.verdict === 'pass'
                              ? 'bg-green-400'
                              : ruleStates[customRules[idx].id]?.verdict === 'fail'
                                ? 'bg-red-400'
                                : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Rule card */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="font-mono text-lg font-bold text-slate-900">{currentRule.code}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityColors[currentRule.severity]}`}>
                      {currentRule.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                      {currentRule.module}
                    </span>
                  </div>

                  <h4 className="text-lg font-semibold text-slate-900 mb-2">{currentRule.title}</h4>

                  {currentRule.description && (
                    <p className="text-sm text-slate-600 mb-3">{currentRule.description}</p>
                  )}

                  {currentRule.passCriteria && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
                      <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-green-800 mb-0.5">Pass Criteria</div>
                        <div className="text-sm text-green-700">{currentRule.passCriteria}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Verdict selection */}
                <div className="text-center space-y-3">
                  <div className="text-sm font-medium text-slate-700">Does this project meet this requirement?</div>
                  <div className="flex items-center justify-center gap-3">
                    <VerdictButton
                      ruleId={currentRule.id}
                      value="pass"
                      label="Yes — Pass"
                      icon={<CheckCircle className="h-5 w-5" />}
                      color="border-slate-200 text-slate-600 hover:border-green-300 hover:bg-green-50"
                      activeColor="border-green-500 bg-green-100 text-green-800"
                    />
                    <VerdictButton
                      ruleId={currentRule.id}
                      value="fail"
                      label="No — Fail"
                      icon={<XCircle className="h-5 w-5" />}
                      color="border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50"
                      activeColor="border-red-500 bg-red-100 text-red-800"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">
                    Note (optional)
                  </label>
                  <textarea
                    value={currentState.note}
                    onChange={(e) => updateState(currentRule.id, { note: e.target.value })}
                    placeholder="Rationale, evidence reference, or observation..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none"
                  />
                </div>

                {/* Step navigation */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  {currentStep < customRules.length - 1 ? (
                    <button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setViewMode('list')}
                      className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Review All
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 flex-shrink-0">
          {/* Unassessed warning */}
          {assessedCount < customRules.length && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {customRules.length - assessedCount} rule{customRules.length - assessedCount !== 1 ? 's' : ''} not yet assessed.
              Unassessed rules will be marked as "Not assessed" and excluded from scoring.
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Skip Custom Rules
            </button>
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              {assessedCount === customRules.length
                ? 'Complete Verification'
                : `Submit (${assessedCount}/${customRules.length} assessed)`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
