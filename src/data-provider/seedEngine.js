// seedEngine — provider-agnostic clearing and row counts. Demo seeding has been
// removed per architecture audit. The permissions catalog is now managed through
// the Permission Manager UI only — no programmatic seeding on boot or install.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { collectionNames } from '@/data-provider/schema/index.js';

const db = () => getDatabaseProvider();

export const seedEngine = {
  async seedMasterData() {
    return [];
  },

  // Wipe every known collection. Returns per-collection removed counts.
  async clearAll() {
    const provider = db();
    const removed = {};
    for (const name of collectionNames) {
      // eslint-disable-next-line no-await-in-loop
      removed[name] = await provider.clear(name).catch(() => 0);
    }
    return removed;
  },

  // Current row counts per collection (for the Database Manager dashboard).
  async counts() {
    const provider = db();
    const out = {};
    for (const name of collectionNames) {
      // eslint-disable-next-line no-await-in-loop
      out[name] = await provider.count(name).catch(() => 0);
    }
    return out;
  },
};

export default seedEngine;
