import { getFileStorageProvider } from '@/providers/file-storage/index.js';
import { config } from '@/config/config.js';

// cloudProviderService — thin adapter that exposes the unified FileStorageProvider
// through the legacy cloud/local interface. Will be removed once all callers
// migrate to getFileStorageProvider directly.
export const cloudProviderService = {
  providerName() { return config.providers.storage || 'local'; },
  isCloud() { return !['local'].includes(this.providerName()); },

  async push(action, record) {
    return { ok: true, provider: this.providerName(), local: true };
  },

  async testConnection() {
    try {
      const provider = getFileStorageProvider();
      return { ok: true, provider: this.providerName(), message: 'Connected' };
    } catch {
      return { ok: false, provider: this.providerName(), message: 'Not configured' };
    }
  },

  async status() {
    try {
      const provider = getFileStorageProvider();
      const url = provider.getUrl ? await provider.getUrl('test').catch(() => null) : null;
      return { provider: this.providerName(), connected: !!url };
    } catch {
      return { provider: this.providerName(), connected: false };
    }
  },
};

export default cloudProviderService;
