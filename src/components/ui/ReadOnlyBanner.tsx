import { Lock, ArrowUpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReadOnlyBannerProps {
  reason: string;
}

/**
 * Banner shown at the top of pages when the current project is read-only
 * due to plan limits (downgrade, exceeded project count).
 */
export default function ReadOnlyBanner({ reason }: ReadOnlyBannerProps) {
  return (
    <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <Lock size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">Read-Only Project</p>
        <p className="text-xs text-amber-700 mt-0.5">{reason}</p>
        <p className="text-xs text-amber-600 mt-1">You can still view and export data, but editing is locked.</p>
      </div>
      <Link
        to="/plans"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1BAE70] text-white text-xs font-medium rounded-lg hover:bg-[#06752E] transition-colors flex-shrink-0"
      >
        <ArrowUpCircle size={14} />
        Upgrade
      </Link>
    </div>
  );
}
