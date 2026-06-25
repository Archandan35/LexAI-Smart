// migrateLocalStorage — one-time utility to read existing localStorage data and
// push it into the active database provider (Supabase / Mongo / Firebase).
//
// Call this from the browser console (or wrap in a UI button):
//   import { migrateLocalStorage } from '@/utils/migrateLocalStorage.js';
//   await migrateLocalStorage();
//
// It reads every known collection from the old `lexai.db.v1` blob + the
// storage map under `lexai.storage.v1`, upserts into the active provider,
// then wipes localStorage. Returns a summary of what was moved.

import { getDatabaseProvider } from '@/providers/database/index.js';
import { collectionNames } from '@/data-provider/schema/index.js';
import { FieldMapper } from '@/core/FieldMapper.js';

const DB_KEY = 'lexai.db.v1';
const STORAGE_KEY = 'lexai.storage.v1';

function readLocal(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearLocal(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export async function migrateLocalStorage() {
  const db = getDatabaseProvider();
  const blob = readLocal(DB_KEY);
  const report = { collections: {}, storage: 0, errors: [] };

  if (!blob || Object.keys(blob).length === 0) {
    report.message = 'No localStorage database found — nothing to migrate.';
    return report;
  }

  // Migrate each known collection
  for (const name of collectionNames) {
    const rows = blob[name];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    try {
      // Transform each row through FieldMapper so provider field names are used
      const mapped = rows.map((r) => FieldMapper.toProvider(name, r));
      const created = await db.bulkCreate(name, mapped);
      report.collections[name] = created.length;
    } catch (err) {
      // Fallback: insert one-by-one so a single bad record doesn't block the rest
      let ok = 0;
      for (const row of rows) {
        try {
          const mapped = FieldMapper.toProvider(name, row);
          await db.create(name, mapped);
          ok++;
        } catch (e2) {
          report.errors.push({ collection: name, id: row.id, error: e2.message });
        }
      }
      report.collections[name] = ok;
    }
  }

  // Migrate stored files (if any) — these are data URLs and cannot be pushed to
  // a remote bucket automatically; report their presence so the user can act.
  const storageMap = readLocal(STORAGE_KEY);
  if (storageMap && typeof storageMap === 'object') {
    const keys = Object.keys(storageMap);
    report.storage = keys.length;
    if (keys.length > 0) {
      report.storageWarning = `${keys.length} file(s) found in localStorage storage. These must be uploaded manually via the UI (data URLs cannot be migrated programmatically to a remote bucket).`;
    }
  }

  // Wipe old localStorage data
  clearLocal(DB_KEY);
  clearLocal(STORAGE_KEY);

  const total = Object.values(report.collections).reduce((a, b) => a + b, 0);
  report.message = `Migration complete: ${total} record(s) moved across ${Object.keys(report.collections).length} collection(s).`;
  return report;
}

export default migrateLocalStorage;
