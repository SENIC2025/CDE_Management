import { useState, useCallback } from 'react';
import { Share2, Copy, Check, Clock, Eye, Trash2, X, Loader2, ExternalLink } from 'lucide-react';
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  getShareUrl,
  ENTITY_TYPE_LABELS,
  type ShareLink,
} from '../../lib/shareService';

interface ShareButtonProps {
  entityType: string;
  entityId: string;
  projectId: string;
  entityTitle?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * ShareButton — Creates and manages public share links for any entity.
 * Opens a popover showing existing links and allowing creation of new ones.
 */
export default function ShareButton({
  entityType,
  entityId,
  projectId,
  entityTitle,
  size = 'sm',
  className = '',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<number | null>(30);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    const data = await listShareLinks(entityType, entityId);
    setLinks(data);
    setLoading(false);
  }, [entityType, entityId]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    loadLinks();
  }, [loadLinks]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      await createShareLink({
        entityType,
        entityId,
        projectId,
        expiresInDays: expiryDays,
        label: entityTitle,
      });
      await loadLinks();
    } catch (err) {
      console.error('[ShareButton] Error creating share link:', err);
    } finally {
      setCreating(false);
    }
  }, [entityType, entityId, projectId, expiryDays, entityTitle, loadLinks]);

  const handleCopy = useCallback(async (token: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(getShareUrl(token));
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  }, []);

  const handleRevoke = useCallback(async (linkId: string) => {
    await revokeShareLink(linkId);
    setLinks(prev => prev.filter(l => l.id !== linkId));
  }, []);

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs gap-1.5'
    : 'px-3 py-2 text-sm gap-2';

  const activeLinks = links.filter(l => {
    if (l.revoked_at) return false;
    if (l.expires_at && new Date(l.expires_at) < new Date()) return false;
    return true;
  });

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className={`inline-flex items-center font-medium rounded-md transition-all duration-200
          bg-[#1BAE70]/10 text-[#1BAE70] border border-[#1BAE70]/20 hover:bg-[#1BAE70]/20
          ${sizeClasses} ${className}`}
        title="Create shareable link"
      >
        <Share2 size={size === 'sm' ? 13 : 15} />
        Share
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-gray-900 text-sm">
                  Share {ENTITY_TYPE_LABELS[entityType] || entityType}
                </h4>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
              {entityTitle && (
                <p className="text-xs text-gray-500 truncate">{entityTitle}</p>
              )}
            </div>

            {/* Create new link */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-gray-600">Expires in:</label>
                <select
                  value={expiryDays ?? 'never'}
                  onChange={(e) => setExpiryDays(e.target.value === 'never' ? null : Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-[#1BAE70]"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value="never">Never</option>
                </select>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 bg-[#1BAE70] text-white text-sm font-medium
                  px-3 py-2 rounded-lg hover:bg-[#06752E] disabled:opacity-50 transition-colors"
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ExternalLink size={14} />
                )}
                {creating ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>

            {/* Existing links */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 size={16} className="animate-spin mx-auto text-gray-400" />
                </div>
              ) : activeLinks.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  No active share links yet
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {activeLinks.map(link => (
                    <div key={link.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-gray-500 truncate max-w-[140px]">
                          ...{link.token.slice(-8)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(link.token, link.id)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Copy link"
                          >
                            {copiedId === link.id ? (
                              <Check size={13} className="text-green-600" />
                            ) : (
                              <Copy size={13} className="text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRevoke(link.id)}
                            className="p-1 rounded hover:bg-red-50 transition-colors"
                            title="Revoke link"
                          >
                            <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye size={10} />
                          {link.view_count} views
                        </span>
                        {link.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            Expires {new Date(link.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
