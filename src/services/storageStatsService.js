import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseFoldersRepository } from '@/data-layer/repositories/caseFoldersRepository.js';
import { cloudProviderService } from './cloudProviderService.js';
import { config } from '@/config/config.js';

// storageStatsService — read-only dashboard metrics for the Storage & Sync
// Center. Provider-agnostic: counts come from the database metadata rows; live
// status/connection comes from cloudProviderService (the only provider caller).
export const storageStatsService = {
  async summary() {
    const [docCount, folderCount, status] = await Promise.all([
      documentsRepository.count(),
      caseFoldersRepository.count(),
      cloudProviderService.status(),
    ]);
    const docs = docCount > 0
      ? await documentsRepository.getAll({ select: 'size,version,syncStatus,lastSyncAt', limit: 1000 }).catch(() => [])
      : [];
    const totalBytes = docs.reduce((s, d) => s + (d.size || 0), 0);
    const versions = docs.reduce((s, d) => s + (d.version || 1), 0);
    const synced = docs.filter((d) => d.syncStatus === 'synced').length;
    const failed = docs.filter((d) => d.syncStatus === 'error').length;
    const lastSync = docs
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
      fileCount: docCount,
      folderCount,
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
