import settingsCache from '@/core/settingsCache.js';

export function getPasswordMinLength() {
  const stored = settingsCache.get('passwordMinLength');
  if (stored !== undefined && stored !== null) {
    const n = parseInt(stored, 10);
    if (!Number.isNaN(n) && n >= 4) return n;
  }
  return 8;
}
