import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { strategyService, type CDEStrategy } from '../lib/strategyService';
import { useProject } from '../contexts/ProjectContext';
import TemplateSelectionStep from './strategy/TemplateSelectionStep';
import StrategySummaryStep from './strategy/StrategySummaryStep';

interface StrategyBuilderProps {
  onClose?: () => void;
}

type SaveStatus = 'saved' | 'saving' | 'failed' | 'idle';

export default function StrategyBuilder({ onClose }: StrategyBuilderProps) {
  const { currentProject } = useProject();
  const [currentStep, setCurrentStep] = useState(1);
  const [strategy, setStrategy] = useState<CDEStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [pendingSave, setPendingSave] = useState(false);

  useEffect(() => {
    if (!currentProject?.id) return;

    const loadStrategy = async () => {
      try {
        setLoading(true);
        const data = await strategyService.getOrCreateStrategy(currentProject.id);
        setStrategy(data);
      } catch (err) {
        console.error('Error loading strategy:', err);
        setError('Failed to load strategy');
      } finally {
        setLoading(false);
      }
    };

    loadStrategy();
  }, [currentProject?.id]);

  const debouncedSave = useCallback((updates: Partial<CDEStrategy>) => {
    if (!strategy) return;

    setPendingSave(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const updated = await strategyService.updateStrategy(strategy.strategy_id, updates);
        setStrategy(updated);
        setSaveStatus('saved');
        setLastSaved(new Date());
        setPendingSave(false);

        setTimeout(() => {
          if (!pendingSave) {
            setSaveStatus('idle');
          }
        }, 2000);
      } catch (err) {
        console.error('Error saving strategy:', err);
        setSaveStatus('failed');
        setPendingSave(false);
      }
    }, 1000);
  }, [strategy, pendingSave]);

  const updateStrategyField = useCallback((field: keyof CDEStrategy, value: any) => {
    if (!strategy) return;

    setStrategy(prev => prev ? { ...prev, [field]: value } : null);
    debouncedSave({ [field]: value });
  }, [strategy, debouncedSave]);

  const steps = [
    { number: 1, name: 'Template', description: 'Choose starting point' },
    { number: 2, name: 'Focus', description: 'Strategic direction' },
    { number: 3, name: 'Objectives', description: 'Goals and outcomes' },
    { number: 4, name: 'Channels', description: 'Communication mix' },
    { number: 5, name: 'KPIs', description: 'Measurement framework' },
    { number: 6, name: 'Roles', description: 'Team and approval' },
    { number: 7, name: 'Summary', description: 'Review and export' }
  ];

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'saved':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return `Saved ${lastSaved?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      case 'failed':
        return 'Save failed - Retry';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg min-h-screen flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CDE Strategy Builder</h1>
          <p className="text-blue-100 text-sm mt-1">
            Project: {currentProject?.name}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-lg">
            {getSaveStatusIcon()}
            <span className="text-sm">{getSaveStatusText()}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              strategy?.status === 'approved'
                ? 'bg-green-500'
                : strategy?.status === 'ready_for_review'
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}>
              {strategy?.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-6">
          <div className="space-y-2">
            {steps.map((step) => (
              <button
                key={step.number}
                onClick={() => setCurrentStep(step.number)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  currentStep === step.number
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep === step.number
                      ? 'border-white bg-blue-700'
                      : 'border-gray-300 bg-gray-50'
                  }`}>
                    <span className="text-sm font-bold">{step.number}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{step.name}</div>
                    <div className={`text-xs ${
                      currentStep === step.number ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2 text-sm">Why this matters</h3>
            <p className="text-xs text-blue-700">
              {currentStep === 1 && 'Templates provide a proven structure aligned with your programme requirements.'}
              {currentStep === 2 && 'Clear strategic focus ensures all activities serve your core objectives.'}
              {currentStep === 3 && 'Well-defined objectives guide decision-making and resource allocation.'}
              {currentStep === 4 && 'The right channel mix maximizes reach and engagement efficiency.'}
              {currentStep === 5 && 'KPIs enable evidence-based monitoring and demonstrate impact.'}
              {currentStep === 6 && 'Clear roles ensure accountability and smooth approval processes.'}
              {currentStep === 7 && 'Your strategy summary communicates the plan to stakeholders.'}
            </p>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {currentStep === 1 && strategy && currentProject && (
              <TemplateSelectionStep
                strategy={strategy}
                projectId={currentProject.id}
                onUpdate={async () => {
                  const updated = await strategyService.getOrCreateStrategy(currentProject.id);
                  setStrategy(updated);
                }}
              />
            )}
            {currentStep === 2 && strategy && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Strategic Focus</h2>
                <p className="text-gray-600 mb-6">Define the strategic emphasis and target audiences for your CDE strategy.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-blue-800">This step will be fully implemented in the next phase.</p>
                  <p className="text-sm text-blue-700 mt-2">Your template has already set initial focus areas based on best practices.</p>
                </div>
              </div>
            )}
            {currentStep === 3 && strategy && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Objectives Mapping</h2>
                <p className="text-gray-600 mb-6">Review and refine the strategic objectives for your project.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-blue-800">This step will be fully implemented in the next phase.</p>
                  <p className="text-sm text-blue-700 mt-2">Your template has created initial objectives. You can refine them later.</p>
                </div>
              </div>
            )}
            {currentStep === 4 && strategy && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Channel Plan & Cadence</h2>
                <p className="text-gray-600 mb-6">Configure your communication channel mix and activity frequency.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-blue-800">This step will be fully implemented in the next phase.</p>
                  <p className="text-sm text-blue-700 mt-2">Your template has set initial channel plans with recommended intensities.</p>
                </div>
              </div>
            )}
            {currentStep === 5 && strategy && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">KPIs & Measurement</h2>
                <p className="text-gray-600 mb-6">Apply the recommended KPI bundle or customize your measurement framework.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-blue-800">This step will be fully implemented in the next phase.</p>
                  <p className="text-sm text-blue-700 mt-2">Your template recommends a specific KPI bundle. You can apply it from the Monitoring page.</p>
                </div>
              </div>
            )}
            {currentStep === 6 && strategy && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Roles & Approvals</h2>
                <p className="text-gray-600 mb-6">Assign roles and configure approval processes for your strategy.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-blue-800">This step will be fully implemented in the next phase.</p>
                  <p className="text-sm text-blue-700 mt-2">Strategy roles and approval workflows are managed in Project Settings.</p>
                </div>
              </div>
            )}
            {currentStep === 7 && strategy && currentProject && (
              <StrategySummaryStep
                strategyId={strategy.strategy_id}
                projectId={currentProject.id}
              />
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(prev => Math.min(7, prev + 1))}
                disabled={currentStep === 7}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === 7 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
