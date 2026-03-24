import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * useDeepLink — Syncs a `?view=<id>` URL param with the editing state on any module page.
 *
 * Level 1 Deep Linking: When the page loads with `?view=abc123`, it finds the item
 * and opens the edit panel automatically. When a user clicks an item, the URL updates.
 * When the panel closes, the URL cleans up.
 *
 * Usage:
 *   const { openItem, closeItem } = useDeepLink({
 *     items: objectives,
 *     onOpen: (item) => setEditingObjective(item),
 *     onClose: () => setEditingObjective(null),
 *     paramName: 'view',   // optional, defaults to 'view'
 *   });
 *
 *   // On card click:     openItem(objective)
 *   // On panel close:    closeItem()
 *   // URL auto-updates:  /objectives?view=abc123
 */

interface UseDeepLinkOptions<T extends { id: string }> {
  /** The loaded items array to search through */
  items: T[];
  /** Called when an item should be opened (from URL or user click) */
  onOpen: (item: T) => void;
  /** Called when the panel should close */
  onClose: () => void;
  /** URL param name, defaults to 'view' */
  paramName?: string;
  /** Whether items are still loading */
  loading?: boolean;
}

export default function useDeepLink<T extends { id: string }>({
  items,
  onOpen,
  onClose,
  paramName = 'view',
  loading = false,
}: UseDeepLinkOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  // On mount or when items load: check URL for deep link ID
  useEffect(() => {
    if (loading || items.length === 0) return;

    const itemId = searchParams.get(paramName);
    if (!itemId) return;

    const found = items.find(item => item.id === itemId);
    if (found) {
      onOpen(found);
    }
    // Only run when items finish loading or URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loading, searchParams.get(paramName)]);

  /** Open an item and update the URL */
  const openItem = useCallback((item: T) => {
    onOpen(item);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set(paramName, item.id);
      return next;
    }, { replace: true });
  }, [onOpen, setSearchParams, paramName]);

  /** Close the panel and clean up the URL */
  const closeItem = useCallback(() => {
    onClose();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(paramName);
      return next;
    }, { replace: true });
  }, [onClose, setSearchParams, paramName]);

  /** Get the full deep link URL for an item */
  const getDeepLink = useCallback((itemId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, itemId);
    return url.toString();
  }, [paramName]);

  /** Copy deep link to clipboard */
  const copyDeepLink = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(getDeepLink(itemId));
      return true;
    } catch {
      return false;
    }
  }, [getDeepLink]);

  return {
    openItem,
    closeItem,
    getDeepLink,
    copyDeepLink,
    /** The currently deep-linked item ID from URL (if any) */
    activeId: searchParams.get(paramName) || null,
  };
}
