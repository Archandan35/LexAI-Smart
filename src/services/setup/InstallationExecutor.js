import { getDatabaseProvider } from '@/providers/database/index.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { BackendGateway } from '@/backend/BackendGateway.js';
import { WizardLogger } from './WizardLogger.js';

const MANUAL_HINT = "Install requires the exec_sql RPC. In Supabase, run supabase_migration.sql in the SQL Editor once, or set VITE_BACKEND_URL to enable backend-assisted install.";

export const InstallationExecutor = {
  async executeAll(sql, onProgress) {
    WizardLogger.info('Starting SQL execution');
    if (!sql || !sql.trim()) {
      WizardLogger.warn('No SQL to execute');
      return { ok: true, skipped: true };
    }

    // Prefer a backend proxy: it holds the service-role key server-side and is
    // the only safe way to auto-install without shipping secrets to the browser.
    if (BackendGateway.configured) {
      try {
        if (onProgress) onProgress({ label: 'Executing installation SQL (backend)...', pct: 30 });
        const res = await BackendGateway.installDatabase({ sql });
        if (res?.ok === false) {
          WizardLogger.error('Backend install failed', res.error);
          return { ok: false, error: res.error || 'Backend install failed' };
        }
        if (onProgress) onProgress({ label: 'Stamping installation', pct: 80 });
        await databaseAdminService.stampInstalled();
        if (onProgress) onProgress({ label: 'Installation complete', pct: 100 });
        WizardLogger.success('SQL execution complete');
        return { ok: true };
      } catch (e) {
        WizardLogger.error('Backend install threw', e.message);
        return { ok: false, error: e.message };
      }
    }

    const provider = getDatabaseProvider();
    try {
      if (onProgress) onProgress({ label: 'Executing installation SQL...', pct: 30 });
      const res = await provider.execSql(sql);
      if (res?.needsManual) {
        WizardLogger.warn('exec_sql RPC not available — manual execution or backend proxy required');
        return { ok: false, needsManual: true, error: MANUAL_HINT };
      }
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
    if (BackendGateway.configured) {
      const res = await BackendGateway.installDatabase({ sql });
      if (res?.ok === false) return { ok: false, error: res.error || 'Backend install failed' };
      return { ok: true };
    }
    const provider = getDatabaseProvider();
    try {
      const res = await provider.execSql(sql);
      if (res?.needsManual) return { ok: false, needsManual: true, error: MANUAL_HINT };
      return res?.ok === false ? { ok: false, error: res.error } : { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};
