import { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * useSessionMemory - Tracks where the user was and restores their position
 *
 * Saves: last visited page, active tabs, scroll positions, sidebar state
 * Restores: navigates to last page on app load
 *
 * Uses localStorage for instant restore (no DB roundtrip needed on load)
 */

interface SessionState {
  lastPath: string;
  lastVisited: number;
  pageStates: Record<string, any>;
  activeTab: Record<string, string>;
}

const SESSION_KEY_PREFIX = 'cde_session_';

function getSessionKey(userId: string): string {
  return `${SESSION_KEY_PREFIX}${userId}`;
}

function getDefaultSession(): SessionState {
  return {
    lastPath: '/',
    lastVisited: Date.now(),
    pageStates: {},
    activeTab: {},
  };
}

function loadSession(userId: string): SessionState {
  try {
    const raw = localStorage.getItem(getSessionKey(userId));
    if (raw) {
      return { ...getDefaultSession(), ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return getDefaultSession();
}

function saveSession(userId: string, session: SessionState): void {
  try {
    localStorage.setItem(getSessionKey(userId), JSON.stringify(session));
  } catch {
    // ignore
  }
}

/**
 * Main session memory hook - use in Layout component
 * Tracks navigation and restores last page on load
 */
export function useSessionMemory() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = profile?.id || 'anonymous';
  const sessionRef = useRef<SessionState>(loadSession(userId));
  const hasRestoredRef = useRef(false);
  const isInitialMount = useRef(true);

  // Restore last page on initial app load
  useEffect(() => {
    if (!profile?.id || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const session = loadSession(profile.id);
    sessionRef.current = session;

    // Only redirect if:
    // 1. We're on the dashboard (default landing page)
    // 2. The saved path is different from current
    // 3. The session is less than 24 hours old
    // 4. The saved path is not the login page
    const timeSinceLastVisit = Date.now() - (session.lastVisited || 0);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (
      location.pathname === '/' &&
      session.lastPath &&
      session.lastPath !== '/' &&
      session.lastPath !== '/login' &&
      timeSinceLastVisit < maxAge
    ) {
      // Navigate to where they left off
      navigate(session.lastPath, { replace: true });
    }
  }, [profile?.id]);

  // Track page changes
  useEffect(() => {
    if (!profile?.id) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Don't track login page
    if (location.pathname === '/login') return;

    sessionRef.current = {
      ...sessionRef.current,
      lastPath: location.pathname,
      lastVisited: Date.now(),
    };
    saveSession(profile.id, sessionRef.current);
  }, [location.pathname, profile?.id]);

  // Save active tab for a page
  const setActiveTab = useCallback((pageKey: string, tabId: string) => {
    if (!profile?.id) return;

    sessionRef.current = {
      ...sessionRef.current,
      activeTab: {
        ...sessionRef.current.activeTab,
        [pageKey]: tabId,
      },
    };
    saveSession(profile.id, sessionRef.current);
  }, [profile?.id]);

  // Get active tab for a page
  const getActiveTab = useCallback((pageKey: string, defaultTab: string): string => {
    return sessionRef.current.activeTab?.[pageKey] || defaultTab;
  }, []);

  // Save arbitrary page state
  const setPageState = useCallback((pageKey: string, state: any) => {
    if (!profile?.id) return;

    sessionRef.current = {
      ...sessionRef.current,
      pageStates: {
        ...sessionRef.current.pageStates,
        [pageKey]: state,
      },
    };
    saveSession(profile.id, sessionRef.current);
  }, [profile?.id]);

  // Get page state
  const getPageState = useCallback(<T>(pageKey: string, defaultState: T): T => {
    return (sessionRef.current.pageStates?.[pageKey] as T) || defaultState;
  }, []);

  return {
    setActiveTab,
    getActiveTab,
    setPageState,
    getPageState,
    lastPath: sessionRef.current.lastPath,
  };
}

/**
 * useTabMemory - Simple hook for pages with tabs
 * Remembers which tab was active
 */
export function useTabMemory(pageKey: string, defaultTab: string): [string, (tab: string) => void] {
  const { profile } = useAuth();
  const userId = profile?.id || 'anonymous';
  const storageKey = `cde_tab_${userId}_${pageKey}`;

  // Read initial tab from localStorage
  const getInitialTab = (): string => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return defaultTab;
  };

  const tabRef = useRef(getInitialTab());

  const setTab = useCallback((tab: string) => {
    tabRef.current = tab;
    try {
      localStorage.setItem(storageKey, tab);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return [tabRef.current, setTab];
}

/**
 * useScrollMemory - Saves and restores scroll position for a page
 */
export function useScrollMemory(pageKey: string) {
  const { profile } = useAuth();
  const userId = profile?.id || 'anonymous';
  const storageKey = `cde_scroll_${userId}_${pageKey}`;

  // Restore scroll position on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const pos = parseInt(saved, 10);
        if (!isNaN(pos)) {
          // Small delay to allow content to render
          setTimeout(() => window.scrollTo(0, pos), 100);
        }
      }
    } catch {
      // ignore
    }

    // Save scroll position on scroll (debounced)
    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, String(window.scrollY));
        } catch {
          // ignore
        }
      }, 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [storageKey]);
}
