import { useState } from 'react';
import {
  Edit, Trash2, CheckCircle, ChevronDown, Package, FileText, Code, Database,
  FlaskConical, GraduationCap, Lock, Unlock, ShoppingCart, Target, User,
  Search, ArrowRight, Archive, Lightbulb
} from 'lucide-react';

export interface ResultAsset {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: string;
  maturity_level: string;
  access_modality: string;
  exploitation_status: string;
  responsible_partner: string | null;
  linked_objective_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AssetCardProps {
  asset: ResultAsset;
  objectiveTitles: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onViewEvidence: () => void;
  onExploitationChange: (newStatus: string) => void;
}

const MATURITY_STEPS = [
  { value: 'concept', label: 'Concept' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'tested', label: 'Tested' },
  { value: 'mature', label: 'Mature' },
];

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  publication: { label: 'Publication', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
  software: { label: 'Software', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: Code },
  dataset: { label: 'Dataset', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Database },
  method: { label: 'Method', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: FlaskConical },
  training: { label: 'Training', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: GraduationCap },
};

const ACCESS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  open: { label: 'Open Access', icon: Unlock, color: 'text-green-600' },
  restricted: { label: 'Restricted', icon: Lock, color: 'text-amber-600' },
  commercial: { label: 'Commercial', icon: ShoppingCart, color: 'text-red-600' },
};

const EXPLOITATION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  identified: { label: 'Identified', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Lightbulb },
  under_assessment: { label: 'Under Assessment', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Search },
  being_exploited: { label: 'Being Exploited', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: ArrowRight },
  adopted: { label: 'Adopted', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: Archive },
};

const EXPLOITATION_OPTIONS = [
  { value: 'identified', label: 'Identified' },
  { value: 'under_assessment', label: 'Under Assessment' },
  { value: 'being_exploited', label: 'Being Exploited' },
  { value: 'adopted', label: 'Adopted' },
  { value: 'archived', label: 'Archived' },
];

export default function AssetCard({ asset, objectiveTitles, onEdit, onDelete, onViewEvidence, onExploitationChange }: AssetCardProps) {
  const [showExploitationDropdown, setShowExploitationDropdown] = useState(false);

  const type = asset.type || 'publication';
  const typeConfig = TYPE_CONFIG[type] || TYPE_CONFIG.publication;
  const TypeIcon = typeConfig.icon;
  const maturity = asset.maturity_level || 'concept';
  const access = asset.access_modality || 'open';
  const accessConfig = ACCESS_CONFIG[access] || ACCESS_CONFIG.open;
  const AccessIcon = accessConfig.icon;
  const exploitation = asset.exploitation_status || 'identified';
  const exploitConfig = EXPLOITATION_CONFIG[exploitation] || EXPLOITATION_CONFIG.identified;

  const currentMaturityIndex = MATURITY_STEPS.findIndex(s => s.value === maturity);

  const linkedObjectives = (asset.linked_objective_ids || [])
    .map(id => objectiveTitles[id])
    .filter(Boolean);

  const handleExploitationChange = (newStatus: string) => {
    setShowExploitationDropdown(false);
    if (newStatus !== exploitation) {
      onExploitationChange(newStatus);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
      {/* Maturity Progress */}
      <div className="flex items-center mb-4">
        <span className="text-xs font-medium text-gray-500 mr-3 flex-shrink-0">Maturity:</span>
        <div className="flex items-center gap-1 flex-1">
          {MATURITY_STEPS.map((step, idx) => {
            const isActive = idx <= currentMaturityIndex;
            const isCurrent = idx === currentMaturityIndex;
            return (
              <div key={step.value} className="flex items-center flex-1">
                <div className="flex items-center flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                        : isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isActive && idx < currentMaturityIndex ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className={`ml-1.5 text-xs hidden sm:inline ${
                    isCurrent ? 'font-semibold text-emerald-700' : isActive ? 'text-emerald-600' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < MATURITY_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 rounded ${
                    idx < currentMaturityIndex ? 'bg-emerald-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <TypeIcon className={`w-5 h-5 ${typeConfig.color.includes('blue') ? 'text-blue-500' : typeConfig.color.includes('violet') ? 'text-violet-500' : typeConfig.color.includes('emerald') ? 'text-emerald-500' : typeConfig.color.includes('amber') ? 'text-amber-500' : 'text-pink-500'}`} />
            <h3 className="text-lg font-semibold text-gray-900">{asset.title}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg border bg-gray-50 ${accessConfig.color}`}>
              <AccessIcon className="w-3 h-3" />
              {accessConfig.label}
            </span>
          </div>
          {asset.description && (
            <p className="text-sm text-gray-600 mb-3">{asset.description}</p>
          )}
        </div>

        <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
          {/* Exploitation Status Quick Change */}
          <div className="relative">
            <button
              onClick={() => setShowExploitationDropdown(!showExploitationDropdown)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${exploitConfig.color} hover:opacity-80`}
              title="Change exploitation status"
            >
              <exploitConfig.icon className="w-3 h-3" />
              {exploitConfig.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showExploitationDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExploitationDropdown(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {EXPLOITATION_OPTIONS.map(opt => {
                    const cfg = EXPLOITATION_CONFIG[opt.value];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleExploitationChange(opt.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left ${
                          opt.value === exploitation ? 'bg-blue-50 font-medium' : ''
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                        {opt.value === exploitation && <CheckCircle className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit asset"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete asset"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta row: Owner, Evidence */}
      <div className="flex items-center flex-wrap gap-4 mb-3 text-sm">
        {asset.responsible_partner && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span>{asset.responsible_partner}</span>
          </div>
        )}
        <button
          onClick={onViewEvidence}
          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm"
        >
          <Package className="w-3.5 h-3.5" />
          <span>View Evidence</span>
        </button>
      </div>

      {/* Linked Objectives */}
      {linkedObjectives.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Linked Objectives:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {linkedObjectives.map((title, idx) => (
              <span key={idx} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200">
                {title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {asset.notes && (
        <div className="mb-3 text-sm text-gray-600 bg-gray-50 rounded p-2">
          <span className="text-xs font-medium text-gray-500">Notes: </span>
          {asset.notes}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>Created {new Date(asset.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
