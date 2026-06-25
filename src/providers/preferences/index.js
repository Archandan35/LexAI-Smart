import { config } from '@/config/config.js';

// Simple in-memory preferences provider used when no remote provider is configured.
// Preferences are inherently client-side; swap in a synced provider via
// VITE_PREFERENCES_PROVIDER when needed.
class MemoryPreferencesProvider {
  #store = new Map();

  get(key, fallback = null) {
    return this.#store.has(key) ? this.#store.get(key) : fallback;
  }

  set(key, value) {
    this.#store.set(key, value);
    return true;
  }

  remove(key) {
    this.#store.delete(key);
    return true;
  }
}

const registry = {};

let instance = null;

export function getPreferencesProvider() {
  if (instance) return instance;
  const key = config.providers.preferences;
  if (key && registry[key]) {
    instance = registry[key]();
  } else {
    instance = new MemoryPreferencesProvider();
  }
  return instance;
}

export function resetPreferencesProvider() { instance = null; }

export default getPreferencesProvider;
