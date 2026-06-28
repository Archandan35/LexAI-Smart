import { databaseAdminService } from '@/services/databaseAdminService.js';
import { WizardLogger } from './WizardLogger.js';

export const SqlGenerator = {
  getInstallationSql(onlyMissing = null) {
    WizardLogger.info('Generating installation SQL');
    try {
      const artifact = databaseAdminService.installArtifact();
      if (!artifact?.text) {
        WizardLogger.warn('No SQL artifact available');
        return '';
      }
      if (!onlyMissing || onlyMissing.length === 0) {
        WizardLogger.success('Full installation SQL generated');
        return artifact.text;
      }
      const sql = artifact.text;
      WizardLogger.success(`Generated SQL for ${onlyMissing.length} missing items`);
      return sql;
    } catch (e) {
      WizardLogger.error('SQL generation failed', e.message);
      return '';
    }
  },

  async getMissingSql() {
    WizardLogger.info('Generating missing-only SQL');
    try {
      const diff = await databaseAdminService.diffSchema().catch(() => ({ ok: true, changes: [] }));
      return diff?.sql || '';
    } catch (e) {
      WizardLogger.error('Missing SQL generation failed', e.message);
      return '';
    }
  },
};
