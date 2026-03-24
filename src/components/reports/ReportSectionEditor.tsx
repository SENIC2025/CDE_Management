import { useState } from 'react';
import { ConfirmDialog } from '../ui';
import useConfirm from '../../hooks/useConfirm';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Target,
  Users,
  BarChart3,
  FileText,
  Shield,
  Package,
  Zap,
  AlertCircle,
  Type
} from 'lucide-react';
import type { ReportSection } from '../../lib/reportTemplates';

interface ReportSectionEditorProps {
  sections: ReportSection[];
  onChange: (sections: ReportSection[]) => void;
  projectData?: {
    objectivesCount: number;
    stakeholdersCount: number;
    activitiesCount: number;
    indicatorsCount: number;
    evidenceCount: number;
    complianceScore: number;
    exploitationCount: number;
    channelsCount: number;
  };
}

const sectionTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string; dataLabel: string }> = {
  'narrative': { label: 'Narrative', icon: <Type className="h-4 w-4" />, color: 'text-slate-600 bg-slate-100', dataLabel: '' },
  'data-objectives': { label: 'Objectives Data', icon: <Target className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100', dataLabel: 'objectives' },
  'data-stakeholders': { label: 'Stakeholders Data', icon: <Users className="h-4 w-4" />, color: 'text-green-600 bg-green-100', dataLabel: 'stakeholders' },
  'data-activities': { label: 'Activities Data', icon: <BarChart3 className="h-4 w-4" />, color: 'text-orange-600 bg-orange-100', dataLabel: 'activities' },
  'data-indicators': { label: 'Indicators Data', icon: <BarChart3 className="h-4 w-4" />, color: 'text-cyan-600 bg-cyan-100', dataLabel: 'indicators' },
  'data-evidence': { label: 'Evidence Data', icon: <FileText className="h-4 w-4" />, color: 'text-slate-600 bg-slate-100', dataLabel: 'evidence' },
  'data-compliance': { label: 'Compliance Data', icon: <Shield className="h-4 w-4" />, color: 'text-indigo-600 bg-indigo-100', dataLabel: 'compliance' },
  'data-exploitation': { label: 'Exploitation Data', icon: <Package className="h-4 w-4" />, color: 'text-purple-600 bg-purple-100', dataLabel: 'exploitation' },
  'data-channels': { label: 'Channels Data', icon: <Zap className="h-4 w-4" />, color: 'text-yellow-600 bg-yellow-100', dataLabel: 'channels' }
};

export default function ReportSectionEditor({ sections, onChange, projectData }: ReportSectionEditorProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showAddSection, setShowAddSection] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [confirmProps, confirmDialog] = useConfirm();

  function toggleCollapse(sectionId: string) {
    const next = new Set(collapsedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    setCollapsedSections(next);
  }

  function updateSection(index: number, updates: Partial<ReportSection>) {
    const updated = [...sections];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  }

  async function removeSection(index: number) {
    const ok = await confirmDialog({ title: 'Remove section?', message: 'This section will be removed from the report.', variant: 'warning' });
    if (!ok) return;
    const updated = sections.filter((_, i) => i !== index);
    onChange(updated);
  }

  function moveSection(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  }

  function addSection(type: ReportSection['type']) {
    const config = sectionTypeConfig[type];
    const newSection: ReportSection = {
      id: `custom-${Date.now()}`,
      title: type === 'narrative' ? 'New Section' : config.label,
      type,
      content: '',
      placeholder: type === 'narrative'
        ? 'Write your content here...'
        : `Commentary on ${config.dataLabel} data will appear here alongside the auto-populated data table.`,
      required: false
    };
    onChange([...sections, newSection]);
    setShowAddSection(false);
  }

  // Drag handlers
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...sections];
    const [dragged] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, dragged);
    onChange(updated);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function getDataCount(type: string): number | null {
    if (!projectData) return null;
    switch (type) {
      case 'data-objectives': return projectData.objectivesCount;
      case 'data-stakeholders': return projectData.stakeholdersCount;
      case 'data-activities': return projectData.activitiesCount;
      case 'data-indicators': return projectData.indicatorsCount;
      case 'data-evidence': return projectData.evidenceCount;
      case 'data-compliance': return projectData.complianceScore;
      case 'data-exploitation': return projectData.exploitationCount;
      case 'data-channels': return projectData.channelsCount;
      default: return null;
    }
  }

  return (
    <div className="space-y-2">
      {sections.map((section, index) => {
        const config = sectionTypeConfig[section.type] || sectionTypeConfig['narrative'];
        const isCollapsed = collapsedSections.has(section.id);
        const dataCount = getDataCount(section.type);
        const hasContent = section.content.trim().length > 0;
        const isDataSection = section.type !== 'narrative';

        return (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`border rounded-lg transition-all ${
              draggedIndex === index ? 'opacity-50 border-blue-300' : 'border-slate-200'
            } ${!hasContent && section.required ? 'border-l-4 border-l-amber-400' : ''}`}
          >
            {/* Section Header */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-t-lg">
              <div className="cursor-grab text-slate-400 hover:text-slate-600">
                <GripVertical className="h-4 w-4" />
              </div>

              <div className={`h-6 w-6 rounded flex items-center justify-center ${config.color}`}>
                {config.icon}
              </div>

              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSection(index, { title: e.target.value })}
                className="flex-1 text-sm font-semibold text-slate-800 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1"
              />

              {isDataSection && dataCount !== null && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                  {section.type === 'data-compliance' ? `${dataCount}%` : `${dataCount} items`}
                </span>
              )}

              {section.required && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                  Required
                </span>
              )}

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === sections.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleCollapse(section.id)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => removeSection(index)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Section Body */}
            {!isCollapsed && (
              <div className="p-3">
                {isDataSection && (
                  <div className="mb-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700 flex items-center gap-2">
                    {config.icon}
                    This section auto-populates a {config.dataLabel} data table from your project.
                    Add commentary below to appear alongside the data.
                  </div>
                )}

                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(index, { content: e.target.value })}
                  placeholder={section.placeholder}
                  rows={section.content ? Math.min(Math.max(section.content.split('\n').length + 1, 3), 12) : 3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none placeholder:text-slate-400"
                />

                {!hasContent && section.required && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    This section is required and currently empty
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add Section */}
      {showAddSection ? (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
          <div className="text-sm font-medium text-slate-700 mb-2">Add Section</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(sectionTypeConfig).map(([type, config]) => (
              <button
                key={type}
                onClick={() => addSection(type as ReportSection['type'])}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-left text-sm"
              >
                <div className={`h-6 w-6 rounded flex items-center justify-center ${config.color}`}>
                  {config.icon}
                </div>
                <span className="text-slate-700">{config.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddSection(false)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddSection(true)}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </button>
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
