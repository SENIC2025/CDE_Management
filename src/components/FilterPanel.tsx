import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface FilterPanelProps {
  children: ReactNode;
  onClear?: () => void;
}

export default function FilterPanel({ children, onClear }: FilterPanelProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-slate-900 text-sm">Filters</h3>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <X size={14} />
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {children}
      </div>
    </div>
  );
}
