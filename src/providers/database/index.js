import { config } from '@/config/config.js';
import LocalDatabaseProvider from './LocalDatabaseProvider.js';
import SupabaseDatabaseProvider from './SupabaseDatabaseProvider.js';
import MongoDatabaseProvider from './MongoDatabaseProvider.js';
import FirebaseDatabaseProvider from './FirebaseDatabaseProvider.js';

const registry = {
  local: () => new LocalDatabaseProvider(),
  supabase: () => new SupabaseDatabaseProvider(),
  mongodb: () => new MongoDatabaseProvider(),
  firebase: () => new FirebaseDatabaseProvider(),
  // sqlite / postgres follow the same contract.
};

let instance = null;

export function getDatabaseProvider() {
  if (instance) return instance;
  const make = registry[config.providers.database] || registry.local;
  instance = make();
  return instance;
}

export function resetDatabaseProvider() { instance = null; }

export default getDatabaseProvider;
