import { config } from '@/config/config.js';
import SupabaseDatabaseProvider from './SupabaseDatabaseProvider.js';
import MongoDatabaseProvider from './MongoDatabaseProvider.js';
import FirebaseDatabaseProvider from './FirebaseDatabaseProvider.js';

const registry = {
  supabase: () => new SupabaseDatabaseProvider(),
  mongodb: () => new MongoDatabaseProvider(),
  firebase: () => new FirebaseDatabaseProvider(),
};

let instance = null;

export function getDatabaseProvider() {
  if (instance) return instance;
  const key = config.providers.database;
  const make = registry[key];
  if (!make) throw new Error(`Database provider "${key}" is not recognised or not configured. Set VITE_DATABASE_PROVIDER to supabase, mongodb, or firebase.`);
  instance = make();
  return instance;
}

export function resetDatabaseProvider() { instance = null; }

export default getDatabaseProvider;
