import { databaseAdminService } from '@/services/databaseAdminService.js';
import { databaseHealthService } from '@/services/databaseHealthService.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';

export const RollbackEngine = {
  async rollbackInstall() {
    try {
      await databaseAdminService.rollback(0);
      return { success: true, action: 'Schema version reset to 0' };
    } catch (e) {
      return { success: false, error: e?.message || 'Rollback failed' };
    }
  },

  async clearCollections(collections) {
    const provider = getDatabaseProvider();
    const removed = {};
    for (const name of collections) {
      try {
        const rows = await provider.list(name, {});
        if (Array.isArray(rows) && rows.length > 0) {
          await provider.clear(name);
          removed[name] = rows.length;
        }
      } catch {
        removed[name] = 0;
      }
    }
    return removed;
  },

  async clearAllData() {
    const all = listSchemas().map((s) => s.collection);
    return this.clearCollections(all);
  },

  async resetToFactory() {
    try {
      await databaseAdminService.clearAll();
      await databaseAdminService.ensureSchema({ coreOnly: false });
      await databaseAdminService.stampInstalled();
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message || 'Factory reset failed' };
    }
  },

  async repairHealth() {
    try {
      const result = await databaseHealthService.repair();
      return { success: true, actions: result.actions || [] };
    } catch (e) {
      return { success: false, error: e?.message || 'Health repair failed' };
    }
  },
};

export default RollbackEngine;
