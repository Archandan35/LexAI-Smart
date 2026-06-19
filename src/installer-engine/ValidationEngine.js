import { databaseAdminService } from '@/services/databaseAdminService.js';
import { databaseHealthService } from '@/services/databaseHealthService.js';
import { udbEngine } from '@/data-provider/udb/udbEngine.js';
import { InstallationPlanner } from './InstallationPlanner.js';

export const ValidationEngine = {
  async validateInstallation() {
    const [version, health, diff] = await Promise.all([
      databaseAdminService.getVersion().catch(() => 0),
      databaseHealthService.scan().catch(() => null),
      databaseAdminService.diffSchema().catch(() => null),
    ]);

    const issues = [];
    if (version === 0) issues.push({ type: 'error', message: 'Schema version is 0 — installation incomplete.' });

    if (health && !health.healthy) {
      for (const issue of (health.issues || [])) {
        issues.push({ type: issue.severity === 'critical' ? 'error' : 'warning', message: issue.message || issue.label });
      }
    }

    if (diff) {
      if (diff.missingTables?.length > 0) {
        issues.push({ type: 'error', message: `Missing tables: ${diff.missingTables.join(', ')}` });
      }
      if (diff.missingColumns?.length > 0) {
        issues.push({ type: 'warning', message: `Missing columns: ${diff.missingColumns.map((c) => c.table ? `${c.table}.${c.column}` : c.column).join(', ')}` });
      }
    }

    return {
      valid: issues.filter((i) => i.type === 'error').length === 0,
      version,
      targetVersion: databaseAdminService.targetVersion(),
      health: health ? { score: health.score, healthy: health.healthy, summary: health.summary } : null,
      diff,
      issues,
      issueCount: issues.length,
    };
  },

  async validateUpload(udb) {
    const parsed = await udbEngine.parse(typeof udb === 'string' ? udb : JSON.stringify(udb));
    if (!parsed.ok) return { valid: false, errors: [parsed.reason] };

    const versionOk = parsed.versionOk !== false;
    const checksumOk = parsed.checksumOk !== false;
    const errors = [];
    if (!versionOk) errors.push('UDB schema version is newer than current app version.');
    if (!checksumOk) errors.push('Checksum mismatch — data may be corrupted.');

    const schema = udb.schema;
    const schemaDiff = schema ? InstallationPlanner.diffSchemas(schema) : null;

    return {
      valid: errors.length === 0,
      errors,
      versionOk,
      checksumOk,
      counts: parsed.counts,
      schemaDiff,
      repaired: parsed.repaired,
    };
  },
};

export default ValidationEngine;
