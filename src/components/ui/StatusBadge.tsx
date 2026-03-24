interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

/**
 * Unified status badge used throughout CDE Manager.
 * Maps common status strings to consistent colors.
 */

const STATUS_MAP: Record<string, { bg: string; text: string; label?: string }> = {
  // Lifecycle
  draft: { bg: 'bg-slate-100', text: 'text-slate-600' },
  active: { bg: 'bg-[#1BAE70]/10', text: 'text-[#06752E]' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700' },
  in_review: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'In Review' },
  review: { bg: 'bg-amber-50', text: 'text-amber-700' },
  published: { bg: 'bg-[#1BAE70]/10', text: 'text-[#06752E]' },
  approved: { bg: 'bg-[#1BAE70]/10', text: 'text-[#06752E]' },
  completed: { bg: 'bg-[#1BAE70]/10', text: 'text-[#06752E]' },
  submitted: { bg: 'bg-[#1BAE70]/10', text: 'text-[#06752E]' },

  // Risk / compliance
  pass: { bg: 'bg-[#1BAE70]/10', text: 'text-[#06752E]' },
  fail: { bg: 'bg-red-50', text: 'text-red-700' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700' },
  at_risk: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'At Risk' },
  on_track: { bg: 'bg-[#1BAE70]/10', text: 'text-[#06752E]', label: 'On Track' },

  // Priority
  high: { bg: 'bg-red-50', text: 'text-red-700' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700' },
  low: { bg: 'bg-slate-100', text: 'text-slate-600' },

  // Misc
  open: { bg: 'bg-red-50', text: 'text-red-700' },
  acknowledged: { bg: 'bg-amber-50', text: 'text-amber-700' },
  resolved: { bg: 'bg-[#1BAE70]/10', text: 'text-[#06752E]' },
  pending: { bg: 'bg-slate-100', text: 'text-slate-600' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-500' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const key = status?.toLowerCase().replace(/[\s-]/g, '_') || 'draft';
  const style = STATUS_MAP[key] || { bg: 'bg-slate-100', text: 'text-slate-600' };
  const label = style.label || status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

  const sizeClass = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${style.bg} ${style.text} ${sizeClass}`}>
      {label}
    </span>
  );
}
