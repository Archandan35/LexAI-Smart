import { config } from '@/config/config.js';
import SupabaseAuthProvider from './SupabaseAuthProvider.js';

const registry = {
  supabase: () => new SupabaseAuthProvider(),
};

let instance = null;

export function getAuthProvider() {
  if (instance) return instance;
  const key = config.providers.auth;
  const make = registry[key];
  if (!make) throw new Error(`Auth provider "${key}" is not recognised or not configured. Set VITE_AUTH_PROVIDER to supabase.`);
  instance = make();
  return instance;
}

export function resetAuthProvider() { instance = null; }

export default getAuthProvider;
