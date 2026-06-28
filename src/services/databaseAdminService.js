// databaseAdminService — the service-layer façade the Database Manager UI/logic
// uses to reach the schema/migration/seed engines. Keeps pages & logic free of
// any direct data-provider/provider imports (clean-architecture rule R4).
import { migrationEngine } from '@/data-provider/migrations/MigrationEngine.js';
import { seedEngine } from '@/data-provider/seedEngine.js';
import { udbEngine } from '@/data-provider/udb/udbEngine.js';
import { databaseInstaller } from '@/data-provider/migrations/DatabaseInstaller.js';
import { schemaVersionManager } from '@/data-provider/migrations/SchemaVersionManager.js';
import { SchemaDiffEngine } from '@/data-provider/schema/SchemaDiffEngine.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { collectionNames, coreCollections, listSchemas, SCHEMA_VERSION } from '@/data-provider/schema/index.js';

export const databaseAdminService = {
  // ---- provider info ----
  providerName() { return config.providers.database || 'local'; },
  schemaVersion() { return SCHEMA_VERSION; },
  knownCollections() { return [...collectionNames]; },
  coreCollections() { return [...coreCollections]; },

  // Lightweight connection probe: can we reach the backend at all?
  async connectionStatus() {
    try {
      const provider = getDatabaseProvider();
      // A core collection probe is the cheapest reachable check across vendors.
      await provider.collectionExists('cases');
      return { connected: true };
    } catch (e) {
      return { connected: false, error: e?.message || String(e) };
    }
  },

  // ---- schema lifecycle ----
  ensureSchema(opts) { return migrationEngine.ensureSchema(opts); },
  validateSchema(opts) { return migrationEngine.validateSchema(opts); },
  repairSchema(opts) { return migrationEngine.repairSchema(opts); },
  installSql() { return migrationEngine.installSql(); },

  // ---- installer (auto schema install + detection) ----
  detect(onProgress) { return databaseInstaller.detect(onProgress); },
  installSchemaStructures(onProgress) { return databaseInstaller.installSchema(onProgress); },
  installArtifact() { return databaseInstaller.artifact(); },
  stampInstalled() { return databaseInstaller.stampInstalled(); },

  // ---- versioning (schema_meta) ----
  targetVersion() { return schemaVersionManager.targetVersion(); },
  getVersion() { return schemaVersionManager.getVersion(); },
  getMeta() { return schemaVersionManager.getMeta(); },
  upgrade(target) { return schemaVersionManager.upgrade(target); },
  rollback(target) { return schemaVersionManager.rollback(target); },

  // ---- grant permissions on all collections (setup bootstrap) ----
  async grantAllCollections() {
    const db = getDatabaseProvider();
    if (typeof db.execSql !== 'function') return { ok: true };
    const tables = [...new Set(listSchemas().map((s) => s.collection).filter(Boolean))];
    tables.push('_sequences');
    const sql = tables.map((t) => `
      alter table if exists "${t}" enable row level security;
      drop policy if exists "${t}_anon_all" on "${t}";
      create policy "${t}_anon_all" on "${t}" for all to anon using (true) with check (true);
      grant insert, select, update, delete on table "${t}" to anon;
    `).join('\n');
    return db.execSql(sql).catch(() => ({ ok: false }));
  },

  // ---- data ops (Phase 4) ----
  clearAll() { return seedEngine.clearAll(); },
  counts() { return seedEngine.counts(); },

  // ---- snapshot/restore passthrough ----
  snapshot(collections) { return getDatabaseProvider().snapshot(collections); },
  restore(data) { return getDatabaseProvider().restore(data); },

  // ---- schema diff (deep structural diff) ----
  diffSchema() { return SchemaDiffEngine.diff(); },
  diffToSQL(report) { return SchemaDiffEngine.toSQL(report); },

  // ---- universal .udb format (Phase 5) ----
  exportUdb() { return udbEngine.build(); },
  parseUdb(text) { return udbEngine.parse(text); },
  importUdb(udb) { return udbEngine.import(udb); },
  udbVersion() { return udbEngine.UDB_VERSION; },
};

export default databaseAdminService;
