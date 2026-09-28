import { useState, useEffect, useCallback } from 'react';

// Global registries
export const autoStateRegistry: Record<string, Function> = {};
export const autoStateValues: Record<string, any> = {};
export const loadedStateCache: Record<string, any> = {};

export function useAutoState<T>(key: string, initialValue: T | (() => T)) {
  const [val, setVal] = useState<T>(() => {
    if (key in loadedStateCache) {
      return loadedStateCache[key] as T;
    }
    return initialValue instanceof Function ? (initialValue as () => T)() : initialValue;
  });

  // Sync initial and current value
  autoStateValues[key] = val;

  // Register setter
  useEffect(() => {
    autoStateRegistry[key] = setVal;
    return () => {};
  }, [key]);

  const setAutoVal = useCallback((newVal: T | ((prev: T) => T)) => {
    setVal((prev) => {
      const resolved = newVal instanceof Function ? newVal(prev) : newVal;
      autoStateValues[key] = resolved;
      
      // Update cache so if it remounts, it retains the latest value
      loadedStateCache[key] = resolved;
      
      return resolved;
    });
  }, [key]);

  return [val, setAutoVal] as const;
}

export function restoreAutoState(savedState: Record<string, any>) {
  if (!savedState) return;
  Object.keys(savedState).forEach(key => {
    loadedStateCache[key] = savedState[key]; // Cache for components not yet mounted
    
    if (autoStateRegistry[key]) {
      autoStateRegistry[key](savedState[key]);
    }
  });
}
