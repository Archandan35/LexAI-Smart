import { databaseAdminService } from '@/services/databaseAdminService.js';
import { databaseHealthService } from '@/services/databaseHealthService.js';
import { BackupManager } from './BackupManager.js';
import { auditService } from '@/services/auditService.js';
import { downloadFile } from '@/utils/exportData.js';
import { ok, fail } from '@/utils/result.js';

// databaseManagerLogic — orchestration behind the Database Manager UI + Setup
// Wizard. Logic layer only (logic → services → repositories/data-provider →
// providers); the UI never touches a provider or the data-provider layer.

const p2 = (n) => String(n).padStart(2, '0');
function udbFileName(d = new Date()) {
  return `LEXAI_${d.getFullYear()}_${p2(d.getMonth() + 1)}_${p2(d.getDate())}_${p2(d.getHours())}_${p2(d.getMinutes())}_${p2(d.getSeconds())}.udb`;
}

function approxBytes(obj) {
  try { return new Blob([JSON.stringify(obj)]).size; } catch { return JSON.stringify(obj).length; }
}

async function audit(action, user, details) {
  try { await auditService.record({ action, module: 'database', user, details }); } catch { /* never block */ }
}

export const databaseManagerLogic = {
  // ---- detection (Setup Wizard) ----
  async detect(onProgress) {
    try { return ok(await databaseAdminService.detect(onProgress)); }
    catch (e) { return fail(e); }
  },

  // ---- dashboard ----
  async overview() {
    try {
      const known = databaseAdminService.knownCollections();
      const [connection, validation, meta, installedVersion, snapshot, health] = await Promise.all([
        databaseAdminService.connectionStatus(),
        databaseAdminService.validateSchema().catch(() => ({ valid: false, present: [], missing: [] })),
        databaseAdminService.getMeta().catch(() => null),
        databaseAdminService.getVersion().catch(() => 0),
        databaseAdminService.snapshot(known).catch(() => ({})),
        databaseHealthService.scan().catch(() => null),
      ]);
      const counts = {};
      known.forEach((n) => { counts[n] = Array.isArray(snapshot[n]) ? snapshot[n].length : 0; });
      const totalRows = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
      return ok({
        provider: databaseAdminService.providerName(),
        schemaVersion: databaseAdminService.schemaVersion(),
        databaseVersion: installedVersion,
        targetVersion: databaseAdminService.targetVersion(),
        udbVersion: databaseAdminService.udbVersion(),
        meta,
        connection,
        validation,
        counts,
        known,
        core: databaseAdminService.coreCollections(),
        totalRows,
        storageUsed: approxBytes(snapshot),
        health: health ? { score: health.score, healthy: health.healthy, summary: health.summary, issues: health.issues } : null,
        statistics: {
          users: counts.users || 0,
          roles: counts.roles || 0,
          cases: counts.cases || 0,
          documents: counts.documents || 0,
        },
      });
    } catch (e) { return fail(e); }
  },

  // ---- install (Setup Wizard "Install Database") ----
  async install(user, onProgress) {
    try {
      console.log('[LexAI install] INSTALL STEP 1/5 — CREATE TABLES');
      const struct = await databaseAdminService.installSchemaStructures(onProgress);
      console.log('[LexAI install] installSchemaStructures result:', JSON.stringify(struct));

      if (!struct || struct.needsManual) {
        console.log('[LexAI install] needsManual=true — returning SQL to user');
        return ok({ installed: false, needsManual: true, sql: struct?.sql, reason: struct?.reason });
      }
      if (!struct.success) {
        console.log('[LexAI install] structural install failed');
        return ok({ installed: false, needsManual: false, error: struct.error || 'Install failed', failedStep: struct.failedStep, completedSteps: struct.completedSteps });
      }

      console.log('[LexAI install] INSTALL STEP 2/5 — INSERT SCHEMA_META (via stamp in seed)');
      console.log('[LexAI install] INSTALL STEP 4/5 — INSERT SETTINGS (stamp)');
      await databaseAdminService.stampInstalled();

      // Final verification
      try {
        const version = await databaseAdminService.getVersion();
        const snapshot = await databaseAdminService.snapshot(['roles']);
        const roleCount = snapshot?.roles?.length ?? -1;
        console.log('[LexAI install] VERIFY — schema_meta version:', version, 'roles:', roleCount);
        if (version === 0) throw new Error('Schema stamp failed — schema_meta version is 0');
      } catch (verifyErr) {
        console.error('[LexAI install] Verification failed:', verifyErr.message);
        return ok({ installed: false, needsManual: false, error: verifyErr.message, failedStep: 'verify', completedSteps: 5 });
      }

      await audit('db.install', user, `provider=${databaseAdminService.providerName()}`);
      console.log('[LexAI install] INSTALL COMPLETE');
      return ok({ installed: true, struct });
    } catch (e) {
      console.error('[LexAI install] Install failed:', e);
      return fail(e);
    }
  },

  // ---- schema ops ----
  async createSchema(user) {
    try { const res = await databaseAdminService.ensureSchema({ coreOnly: false }); await audit('db.schema.create', user); return ok(res); }
    catch (e) { return fail(e); }
  },
  async validateSchema() {
    try { return ok(await databaseAdminService.validateSchema()); } catch (e) { return fail(e); }
  },
  async repairSchema(user) {
    try { const res = await databaseAdminService.repairSchema(); await audit('db.schema.repair', user); return ok(res); }
    catch (e) { return fail(e); }
  },
  installSql() { return databaseAdminService.installSql(); },
  async diffSchema() {
    try { return ok(await databaseAdminService.diffSchema()); } catch (e) { return fail(e); }
  },

  // ---- versioning ----
  async upgrade(user) {
    try { const res = await databaseAdminService.upgrade(); await audit('db.upgrade', user, `to v${res.to}`); return ok(res); }
    catch (e) { return fail(e); }
  },
  async rollback(user) {
    try { const res = await databaseAdminService.rollback(); await audit('db.rollback', user, `to v${res.to}`); return ok(res); }
    catch (e) { return fail(e); }
  },

  // ---- health ----
  async scan() { try { return ok(await databaseHealthService.scan()); } catch (e) { return fail(e); } },
  async repairHealth(user) {
    try { const res = await databaseHealthService.repair(); await audit('db.health.repair', user, `${res.actions.length} action(s)`); return ok(res); }
    catch (e) { return fail(e); }
  },
  async validateHealth() { try { return ok(await databaseHealthService.validate()); } catch (e) { return fail(e); } },

  // ---- data ----
  async clearDatabase(user) {
    try { const removed = await databaseAdminService.clearAll(); await audit('db.clear', user); return ok(removed); }
    catch (e) { return fail(e); }
  },
  async factoryReset(user) {
    try {
      await databaseAdminService.clearAll();
      await databaseAdminService.ensureSchema({ coreOnly: false });
      await databaseAdminService.stampInstalled();
      await audit('db.factoryReset', user, 'Factory reset');
      return ok(true);
    } catch (e) { return fail(e); }
  },

  // ---- import / export (.udb) ----
  async exportDatabase(user) {
    try {
      const udb = await databaseAdminService.exportUdb();
      downloadFile(udbFileName(), JSON.stringify(udb, null, 2), 'application/octet-stream');
      await audit('db.export', user, 'Exported .udb');
      return ok(true);
    } catch (e) { return fail(e); }
  },
  parseImport(text) { return databaseAdminService.parseUdb(text); },
  async importDatabase(udb, user) {
    try {
      const counts = await databaseAdminService.importUdb(udb);
      // The imported data came from another provider — re-stamp version for THIS provider.
      await databaseAdminService.stampInstalled();
      await audit('db.import', user, 'Imported .udb');
      return ok(counts);
    } catch (e) { return fail(e); }
  },

  // ---- backups (delegated to BackupManager) ----
  destinations() { return BackupManager.destinations(); },
  async backup(destination, user) {
    try { const res = await BackupManager.backup({ destination }, user); return res; }
    catch (e) { return fail(e); }
  },
  backupSchedule() { return BackupManager.getSchedule(); },
  async setBackupSchedule(patch, user) { return BackupManager.setSchedule(patch, user); },
  runDueBackups(user) { return BackupManager.runDue(user); },
};

export default databaseManagerLogic;
