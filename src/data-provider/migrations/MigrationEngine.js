// MigrationEngine — single entry point for schema lifecycle across providers.
// Picks the migration strategy by the active provider (config) and drives it
// against the live DatabaseProvider instance. Imports only the provider FACTORY
// (the same dependency the service layer already uses) — never an SDK.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { schemas, SCHEMA_VERSION } from '@/data-provider/schema/index.js';
import SupabaseMigration from './SupabaseMigration.js';
import FirebaseMigration from './FirebaseMigration.js';
import MongoMigration from './MongoMigration.js';

const STRATEGIES = {
  supabase: SupabaseMigration,
  firebase: FirebaseMigration,
  mongodb: MongoMigration,
};

class MigrationEngine {
  get providerName() { return config.providers.database; }
  get schemaVersion() { return SCHEMA_VERSION; }

  // Resolve a fresh strategy bound to the current provider every call, so a
  // provider hot-swap (resetDatabaseProvider) is always respected.
  #strategy() {
    const Strategy = STRATEGIES[this.providerName];
    if (!Strategy) throw new Error(`No migration strategy for provider "${this.providerName}".`);
    return new Strategy(getDatabaseProvider(), schemas);
  }

  // Run on app start. Creates the minimum install set by default.
  ensureSchema(opts = { coreOnly: true }) { return this.#strategy().ensureSchema(opts); }

  validateSchema(opts) { return this.#strategy().validateSchema(opts); }

  repairSchema(opts) { return this.#strategy().repairSchema(opts); }

  // Provider-specific install SQL (Supabase) or null where not applicable.
  installSql() {
    const s = this.#strategy();
    return typeof s.installSql === 'function' ? s.installSql() : null;
  }

  status() {
    return { provider: this.providerName, schemaVersion: this.schemaVersion };
  }
}

export const migrationEngine = new MigrationEngine();
export default migrationEngine;
