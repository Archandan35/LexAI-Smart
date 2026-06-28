import { getDatabaseProvider } from '@/providers/database/index.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { WizardLogger } from './WizardLogger.js';

export const InstallationExecutor = {
  async executeAll(sql, onProgress) {
    WizardLogger.info('Starting SQL execution');
    if (!sql || !sql.trim()) {
      WizardLogger.warn('No SQL to execute');
      return { ok: true, skipped: true };
    }
    const provider = getDatabaseProvider();
    if (typeof provider.execSql !== 'function') {
      WizardLogger.warn('exec_sql RPC not available — manual execution required');
      return { ok: false, needsManual: true, error: 'exec_sql RPC not available' };
    }
    try {
      if (onProgress) onProgress({ label: 'Executing installation SQL...', pct: 30 });
      const res = await provider.execSql(sql);
      if (res?.ok === false) {
        WizardLogger.error('SQL execution failed', res.error);
        return { ok: false, error: res.error || 'SQL execution failed' };
      }
      if (onProgress) onProgress({ label: 'Stamping installation', pct: 80 });
      await databaseAdminService.stampInstalled();
      if (onProgress) onProgress({ label: 'Installation complete', pct: 100 });
      WizardLogger.success('SQL execution complete');
      return { ok: true };
    } catch (e) {
      WizardLogger.error('SQL execution threw', e.message);
      return { ok: false, error: e.message };
    }
  },

  async executeSql(sql) {
    const provider = getDatabaseProvider();
    if (typeof provider.execSql !== 'function') return { ok: false, needsManual: true };
    try {
      const res = await provider.execSql(sql);
      return res?.ok === false ? { ok: false, error: res.error } : { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};
