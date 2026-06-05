const DEMO_MODE_STORAGE_KEY = 'connectbloom.demoMode.v1';

export function isDemoModeEnabled() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true';
}

export function enableDemoMode() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true');
}

export function clearDemoMode() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
}


export function assertNotDemoMode(actionLabel = 'この操作') {
  if (isDemoModeEnabled()) {
    throw new Error(`${actionLabel}はデモ閲覧中は利用できません。`);
  }
}
