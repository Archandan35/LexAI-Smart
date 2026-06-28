import { databaseAdminService } from '@/services/databaseAdminService.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import { WizardLogger } from './WizardLogger.js';

export const DatabaseScanner = {
  async scan(onProgress) {
    WizardLogger.info('Starting database scan');
    const detect = await databaseAdminService.detect(onProgress);
    if (!detect) {
      WizardLogger.error('Detection returned null');
      return { ok: false, error: 'Detection failed' };
    }
    WizardLogger.success('Scan complete', { present: detect.present?.length, missing: detect.missing?.length });
    return {
      ok: true,
      provider: detect.provider,
      installed: detect.installed,
      version: detect.version,
      needsSetup: detect.needsSetup,
      partialInstall: detect.partialInstall,
      present: detect.present || [],
      missing: detect.missing || [],
    };
  },

  getBlueprint() {
    const schemas = listSchemas();
    WizardLogger.info('Blueprint loaded', { schemas: schemas.length });
    return { schemas };
  },

  async validate() {
    try {
      const result = await databaseAdminService.validateSchema();
      WizardLogger.success('Schema validation', result);
      return result;
    } catch (e) {
      WizardLogger.error('Validation failed', e.message);
      return { valid: false, error: e.message };
    }
  },

  async diff() {
    try {
      const result = await databaseAdminService.diffSchema();
      WizardLogger.info('Schema diff', result);
      return result || { ok: true, changes: [] };
    } catch (e) {
      WizardLogger.error('Diff failed', e.message);
      return { ok: false, error: e.message };
    }
  },
};
