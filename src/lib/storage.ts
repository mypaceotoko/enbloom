export function loadFromStorage<T>(key: string, fallback: T, legacyKeys: string[] = []): T {
  if (typeof window === 'undefined') return fallback;

  for (const storageKey of [key, ...legacyKeys]) {
    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue) return JSON.parse(storedValue) as T;
    } catch {
      continue;
    }
  }

  return fallback;
}

export function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
