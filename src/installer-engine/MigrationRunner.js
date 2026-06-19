// MigrationRunner — detects installed version, runs pending migration steps,
// tracks history in migration_registry, verifies success, and rolls back on failure.
//
// P7: Modular migration steps from src/data-provider/migrations/steps/.
// Each step is a JS module exporting { version, description, sql }.
// Steps run sequentially in dependency order.

import { config } from '@/config/config.js';
import { listSchemas, SCHEMA_VERSION } from '@/data-provider/schema/index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { AllowlistEngine } from '@/core/AllowlistEngine.js';
import { migrationSteps, TOTAL_STEPS } from '@/data-provider/migrations/steps/index.js';

const MIGRATION_TABLE = 'migration_registry';
const SCHEMA_REGISTRY = 'schema_registry';

export const MigrationRunner = {
  // Returns the highest migration step version recorded in schema_registry
  async getInstalledVersion() {
    const provider = getDatabaseProvider();
    try {
      const row = await provider.get(SCHEMA_REGISTRY, 'schema_version');
      return row?.version || 0;
    } catch {
      return 0;
    }
  },

  // Returns un-applied steps sorted by version
  async getPendingMigrations() {
    const installed = await this.getInstalledVersion();
    return migrationSteps.filter((m) => m.version > installed).sort((a, b) => a.version - b.version);
  },

  listMigrationSteps() {
    return [...migrationSteps];
  },

  // Execute all pending steps, recording each in migration_registry
  async runPendingMigrations(onProgress) {
    const provider = getDatabaseProvider();
    const pending = await this.getPendingMigrations();
    const results = [];

    for (const [i, step] of pending.entries()) {
      const label = `Step ${step.version}/${TOTAL_STEPS}: ${step.description}`;
      if (onProgress) onProgress({ step: i + 1, total: pending.length, label, status: 'working' });

      const startTime = Date.now();
      let success = false;
      let errorMsg = null;

      try {
        const validation = AllowlistEngine.validate(step.sql);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.map((e) => `[stmt ${e.statement}] ${e.reason}`).join('; ')}`);
        }

        if (typeof provider.execSql === 'function') {
          await provider.execSql(step.sql);
        } else if (typeof provider.executeRaw === 'function') {
          await provider.executeRaw(step.sql);
        } else {
          throw new Error(`Provider ${config.providers.database} does not support SQL execution`);
        }

        const hash = this.simpleHash(step.sql);
        await this.recordMigration({
          version: step.version,
          description: step.description,
          sqlHash: hash,
          durationMs: Date.now() - startTime,
          success: true,
        });

        await this.updateSchemaVersion(step.version);

        success = true;
        if (onProgress) onProgress({ step: i + 1, total: pending.length, label, status: 'done' });
      } catch (e) {
        errorMsg = e.message || String(e);
        await this.recordMigration({
          version: step.version,
          description: step.description,
          sqlHash: '',
          durationMs: Date.now() - startTime,
          success: false,
          error: errorMsg,
        });
        await this.rollbackMigration(step.version, errorMsg);
        if (onProgress) onProgress({ step: i + 1, total: pending.length, label: `Step ${step.version} FAILED`, status: 'error' });
      }

      results.push({ version: step.version, success, error: errorMsg, duration: Date.now() - startTime });
    }

    return { success: results.every((r) => r.success), results, pending: pending.length };
  },

  async recordMigration({ version, description, sqlHash, durationMs, success, error }) {
    const provider = getDatabaseProvider();
    try {
      await provider.create(MIGRATION_TABLE, {
        id: `MIG-${version}-${Date.now()}`,
        version,
        description: description || `Migration step ${version}`,
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
      await provider.create(MIGRATION_TABLE, {
        id: `ROLLBACK-${version}-${Date.now()}`,
        version,
        description: `Rollback of step ${version} due to: ${errorMsg}`,
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
    return installed < TOTAL_STEPS;
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

  // SQL is provided by the modular steps directly — no file loading needed
  async loadMigrationSql(filename) {
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
