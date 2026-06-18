import PreferencesProvider from './PreferencesProvider.js';

// LocalPreferencesProvider — localStorage-backed UI preferences. This is the ONE
// place UI-preference localStorage access lives. Values are JSON-encoded; raw
// strings are returned as-is for backward compatibility with existing keys.
export default class LocalPreferencesProvider extends PreferencesProvider {
  get(key, fallback = null) {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      try { return JSON.parse(raw); } catch { return raw; }
    } catch { return fallback; }
  }

  set(key, value) {
    try {
      if (typeof localStorage === 'undefined') return false;
      const toStore = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, toStore);
      return true;
    } catch { return false; }
  }

  remove(key) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.removeItem(key);
      return true;
    } catch { return false; }
  }
}
