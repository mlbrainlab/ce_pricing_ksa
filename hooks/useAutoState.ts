import { useState, useEffect, useCallback } from 'react';

// Global registries
export const autoStateRegistry: Record<string, Function> = {};
export const autoStateValues: Record<string, any> = {};
export const loadedStateCache: Record<string, any> = {};

export function useAutoState<T>(key: string, initialValue: T | (() => T)) {
  const [val, setVal] = useState<T>(() => {
    if (key in loadedStateCache && loadedStateCache[key] !== undefined) {
      return loadedStateCache[key] as T;
    }
    return initialValue instanceof Function ? (initialValue as () => T)() : initialValue;
  });

  // Sync initial and current value
  autoStateValues[key] = val;

  const setAutoVal = useCallback((newVal: T | ((prev: T) => T)) => {
    setVal((prev) => {
      const resolved = newVal instanceof Function ? newVal(prev) : newVal;
      autoStateValues[key] = resolved;
      loadedStateCache[key] = resolved;
      return resolved;
    });
  }, [key]);

  // Register setter
  useEffect(() => {
    autoStateRegistry[key] = setAutoVal;
    return () => {
      delete autoStateRegistry[key];
    };
  }, [key, setAutoVal]);

  return [val, setAutoVal] as const;
}

export function restoreAutoState(savedState: Record<string, any>) {
  if (!savedState) return;
  Object.keys(savedState).forEach(key => {
    const value = savedState[key];
    if (value !== undefined) {
      loadedStateCache[key] = value;
      autoStateValues[key] = value;
      
      if (autoStateRegistry[key]) {
        autoStateRegistry[key](value);
      }
    }
  });
}

export function clearAutoStateCache() {
  Object.keys(loadedStateCache).forEach(k => delete loadedStateCache[k]);
}
