// Central backend configuration.
// The ONLY place VITE_BACKEND_URL and VITE_API_VERSION are read.
// All apiClient calls derive their base URL from this module.

const env = import.meta.env ?? {};

export const backendConfig = {
  url: (env.VITE_BACKEND_URL || '').replace(/\/+$/, ''),
  apiVersion: env.VITE_API_VERSION || 'v1',
  timeout: Number(env.VITE_BACKEND_TIMEOUT || 15000),
  retryCount: Number(env.VITE_BACKEND_RETRY || 0),
  retryDelay: Number(env.VITE_BACKEND_RETRY_DELAY || 1000),

  get base() {
    return this.url ? `${this.url}/api/${this.apiVersion}` : '';
  },

  get configured() {
    return this.url.length > 0;
  },

  get healthEndpoint() {
    return this.configured ? `${this.base}/health` : '';
  },

  endpoints: {
    health: '/health',
    databaseTest: '/database/test',
    databaseInstall: '/database/install',
    databaseSchema: '/database/schema',
    databaseSeed: '/database/seed',
    databaseVerify: '/database/verify',
    databaseBackup: '/database/backup',
    databaseRestore: '/database/restore',
    databaseMigrate: '/database/migrate',
    version: '/version',
  },

  resolve(path) {
    return this.configured ? `${this.base}${path}` : '';
  },
};

export default backendConfig;
