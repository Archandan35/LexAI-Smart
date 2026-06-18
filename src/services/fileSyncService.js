import { cloudProviderService } from './cloudProviderService.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { config } from '@/config/config.js';
import { nowISO } from '@/utils/id.js';

// fileSyncService — orchestrates cloud sync for case/draft files only (NOT the
// database backup module, which is separate). Cloud-first: after a DB write, we
// push to the configured provider and stamp the record's sync status.
// Status: 'synced' (🟢) | 'saving' (🟡) | 'pending' | 'error' (🔴).
export const fileSyncService = {
  enabled() { return config.storage?.autoSync !== false; },

  async onChange(action, record) {
    // Local provider: the DB write IS the durable copy — mark synced.
    if (!cloudProviderService.isCloud()) {
      if (record?.id && action !== 'delete') {
        return documentsRepository.update(record.id, { syncStatus: 'synced', lastSyncAt: nowISO() });
      }
      return record;
    }
    if (!this.enabled()) {
      if (record?.id && action !== 'delete') return documentsRepository.update(record.id, { syncStatus: 'pending' });
      return record;
    }
    try {
      const res = await cloudProviderService.push(action, record);
      if (record?.id && action !== 'delete') {
        return documentsRepository.update(record.id, {
          syncStatus: res?.ok ? 'synced' : 'error', lastSyncAt: nowISO(), syncMessage: res?.reason || '',
        });
      }
      return record;
    } catch (e) {
      if (record?.id && action !== 'delete') {
        return documentsRepository.update(record.id, { syncStatus: 'error', syncMessage: e.message });
      }
      return record;
    }
  },

  // Full resync of a case's files (Sync Now).
  async syncAll() {
    const docs = await documentsRepository.getAll();
    let synced = 0;
    for (const d of docs) {
      // eslint-disable-next-line no-await-in-loop
      const r = await this.onChange('sync', d);
      if (r?.syncStatus === 'synced') synced += 1;
    }
    return { total: docs.length, synced };
  },
};

export default fileSyncService;
