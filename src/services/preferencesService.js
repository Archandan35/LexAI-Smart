import { getPreferencesProvider } from '@/providers/preferences/index.js';

// preferencesService — provider-agnostic UI preference storage.
export const preferencesService = {
  get: (key, fallback = null) => getPreferencesProvider().get(key, fallback),
  set: (key, value) => getPreferencesProvider().set(key, value),
  remove: (key) => getPreferencesProvider().remove(key),
};

export default preferencesService;
