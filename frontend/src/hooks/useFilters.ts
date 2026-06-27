import { useState, useEffect, useCallback } from 'react';

export function useFilters<T extends Record<string, string>>(page: string, defaults: T) {
  const storageKey = `filters:${page}`;
  const [filters, setFiltersRaw] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(filters));
  }, [filters, storageKey]);

  const setFilters = useCallback((update: Partial<T> | ((prev: T) => T)) => {
    setFiltersRaw((prev) =>
      typeof update === 'function' ? update(prev) : { ...prev, ...update }
    );
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersRaw(defaults);
    localStorage.removeItem(storageKey);
  }, [defaults, storageKey]);

  return { filters, setFilters, resetFilters };
}
