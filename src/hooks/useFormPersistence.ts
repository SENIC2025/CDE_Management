import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * useFormPersistence - Persists form state to localStorage
 *
 * Automatically saves form data as the user types, and restores it
 * when they return to the same form. Scoped by userId + formKey.
 *
 * @param formKey - Unique identifier for this form (e.g., 'strategy-template-editor')
 * @param defaultState - The default/initial state for the form
 * @param options - Optional config: debounceMs (default 500), enabled (default true)
 * @returns [state, setState, helpers] - State, setter, and helper functions
 */

interface FormPersistenceOptions {
  debounceMs?: number;
  enabled?: boolean;
  /** If true, also uses project context to scope the key */
  projectScoped?: boolean;
}

interface FormPersistenceHelpers {
  /** Clear the saved state from localStorage */
  clearSaved: () => void;
  /** Whether the form has unsaved changes vs the last saved version */
  isDirty: boolean;
  /** Whether restored data was loaded from storage */
  wasRestored: boolean;
  /** Manually trigger a save */
  forceSave: () => void;
  /** Timestamp of last save */
  lastSaved: number | null;
}

function getStorageKey(userId: string, formKey: string, projectId?: string): string {
  if (projectId) {
    return `cde_form_${userId}_${projectId}_${formKey}`;
  }
  return `cde_form_${userId}_${formKey}`;
}

export function useFormPersistence<T>(
  formKey: string,
  defaultState: T,
  options: FormPersistenceOptions = {}
): [T, (updater: T | ((prev: T) => T)) => void, FormPersistenceHelpers] {
  const { profile } = useAuth();
  const { debounceMs = 500, enabled = true } = options;

  const userId = profile?.id || 'anonymous';
  const storageKey = getStorageKey(userId, formKey);

  // Try to restore from localStorage on mount
  const [wasRestored, setWasRestored] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const initialLoadDone = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInitialState = (): T => {
    if (!enabled) return defaultState;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed._data !== undefined) {
          return parsed._data as T;
        }
      }
    } catch (e) {
      console.warn(`[FormPersistence] Failed to restore ${formKey}:`, e);
    }
    return defaultState;
  };

  const [state, setStateInternal] = useState<T>(getInitialState);
  const [isDirty, setIsDirty] = useState(false);
  const stateRef = useRef(state);

  // Check if we restored from storage on initial mount
  useEffect(() => {
    if (!initialLoadDone.current && enabled) {
      initialLoadDone.current = true;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed._data !== undefined) {
            setWasRestored(true);
            setLastSaved(parsed._savedAt || null);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Save to localStorage with debounce
  const saveToStorage = useCallback((data: T) => {
    if (!enabled) return;

    try {
      const payload = {
        _data: data,
        _savedAt: Date.now(),
        _formKey: formKey,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSaved(payload._savedAt);
    } catch (e) {
      console.warn(`[FormPersistence] Failed to save ${formKey}:`, e);
    }
  }, [enabled, storageKey, formKey]);

  const setState = useCallback((updater: T | ((prev: T) => T)) => {
    setStateInternal((prev) => {
      const next = typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;
      stateRef.current = next;
      setIsDirty(true);

      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToStorage(next);
      }, debounceMs);

      return next;
    });
  }, [saveToStorage, debounceMs]);

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setIsDirty(false);
      setWasRestored(false);
      setLastSaved(null);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const forceSave = useCallback(() => {
    saveToStorage(stateRef.current);
    setIsDirty(false);
  }, [saveToStorage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save on unmount if dirty
      if (isDirty && enabled) {
        saveToStorage(stateRef.current);
      }
    };
  }, [isDirty, enabled, saveToStorage]);

  return [
    state,
    setState,
    { clearSaved, isDirty, wasRestored, forceSave, lastSaved }
  ];
}

/**
 * usePageDraft - Simplified persistence for page-level forms
 * Stores individual field values instead of a whole object
 */
export function usePageDraft(pageKey: string) {
  const { profile } = useAuth();
  const userId = profile?.id || 'anonymous';
  const storageKey = `cde_draft_${userId}_${pageKey}`;

  const getField = useCallback(<T>(fieldKey: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data[fieldKey] !== undefined) {
          return data[fieldKey] as T;
        }
      }
    } catch {
      // ignore
    }
    return defaultValue;
  }, [storageKey]);

  const setField = useCallback((fieldKey: string, value: any) => {
    try {
      const existing = localStorage.getItem(storageKey);
      const data = existing ? JSON.parse(existing) : {};
      data[fieldKey] = value;
      data._updatedAt = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const hasData = useCallback((): boolean => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  }, [storageKey]);

  return { getField, setField, clearAll, hasData };
}
