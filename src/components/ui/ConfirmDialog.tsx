import { AlertTriangle, Trash2, Info } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Branded confirmation dialog replacing browser confirm().
 * Supports danger (delete), warning, and info variants.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const iconMap = {
    danger: <Trash2 size={22} className="text-red-600" />,
    warning: <AlertTriangle size={22} className="text-amber-600" />,
    info: <Info size={22} className="text-[#1BAE70]" />,
  };

  const iconBgMap = {
    danger: 'bg-red-50',
    warning: 'bg-amber-50',
    info: 'bg-[#1BAE70]/10',
  };

  const confirmBtnMap = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-[#1BAE70] hover:bg-[#06752E] text-white',
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
        <div className="flex gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconBgMap[variant]} flex items-center justify-center`}>
            {iconMap[variant]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-[#14261C]">{title}</h3>
            <p className="mt-1.5 text-sm text-[#4E5652] leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#4E5652] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${confirmBtnMap[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
