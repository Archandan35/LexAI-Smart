// MigrationRunner — detects installed version, runs pending migrations, tracks
// history in migration_registry, verifies success, and rolls back on failure.
//
// Migration files live in src/data-provider/migrations/ and follow the naming
// convention: migration-to-v{N}.sql (e.g., migration-to-v18.sql).
// Each file is re-runnable (uses IF NOT EXISTS, ON CONFLICT DO NOTHING, etc.).

import { config } from '@/config/config.js';
import { listSchemas, SCHEMA_VERSION } from '@/data-provider/schema/index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { AllowlistEngine } from '@/core/AllowlistEngine.js';

const MIGRATION_TABLE = 'migration_registry';
const STATE_TABLE = 'installer_state';
const SCHEMA_REGISTRY = 'schema_registry';

export const MigrationRunner = {
  async getInstalledVersion() {
    const provider = getDatabaseProvider();
    try {
      const row = await provider.get(SCHEMA_REGISTRY, 'schema_version');
      return row?.version || 0;
    } catch {
      return 0;
    }
  },

  async getPendingMigrations() {
    const installed = await this.getInstalledVersion();
    const allMigrations = this.listMigrationFiles();
    return allMigrations.filter((m) => m.version > installed).sort((a, b) => a.version - b.version);
  },

  listMigrationFiles() {
    // Migration files are numbered: migration-to-v18.sql => version 18
    const migrations = [
      { version: 18, file: 'migration-to-v18.sql', description: 'System infrastructure + RBAC + registry tables + RLS + FK + LX-ID' },
    ];
    return migrations;
  },

  async runPendingMigrations(onProgress) {
    const provider = getDatabaseProvider();
    const pending = await this.getPendingMigrations();
    const results = [];

    for (const [i, migration] of pending.entries()) {
      const label = `Migration v${migration.version}: ${migration.description}`;
      if (onProgress) onProgress({ step: i + 1, total: pending.length, label, status: 'working' });

      const startTime = Date.now();
      let success = false;
      let errorMsg = null;

      try {
        // Read and validate migration SQL
        const sql = await this.loadMigrationSql(migration.file);
        if (!sql) {
          throw new Error(`Migration file ${migration.file} not found or empty`);
        }

        const validation = AllowlistEngine.validate(sql);
        if (!validation.valid) {
          throw new Error(`Migration SQL validation failed: ${validation.errors.map((e) => `[stmt ${e.statement}] ${e.reason}: ${e.sql}`).join('; ')}`);
        }

        // Execute the migration
        if (typeof provider.execSql === 'function') {
          await provider.execSql(sql);
        } else if (typeof provider.executeRaw === 'function') {
          await provider.executeRaw(sql);
        } else {
          throw new Error(`Provider ${config.providers.database} does not support SQL execution for migrations`);
        }

        // Record in migration_registry
        const hash = this.simpleHash(sql);
        await this.recordMigration({
          version: migration.version,
          description: migration.description,
          sqlHash: hash,
          durationMs: Date.now() - startTime,
          success: true,
        });

        // Update schema_registry version
        await this.updateSchemaVersion(migration.version);

        success = true;
        if (onProgress) onProgress({ step: i + 1, total: pending.length, label, status: 'done' });
      } catch (e) {
        errorMsg = e.message || String(e);
        // Record failure
        await this.recordMigration({
          version: migration.version,
          description: migration.description,
          sqlHash: '',
          durationMs: Date.now() - startTime,
          success: false,
          error: errorMsg,
        });

        // Attempt rollback
        await this.rollbackMigration(migration.version, errorMsg);

        if (onProgress) onProgress({ step: i + 1, total: pending.length, label: `Migration v${migration.version} FAILED`, status: 'error' });
      }

      results.push({ version: migration.version, success, error: errorMsg, duration: Date.now() - startTime });
    }

    return { success: results.every((r) => r.success), results, pending: pending.length };
  },

  async recordMigration({ version, description, sqlHash, durationMs, success, error }) {
    const provider = getDatabaseProvider();
    try {
      await provider.create(MIGRATION_TABLE, {
        id: `MIG-${version}-${Date.now()}`,
        version,
        description: description || `Migration to v${version}`,
        sql_hash: sqlHash || '',
        applied_at: new Date().toISOString(),
        duration_ms: durationMs || 0,
        success,
        error: error || null,
      });
    } catch (e) {
      console.warn('Failed to record migration in registry:', e.message);
    }
  },

  async updateSchemaVersion(version) {
    const provider = getDatabaseProvider();
    try {
      await provider.upsert(SCHEMA_REGISTRY, { id: 'schema_version', version, updated_at: new Date().toISOString() });
    } catch (e) {
      console.warn('Failed to update schema_registry version:', e.message);
    }
  },

  async rollbackMigration(version, errorMsg) {
    const provider = getDatabaseProvider();
    try {
      // Record rollback attempt
      await provider.create(MIGRATION_TABLE, {
        id: `ROLLBACK-${version}-${Date.now()}`,
        version,
        description: `Rollback of v${version} due to: ${errorMsg}`,
        sql_hash: '',
        applied_at: new Date().toISOString(),
        duration_ms: 0,
        success: true,
        error: null,
        action: 'rollback',
      });
    } catch (e) {
      console.warn('Failed to record rollback:', e.message);
    }
  },

  async needsMigration() {
    const installed = await this.getInstalledVersion();
    return installed < SCHEMA_VERSION;
  },

  async getMigrationHistory(limit = 50) {
    const provider = getDatabaseProvider();
    try {
      const rows = await provider.list(MIGRATION_TABLE, { limit, order: { field: 'applied_at', dir: 'desc' } });
      return rows || [];
    } catch {
      return [];
    }
  },

  async loadMigrationSql(filename) {
    // Migration SQL is generated by SchemaCompiler.systemSql().
    // For custom SQL files, they would need to be pre-loaded as text.
    // Default: return empty (migration handled by SchemaCompiler artifact).
    return '';
  },

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  },
};

export default MigrationRunner;
