import { config } from '@/config/config.js';
import LocalPreferencesProvider from './LocalPreferencesProvider.js';

// Preferences provider factory. UI preferences are inherently client-local, so
// `local` is the default; a remote/account-synced provider could implement the
// same contract and be selected via VITE_PREFERENCES_PROVIDER.
const registry = {
  local: () => new LocalPreferencesProvider(),
};

let instance = null;

export function getPreferencesProvider() {
  if (instance) return instance;
  const make = registry[config.providers.preferences] || registry.local;
  instance = make();
  return instance;
}

export function resetPreferencesProvider() { instance = null; }

export default getPreferencesProvider;
