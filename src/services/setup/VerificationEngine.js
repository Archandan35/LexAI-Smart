import { databaseAdminService } from '@/services/databaseAdminService.js';
import { DatabaseScanner } from './DatabaseScanner.js';
import { WizardLogger } from './WizardLogger.js';

export const VerificationEngine = {
  async verify() {
    WizardLogger.info('Running verification');
    const scan = await DatabaseScanner.scan();
    if (!scan.ok) return { ok: false, error: scan.error };
    const validation = await DatabaseScanner.validate();
    const diff = await DatabaseScanner.diff();
    const result = {
      ok: true,
      installed: scan.installed,
      version: scan.version,
      needsSetup: scan.needsSetup,
      present: scan.present,
      missing: scan.missing,
      validation,
      diff,
    };
    WizardLogger.success('Verification complete', {
      present: result.present.length,
      missing: result.missing.length,
      valid: validation?.valid,
    });
    return result;
  },

  async checkRequired() {
    const scan = await DatabaseScanner.scan();
    if (!scan.ok) return { passed: false, missingTables: [], missingFunctions: [] };
    const meta = await databaseAdminService.getMeta().catch(() => ({}));
    const tables = scan.missing || [];
    const requiredTables = Array.isArray(meta?.requiredTables) ? tables.filter(t => meta.requiredTables.includes(t)) : tables;
    return {
      passed: tables.length === 0,
      missingTables: requiredTables,
      version: scan.version,
      installed: scan.installed,
    };
  },
};
