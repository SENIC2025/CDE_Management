import { useState } from 'react';
import { Clock, X, RotateCcw } from 'lucide-react';

interface DraftBannerProps {
  /** Whether draft data was restored */
  wasRestored: boolean;
  /** Timestamp of when the draft was saved */
  lastSaved: number | null;
  /** Called when user wants to discard the draft */
  onDiscard: () => void;
  /** Optional: form key name for display */
  formName?: string;
}

export default function DraftBanner({ wasRestored, lastSaved, onDiscard, formName }: DraftBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!wasRestored || dismissed) return null;

  const timeAgo = lastSaved ? getTimeAgo(lastSaved) : 'previously';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock size={18} className="text-amber-600 flex-shrink-0" />
        <div>
          <span className="text-sm font-medium text-amber-900">
            Draft restored{formName ? ` for ${formName}` : ''}
          </span>
          <span className="text-sm text-amber-700 ml-1">
            — saved {timeAgo}. Continue where you left off.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => {
            onDiscard();
            setDismissed(true);
          }}
          className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 px-2 py-1 rounded hover:bg-amber-100"
        >
          <RotateCcw size={14} />
          Start Fresh
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(timestamp).toLocaleDateString();
}
