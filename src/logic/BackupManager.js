import { backupLogic } from './backupLogic.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { backupTargetService } from '@/services/backupTargetService.js';
import { ok, fail } from '@/utils/result.js';

// BackupManager — unified, provider-agnostic backup orchestration.
//   • Manual backup      → catalog entry (retention-aware) + .udb delivered to a destination
//   • Scheduled backup   → on-load catch-up using the frequency in backup settings
//   • Restore            → from a catalog entry (delegates to backupLogic)
//   • Retention rules    → delegated to backupLogic (FIFO + protected)
// The database snapshot is always the provider-agnostic UDB, so this works the
// same on local / supabase / firebase / mongodb. Logic-layer only — no provider
// import (destinations go through backupTargetService).

const INTERVAL_MS = {
  hourly: 3600e3,
  daily: 864e5,
  weekly: 7 * 864e5,
  monthly: 30 * 864e5,
};

const p2 = (n) => String(n).padStart(2, '0');
function udbName(d = new Date()) {
  return `LEXAI_${d.getFullYear()}_${p2(d.getMonth() + 1)}_${p2(d.getDate())}_${p2(d.getHours())}_${p2(d.getMinutes())}_${p2(d.getSeconds())}.udb`;
}

export const BackupManager = {
  // ---- destinations ----
  destinations() { return backupTargetService.list(); },

  // ---- manual backup ----
  // Records a catalog entry (browser-local history, retention enforced) and
  // delivers a portable .udb to the chosen destination.
  async backup({ destination = 'local', type = 'manual' } = {}, actor) {
    try {
      const cat = await backupLogic.create({ type }, actor);
      if (!cat.ok) return cat;
      const udb = await databaseAdminService.exportUdb();
      const delivery = await backupTargetService.send(destination, udbName(), JSON.stringify(udb, null, 2));
      return ok({ backup: cat.value.backup, removed: cat.value.removed, destination, delivery });
    } catch (e) { return fail(e); }
  },

  // ---- scheduled backup ----
  getSchedule() {
    const s = backupLogic.getSettings();
    return { frequency: s.frequency, time: s.time, retention: s.retention, autoCleanup: s.autoCleanup, lastRunAt: s.lastRunAt || null };
  },
  async setSchedule(patch, actor) { return backupLogic.saveSettings(patch, actor); },

  // Fire any due scheduled backup (best-effort, called on app load). Scheduled
  // backups are catalog-only (no download); manual backups handle delivery.
  async runDue(actor) {
    try {
      const s = backupLogic.getSettings();
      if (!s.frequency || s.frequency === 'manual') return { ran: false, reason: 'manual' };
      const interval = INTERVAL_MS[s.frequency] || INTERVAL_MS.daily;
      const last = s.lastRunAt ? new Date(s.lastRunAt).getTime() : 0;
      if (last && (Date.now() - last) < interval) return { ran: false, reason: 'not-due' };
      const res = await backupLogic.create({ type: 'scheduled' }, actor);
      await backupLogic.saveSettings({ lastRunAt: new Date().toISOString() }, actor);
      return { ran: res.ok, result: res };
    } catch (e) { return { ran: false, error: e.message }; }
  },

  // ---- list / restore / retention ----
  list() { return backupLogic.list(); },
  stats() { return backupLogic.stats(); },
  restore(id, actor) { return backupLogic.restore(id, actor); },
  remove(id, actor) { return backupLogic.remove(id, actor); },
  setProtected(id, isProtected, actor) { return backupLogic.setProtected(id, isProtected, actor); },
  applyRetention(actor) { return backupLogic.applyRetention(actor); },
};

export default BackupManager;
