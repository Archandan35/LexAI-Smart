import { config } from '@/config/config.js';
import { getDatabaseProvider, resetDatabaseProvider } from '@/providers/database/index.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { WizardLogger } from './WizardLogger.js';

export const ConnectionManager = {
  async test(providerType, credentials) {
    WizardLogger.info('Testing connection', { provider: providerType });
    try {
      if (credentials?.url && credentials?.key) {
        config.credentials.supabaseUrl = credentials.url;
        config.credentials.supabaseAnonKey = credentials.key;
        resetDatabaseProvider();
        WizardLogger.info('Applied credentials, recreated provider');
      }
      const provider = getDatabaseProvider();
      const status = await databaseAdminService.connectionStatus();
      if (!status.connected) {
        WizardLogger.error('Connection failed', status.error);
        return { ok: false, error: status.error || 'Connection refused' };
      }
      const name = typeof provider.name === 'function' ? provider.name() : '?';
      WizardLogger.success('Connection successful', { provider: name });
      return { ok: true, provider: name };
    } catch (e) {
      WizardLogger.error('Connection threw', e.message);
      return { ok: false, error: e.message };
    }
  },

  async collectEnvironment() {
    const env = { provider: 'unknown', version: '?', extensions: [], schemas: [] };
    try {
      const provider = getDatabaseProvider();
      env.provider = databaseAdminService.providerName();
      const meta = await databaseAdminService.getMeta().catch(() => null);
      if (meta?.extensions) env.extensions = meta.extensions;
      if (meta?.schemas) env.schemas = meta.schemas;
      const version = await databaseAdminService.getVersion().catch(() => 0);
      env.version = version;
      WizardLogger.info('Environment collected', { provider: env.provider, version: env.version });
    } catch (e) {
      WizardLogger.error('Environment collection failed', e.message);
    }
    return env;
  },
};
