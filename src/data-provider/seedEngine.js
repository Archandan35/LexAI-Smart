// seedEngine — provider-agnostic data seeding / clearing. Writes through the
// active DatabaseProvider only (no SDK, no services/logic imports), so it works
// identically on local / supabase / firebase / mongodb.
//
// Division of responsibility:
//   • Core auth data (roles + super-admin) is owned by authLogic.ensureSeeded()
//     so there is ONE source of truth — the Database Manager logic calls that.
//   • This engine owns: the permissions CATALOG, demo fixtures, clearing, and
//     row counts for the Database Manager UI.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { collectionNames } from '@/data-provider/schema/index.js';
import seed from '@/database/seed.js';
import { MODULES, ACTIONS, permKey } from '@/constants/permissions.js';
import { uid } from '@/utils/id.js';

const db = () => getDatabaseProvider();

// Build the permission catalog rows from the RBAC vocabulary.
function permissionCatalog() {
  const rows = [];
  MODULES.forEach((m) => {
    ACTIONS.forEach((a) => {
      rows.push({
        id: `perm_${m.key}_${a.key}`,
        code: permKey(m.key, a.key),
        module: m.key,
        action: a.key,
        label: `${m.label} · ${a.label}`,
        description: `${a.label} on ${m.label}`,
      });
    });
  });
  return rows;
}

export const seedEngine = {
  // Insert demo fixtures (cases, drafts, documents, …) into any collection that
  // is currently empty. Idempotent — never duplicates existing rows.
  async seedDemo() {
    const provider = db();
    const written = {};
    for (const [name, rows] of Object.entries(seed)) {
      if (!Array.isArray(rows) || !rows.length) continue;
      // eslint-disable-next-line no-await-in-loop
      const existing = await provider.count(name).catch(() => 0);
      if (existing > 0) { written[name] = 0; continue; }
      // eslint-disable-next-line no-await-in-loop
      const created = await provider.bulkCreate(name, rows);
      written[name] = created.length;
    }
    return written;
  },

  // Populate the permissions catalog collection if empty.
  async seedPermissions() {
    const provider = db();
    const existing = await provider.count('permissions').catch(() => 0);
    if (existing > 0) return 0;
    const created = await provider.bulkCreate('permissions', permissionCatalog());
    return created.length;
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

export { permissionCatalog };
export default seedEngine;
