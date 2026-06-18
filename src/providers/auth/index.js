import { config } from '@/config/config.js';
import LocalAuthProvider from './LocalAuthProvider.js';
import SupabaseAuthProvider from './SupabaseAuthProvider.js';

const registry = {
  local: () => new LocalAuthProvider(),
  supabase: () => new SupabaseAuthProvider(),
};

let instance = null;

export function getAuthProvider() {
  if (instance) return instance;
  const make = registry[config.providers.auth] || registry.local;
  instance = make();
  return instance;
}

export function resetAuthProvider() { instance = null; }

export default getAuthProvider;
