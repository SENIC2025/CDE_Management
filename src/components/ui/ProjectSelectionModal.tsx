import { useState, useMemo } from 'react';
import { AlertTriangle, Check, Lock, X } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';

interface ProjectSelectionModalProps {
  /** Maximum number of projects the plan allows */
  maxProjects: number;
  /** Called when user confirms their selection */
  onConfirm: (activeProjectIds: string[]) => void;
  /** Called when user cancels / closes */
  onClose: () => void;
  /** Whether the confirm action is in progress */
  saving?: boolean;
}

/**
 * Modal shown when a downgrade results in more projects than the plan allows.
 * User must select which projects stay active; the rest become read-only.
 *
 * Default: oldest projects pre-selected (matching useProjectReadOnly logic).
 */
export default function ProjectSelectionModal({
  maxProjects,
  onConfirm,
  onClose,
  saving = false,
}: ProjectSelectionModalProps) {
  const { projects } = useProject();

  // Sort by start_date ascending (oldest first) — matches useProjectReadOnly
  const sortedProjects = useMemo(() => {
    return [...projects].sort(
      (a, b) => new Date(a.start_date || '').getTime() - new Date(b.start_date || '').getTime()
    );
  }, [projects]);

  // Pre-select the oldest N projects
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sortedProjects.slice(0, maxProjects).forEach(p => initial.add(p.id));
    return initial;
  });

  const toggleProject = (projectId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        // Only add if under limit
        if (next.size < maxProjects) {
          next.add(projectId);
        }
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
  };

  const lockedCount = projects.length - selectedIds.size;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Select Active Projects
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Your plan allows <span className="font-semibold">{maxProjects}</span> active project{maxProjects > 1 ? 's' : ''}.
                  You currently have <span className="font-semibold">{projects.length}</span>.
                  Select which projects stay active — the rest become read-only.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-md transition flex-shrink-0"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Selection counter */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-sm">
          <span className="text-slate-600">
            <span className={`font-semibold ${selectedIds.size === maxProjects ? 'text-[#1BAE70]' : 'text-amber-600'}`}>
              {selectedIds.size}
            </span>
            {' '}/ {maxProjects} selected
          </span>
          {lockedCount > 0 && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Lock size={12} />
              {lockedCount} will be read-only
            </span>
          )}
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sortedProjects.map((project) => {
            const isSelected = selectedIds.has(project.id);
            const isDisabled = !isSelected && selectedIds.size >= maxProjects;

            return (
              <button
                key={project.id}
                onClick={() => toggleProject(project.id)}
                disabled={isDisabled}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition ${
                  isSelected
                    ? 'border-[#1BAE70] bg-green-50/50 ring-1 ring-[#1BAE70]/30'
                    : isDisabled
                    ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? 'bg-[#1BAE70] text-white'
                    : 'border-2 border-slate-300'
                }`}>
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>

                {/* Project info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm truncate">
                    {project.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    {project.programme_profile && <span>{project.programme_profile}</span>}
                    {project.start_date && (
                      <span>Started {new Date(project.start_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                {!isSelected && !isDisabled && (
                  <span className="text-[10px] text-slate-400 flex-shrink-0">Click to keep active</span>
                )}
                {!isSelected && isDisabled && (
                  <Lock size={14} className="text-slate-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Read-only projects can still be viewed and exported.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#1BAE70] hover:bg-[#06752E] rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Confirm Selection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
