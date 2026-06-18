import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseFoldersRepository } from '@/data-layer/repositories/caseFoldersRepository.js';
import { cloudProviderService } from './cloudProviderService.js';
import { config } from '@/config/config.js';

// storageStatsService — read-only dashboard metrics for the Storage & Sync
// Center. Provider-agnostic: counts come from the database metadata rows; live
// status/connection comes from cloudProviderService (the only provider caller).
export const storageStatsService = {
  async summary() {
    const [documents, folders, status] = await Promise.all([
      documentsRepository.getAll(),
      caseFoldersRepository.getAll(),
      cloudProviderService.status(),
    ]);
    const totalBytes = documents.reduce((s, d) => s + (d.size || 0), 0);
    const versions = documents.reduce((s, d) => s + (d.version || 1), 0);
    const synced = documents.filter((d) => d.syncStatus === 'synced').length;
    const failed = documents.filter((d) => d.syncStatus === 'error').length;
    const lastSync = documents
      .map((d) => d.lastSyncAt)
      .filter(Boolean)
      .sort()
      .pop() || null;
    return {
      provider: cloudProviderService.providerName(),
      isCloud: cloudProviderService.isCloud(),
      connected: status?.connected ?? true,
      statusMessage: status?.message || '',
      autoSync: config.storage?.autoSync !== false,
      rootFolder: config.storage?.rootFolder || 'LexAI',
      fileCount: documents.length,
      folderCount: folders.length,
      totalBytes,
      versionCount: versions,
      synced,
      failed,
      lastSync,
    };
  },

  testConnection: () => cloudProviderService.testConnection(),
};

export default storageStatsService;
