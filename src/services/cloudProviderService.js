import { getStorageProvider } from '@/providers/storage/index.js';
import { config } from '@/config/config.js';

// cloudProviderService — the ONLY module that talks to a concrete cloud storage
// provider. All provider-specific logic lives behind the StorageProvider
// contract (providers/storage/*). The UI never imports this or a provider; it
// calls storageService, which delegates here. Switching providers = one env var.
export const cloudProviderService = {
  providerName() { return config.providers.storage || 'local'; },
  isCloud() { return !['local'].includes(this.providerName()); },

  // Push a single file change to the provider (no-op for the local provider).
  async push(action, record) {
    const provider = getStorageProvider();
    if (typeof provider.sync === 'function') return provider.sync(action, record);
    return { ok: true, provider: this.providerName(), local: true };
  },

  async testConnection() {
    const provider = getStorageProvider();
    if (typeof provider.testConnection === 'function') return provider.testConnection();
    return { ok: true, provider: this.providerName(), message: 'Local storage (in-browser) — always available.' };
  },

  async status() {
    const provider = getStorageProvider();
    if (typeof provider.status === 'function') return provider.status();
    return {
      provider: this.providerName(),
      connected: true,
      message: 'Local in-browser storage',
    };
  },
};

export default cloudProviderService;
