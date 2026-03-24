import { useState, useCallback } from 'react';
import { Link2, Check } from 'lucide-react';

interface CopyLinkButtonProps {
  /** The item ID to generate a link for */
  itemId: string;
  /** Function from useDeepLink that copies the link */
  onCopy: (itemId: string) => Promise<boolean>;
  /** Optional label, defaults to "Copy Link" */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional class names */
  className?: string;
}

/**
 * CopyLinkButton — A small button that copies the deep link URL for an item.
 * Shows a checkmark briefly after copying. Used in edit panels and card menus.
 */
export default function CopyLinkButton({
  itemId,
  onCopy,
  label = 'Copy Link',
  size = 'sm',
  className = '',
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await onCopy(itemId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [itemId, onCopy]);

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs gap-1.5'
    : 'px-3 py-2 text-sm gap-2';

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center font-medium rounded-md transition-all duration-200 ${
        copied
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-800'
      } ${sizeClasses} ${className}`}
      title={copied ? 'Copied!' : `Copy shareable link`}
    >
      {copied ? (
        <>
          <Check size={size === 'sm' ? 13 : 15} />
          Copied!
        </>
      ) : (
        <>
          <Link2 size={size === 'sm' ? 13 : 15} />
          {label}
        </>
      )}
    </button>
  );
}
