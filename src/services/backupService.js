// backupService — low-level storage for the Backup & Recovery module.
//
// De-leaked: the database snapshot now flows through the PROVIDER (via
// databaseAdminService.snapshot/restore), so backups work on ANY provider — not
// just the local localStorage blob. The backup CATALOG and SETTINGS (browser-
// local module state) go through the preferences provider, so this service no
// longer touches localStorage directly.
import { databaseAdminService } from './databaseAdminService.js';
import { preferencesService } from './preferencesService.js';
import { collectionNames } from '@/data-provider/schema/index.js';

const CATALOG_KEY = 'lexai.backups.v1';
const SETTINGS_KEY = 'lexai.backup.settings.v1';

export const backupService = {
  // Full database snapshot (what gets backed up) — provider-agnostic.
  readDatabase() { return databaseAdminService.snapshot(collectionNames); },
  // Restore a snapshot back into the active provider.
  writeDatabase(data) { return databaseAdminService.restore(data); },

  // Backup catalog (array of backup records, payload included) — browser-local.
  listBackups() { const v = preferencesService.get(CATALOG_KEY, []); return Array.isArray(v) ? v : []; },
  saveCatalog(list) { return preferencesService.set(CATALOG_KEY, list); },

  // Settings.
  readSettings() { return preferencesService.get(SETTINGS_KEY, null); },
  writeSettings(s) { return preferencesService.set(SETTINGS_KEY, s); },
};

export default backupService;
