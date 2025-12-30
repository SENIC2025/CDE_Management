import { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, Check, X, Clock, AlertCircle } from 'lucide-react';
import {
  getCategoryColor,
  getCategoryLabel,
  getEngagementLabel,
  getEngagementColor,
  type StakeholderLevel,
  type EngagementLevel
} from '../../lib/stakeholderLibrary';

interface StakeholderGroup {
  id: string;
  name: string;
  description: string;
  role: string;
  level: string;
  priority_score: number;
  capacity_to_act?: string;
}

interface StakeholderCardProps {
  stakeholder: StakeholderGroup;
  onUpdate: (id: string, updates: Partial<StakeholderGroup>) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (stakeholder: StakeholderGroup) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export default function StakeholderCard({ stakeholder, onUpdate, onDelete, onEdit }: StakeholderCardProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [localPriority, setLocalPriority] = useState(stakeholder.priority_score);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const metadata = parseMetadata(stakeholder.capacity_to_act);

  useEffect(() => {
    setLocalPriority(stakeholder.priority_score);
  }, [stakeholder.priority_score]);

  const handlePriorityChange = async (newScore: number) => {
    setLocalPriority(newScore);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await onUpdate(stakeholder.id, { priority_score: newScore });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('[Stakeholders] Error updating priority:', err);
        setSaveStatus('failed');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 800);
  };

  const handleCDEToggle = async (field: 'communication' | 'dissemination' | 'exploitation') => {
    try {
      setSaveStatus('saving');
      const newCDE = { ...metadata.cde, [field]: !metadata.cde[field] };
      const newMetadata = JSON.stringify({
        cde: newCDE,
        engagement: metadata.engagement,
        libraryCode: metadata.libraryCode
      });
      await onUpdate(stakeholder.id, { capacity_to_act: `[METADATA]${newMetadata}` });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[Stakeholders] Error updating C/D/E:', err);
      setSaveStatus('failed');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const getPriorityLabel = (score: number): string => {
    if (score >= 9) return 'Primary';
    if (score >= 6) return 'Secondary';
    return 'Observational';
  };

  const getPriorityColor = (score: number): string => {
    if (score >= 9) return 'bg-red-100 text-red-700';
    if (score >= 6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Clock className="w-3 h-3 text-blue-600 animate-spin" />;
      case 'saved':
        return <Check className="w-3 h-3 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">{stakeholder.name}</h3>
          {stakeholder.description && (
            <p className="text-sm text-gray-600 mb-3">{stakeholder.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-4">
          {getSaveStatusIcon()}
          <button
            onClick={() => onEdit(stakeholder)}
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(stakeholder.id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={localPriority}
          onChange={(e) => handlePriorityChange(parseInt(e.target.value))}
          className={`px-2 py-1 text-xs font-medium rounded cursor-pointer border-0 focus:ring-2 focus:ring-blue-500 ${getPriorityColor(localPriority)}`}
        >
          <option value="10">Primary</option>
          <option value="7">Secondary</option>
          <option value="4">Observational</option>
        </select>

        {stakeholder.level && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded font-medium">
            {stakeholder.level}
          </span>
        )}

        {stakeholder.role && stakeholder.role !== 'custom' && (
          <span className={`px-2 py-1 text-xs rounded font-medium ${getCategoryColor(stakeholder.role as any)}`}>
            {getCategoryLabel(stakeholder.role as any)}
          </span>
        )}

        {metadata.libraryCode && (
          <span className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded font-mono">
            {metadata.libraryCode}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">C/D/E:</span>
          <button
            onClick={() => handleCDEToggle('communication')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              metadata.cde.communication
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            C
          </button>
          <button
            onClick={() => handleCDEToggle('dissemination')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              metadata.cde.dissemination
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            D
          </button>
          <button
            onClick={() => handleCDEToggle('exploitation')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              metadata.cde.exploitation
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            E
          </button>
        </div>

        {metadata.engagement && (
          <span className={`px-2 py-1 text-xs rounded font-medium ${getEngagementColor(metadata.engagement)}`}>
            {getEngagementLabel(metadata.engagement)}
          </span>
        )}
      </div>
    </div>
  );
}

function parseMetadata(capacityToAct?: string): {
  cde: { communication: boolean; dissemination: boolean; exploitation: boolean };
  engagement: EngagementLevel | null;
  libraryCode: string | null;
} {
  const defaultValue = {
    cde: { communication: false, dissemination: false, exploitation: false },
    engagement: null,
    libraryCode: null
  };

  if (!capacityToAct || !capacityToAct.startsWith('[METADATA]')) {
    return defaultValue;
  }

  try {
    const jsonString = capacityToAct.substring('[METADATA]'.length);
    const parsed = JSON.parse(jsonString);
    return {
      cde: parsed.cde || defaultValue.cde,
      engagement: parsed.engagement || null,
      libraryCode: parsed.libraryCode || null
    };
  } catch (err) {
    console.error('[Stakeholders] Error parsing metadata:', err);
    return defaultValue;
  }
}
