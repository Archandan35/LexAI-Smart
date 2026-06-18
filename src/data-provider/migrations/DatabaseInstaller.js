// DatabaseInstaller — detects a fresh/empty backend and installs the full schema
// per provider, automatically wherever the backend's browser-reachable API
// allows it. Structural install only (tables/collections/indexes/version stamp);
// SYSTEM-DATA seeding (roles, super-admin) is orchestrated one layer up by
// databaseManagerLogic via authLogic, and demo/permissions by the seedEngine.
//
// Provider-agnostic: imports the provider FACTORY + SchemaCompiler, never an SDK.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { SchemaCompiler } from '@/data-provider/schema/SchemaCompiler.js';
import { listSchemas, collectionNames } from '@/data-provider/schema/index.js';
import { schemaVersionManager } from './SchemaVersionManager.js';

// Supabase needs DDL the anon key can't run directly — try an exec_sql RPC,
// else surface the SQL. Kept as a module function (object literals can't hold
// private methods).
async function installSupabase(provider) {
  const artifact = SchemaCompiler.installArtifact('supabase'); // { kind:'sql', text }
  if (typeof provider.execSql === 'function') {
    try {
      await provider.execSql(artifact.text);
      return {
        ok: true, provider: 'supabase', viaRpc: true, needsManual: false,
        created: collectionNames.map((c) => ({ collection: c, ok: true })),
      };
    } catch (e) {
      return {
        ok: false, provider: 'supabase', needsManual: true, sql: artifact.text,
        reason: `Automatic install via exec_sql failed (${e.message}). Run the SQL once in the Supabase SQL editor, or add an exec_sql function.`,
      };
    }
  }
  return {
    ok: false, provider: 'supabase', needsManual: true, sql: artifact.text,
    reason: 'Browser cannot run DDL without an exec_sql RPC. Run the SQL once in the Supabase SQL editor (or create an exec_sql function to enable one-click install).',
  };
}

export const databaseInstaller = {
  provider() { return config.providers.database || 'local'; },

  // What state is the backend in?
  async detect() {
    const provider = getDatabaseProvider();
    const version = await schemaVersionManager.getVersion();
    const present = [];
    const missing = [];
    for (const s of listSchemas()) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await provider.collectionExists(s.collection).catch(() => false);
      (exists ? present : missing).push(s.collection);
    }
    return {
      provider: this.provider(),
      installed: version > 0,
      version,
      targetVersion: schemaVersionManager.targetVersion(),
      present,
      missing,
      needsSetup: version === 0,
    };
  },

  // The provider-specific install artifact (SQL / rules+indexes / mongoose+validators).
  artifact() { return SchemaCompiler.installArtifact(this.provider()); },

  // Create the structures. Returns { ok, created[], needsManual, sql?, reason? }.
  async installSchema() {
    const name = this.provider();
    const provider = getDatabaseProvider();
    if (name === 'supabase') return installSupabase(provider);

    // local (real create) + firebase/mongodb (lazy create on first write).
    const created = [];
    for (const s of listSchemas()) {
      // eslint-disable-next-line no-await-in-loop
      const r = await provider.ensureCollection(s.collection, s).catch(() => ({ ok: false }));
      created.push({ collection: s.collection, ...r });
    }
    return { ok: true, provider: name, created, needsManual: false };
  },

  // Stamp the installed version (called after a successful structural install).
  stampInstalled() { return schemaVersionManager.stamp(schemaVersionManager.targetVersion(), 'install'); },
};

export default databaseInstaller;
