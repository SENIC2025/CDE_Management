import { useState } from 'react';
import { X, Search, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import {
  STAKEHOLDER_ARCHETYPES,
  filterByCategory,
  filterByLevel,
  filterByCDE,
  searchByText,
  getCategoryLabel,
  getCategoryColor,
  getEngagementLabel,
  getEngagementColor,
  type StakeholderArchetype,
  type StakeholderCategory,
  type StakeholderLevel,
  type EngagementLevel
} from '../../lib/stakeholderLibrary';

type Priority = 'primary' | 'secondary' | 'observational';

interface StakeholderSetupWizardProps {
  projectId: string;
  onClose: () => void;
  onSave: (data: StakeholderFormData) => Promise<void>;
}

export interface StakeholderFormData {
  name: string;
  role: string;
  level: StakeholderLevel;
  priority_score: number;
  capacity_to_act: string;
  description: string;
}

export default function StakeholderSetupWizard({ projectId, onClose, onSave }: StakeholderSetupWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedArchetype, setSelectedArchetype] = useState<StakeholderArchetype | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<StakeholderCategory | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<StakeholderLevel | 'all'>('all');
  const [cdeFilter, setCdeFilter] = useState<'communication' | 'dissemination' | 'exploitation' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [customization, setCustomization] = useState({
    name: '',
    priority: 'primary' as Priority,
    level: 'national' as StakeholderLevel,
    cde: {
      communication: true,
      dissemination: true,
      exploitation: false
    },
    engagement: 'feedback' as EngagementLevel,
    notes: ''
  });

  const filteredArchetypes = searchByText(
    filterByCDE(
      filterByLevel(
        filterByCategory(STAKEHOLDER_ARCHETYPES, categoryFilter),
        levelFilter
      ),
      cdeFilter
    ),
    searchTerm
  );

  const handleSelectArchetype = (archetype: StakeholderArchetype) => {
    setSelectedArchetype(archetype);
    setIsCustom(false);
    setCustomization({
      name: archetype.title,
      priority: 'primary',
      level: archetype.defaultLevel,
      cde: archetype.defaultCDE,
      engagement: archetype.suggestedEngagement,
      notes: ''
    });
    setStep(2);
  };

  const handleSelectCustom = () => {
    setSelectedArchetype(null);
    setIsCustom(true);
    setCustomization({
      name: '',
      priority: 'primary',
      level: 'national',
      cde: { communication: true, dissemination: false, exploitation: false },
      engagement: 'awareness',
      notes: ''
    });
    setStep(2);
  };

  const getPriorityScore = (priority: Priority): number => {
    return { primary: 10, secondary: 7, observational: 4 }[priority];
  };

  const handleSave = async () => {
    if (!customization.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const metadataJSON = JSON.stringify({
        cde: customization.cde,
        engagement: customization.engagement,
        libraryCode: selectedArchetype?.code || null
      });

      const formData: StakeholderFormData = {
        name: customization.name,
        role: selectedArchetype?.category || 'custom',
        level: customization.level,
        priority_score: getPriorityScore(customization.priority),
        capacity_to_act: `[METADATA]${metadataJSON}`,
        description: customization.notes || (selectedArchetype?.description || '')
      };

      await onSave(formData);
      onClose();
    } catch (err: any) {
      console.error('[Stakeholders] Error creating stakeholder:', err);
      setError(err?.message || 'Failed to create stakeholder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {step === 1 ? 'Choose Stakeholder Type' : 'Customize Stakeholder'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {step === 1 ? 'Select from library or create custom' : 'Configure priority and engagement'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search stakeholders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="policy">Policy</option>
                  <option value="market">Market</option>
                  <option value="research">Research</option>
                  <option value="society">Society</option>
                  <option value="media">Media</option>
                  <option value="funders">Funders</option>
                </select>

                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="EU">EU</option>
                  <option value="national">National</option>
                  <option value="regional">Regional</option>
                  <option value="local">Local</option>
                </select>

                <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">C/D/E:</span>
                  <button
                    onClick={() => setCdeFilter(cdeFilter === 'communication' ? null : 'communication')}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      cdeFilter === 'communication'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    C
                  </button>
                  <button
                    onClick={() => setCdeFilter(cdeFilter === 'dissemination' ? null : 'dissemination')}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      cdeFilter === 'dissemination'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    D
                  </button>
                  <button
                    onClick={() => setCdeFilter(cdeFilter === 'exploitation' ? null : 'exploitation')}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      cdeFilter === 'exploitation'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    E
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={handleSelectCustom}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="font-semibold text-gray-900 mb-2">Custom Stakeholder</div>
                  <div className="text-sm text-gray-600">Create a stakeholder from scratch</div>
                </button>

                {filteredArchetypes.map((archetype) => (
                  <button
                    key={archetype.code}
                    onClick={() => handleSelectArchetype(archetype)}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-gray-900 text-sm">{archetype.title}</div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(archetype.category)}`}>
                        {getCategoryLabel(archetype.category)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-3">{archetype.description}</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">{archetype.defaultLevel}</span>
                      {archetype.defaultCDE.communication && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">C</span>}
                      {archetype.defaultCDE.dissemination && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">D</span>}
                      {archetype.defaultCDE.exploitation && <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">E</span>}
                    </div>
                  </button>
                ))}
              </div>

              {filteredArchetypes.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No stakeholders match your filters</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {selectedArchetype && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Check className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">{selectedArchetype.title}</div>
                      <div className="text-sm text-blue-700">{selectedArchetype.description}</div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customization.name}
                  onChange={(e) => setCustomization({ ...customization, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., EU Commission DG Research"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={customization.priority}
                    onChange={(e) => setCustomization({ ...customization, priority: e.target.value as Priority })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="observational">Observational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select
                    value={customization.level}
                    onChange={(e) => setCustomization({ ...customization, level: e.target.value as StakeholderLevel })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EU">EU</option>
                    <option value="national">National</option>
                    <option value="regional">Regional</option>
                    <option value="local">Local</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">C/D/E Role</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.cde.communication}
                      onChange={(e) => setCustomization({
                        ...customization,
                        cde: { ...customization.cde, communication: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Communication</div>
                      <div className="text-xs text-gray-600">Raise visibility and awareness</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.cde.dissemination}
                      onChange={(e) => setCustomization({
                        ...customization,
                        cde: { ...customization.cde, dissemination: e.target.checked }
                      })}
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Dissemination</div>
                      <div className="text-xs text-gray-600">Transfer knowledge and build capacity</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.cde.exploitation}
                      onChange={(e) => setCustomization({
                        ...customization,
                        cde: { ...customization.cde, exploitation: e.target.checked }
                      })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Exploitation</div>
                      <div className="text-xs text-gray-600">Drive uptake and sustainability</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Engagement</label>
                <select
                  value={customization.engagement}
                  onChange={(e) => setCustomization({ ...customization, engagement: e.target.value as EngagementLevel })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="awareness">Awareness only</option>
                  <option value="feedback">Feedback</option>
                  <option value="co_creation">Co-creation</option>
                  <option value="uptake">Uptake/adoption</option>
                  <option value="policy_reference">Policy reference</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getEngagementLabel(customization.engagement)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={customization.notes}
                  onChange={(e) => setCustomization({ ...customization, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any specific notes or context..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          {step === 2 && (
            <button
              onClick={handleSave}
              disabled={saving || !customization.name.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{saving ? 'Creating...' : 'Create Stakeholder'}</span>
              {!saving && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
