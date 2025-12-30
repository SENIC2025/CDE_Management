import { Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusProps {
  state: SaveState;
  error?: string;
  onRetry?: () => void;
}

export default function SaveStatus({ state, error, onRetry }: SaveStatusProps) {
  if (state === 'idle') return null;

  return (
    <div className="flex items-center space-x-2">
      {state === 'saving' && (
        <>
          <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
          <span className="text-sm text-blue-600">Saving...</span>
        </>
      )}

      {state === 'saved' && (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600">Saved</span>
        </>
      )}

      {state === 'error' && (
        <>
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">{error || 'Failed to save'}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
