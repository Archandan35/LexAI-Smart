import { backupService } from '@/services/backupService.js';
import { backupFileService } from '@/services/backupFileService.js';
import { auditService } from '@/services/auditService.js';
import { sha256Hex } from '@/utils/crypto.js';
import { downloadFile } from '@/utils/exportData.js';
import { config } from '@/config/config.js';
import { ok, fail } from '@/utils/result.js';

// Universal Database Backup format.
export const UDB_VERSION = '1.0';
export const SCHEMA_VERSION = 15;

export const DEFAULT_SETTINGS = {
  retention: 5,          // max stored backups (number) or 'unlimited'
  autoCleanup: true,
  frequency: 'daily',    // hourly | daily | weekly | monthly | manual
  time: '02:00',
  compression: true,     // simulated flag (no real compression client-side)
  encryption: true,      // simulated flag (demo only — see note)
  notifications: true,
  storageLimitMb: 100,
};

// Pad a number for the filename timestamp.
const p2 = (n) => String(n).padStart(2, '0');

// LEXAI_BACKUP_YYYY_MM_DD_HH_MM_SS.udb
function backupFileName(d = new Date()) {
  return `LEXAI_BACKUP_${d.getFullYear()}_${p2(d.getMonth() + 1)}_${p2(d.getDate())}_${p2(d.getHours())}_${p2(d.getMinutes())}_${p2(d.getSeconds())}.udb`;
}

function approxSize(obj) {
  try { return new Blob([JSON.stringify(obj)]).size; } catch { return JSON.stringify(obj).length; }
}

// Build a full UDB snapshot object from current application data.
async function buildSnapshot() {
  const data = await backupService.readDatabase();
  const payload = JSON.stringify(data);
  const checksum = await sha256Hex(payload);
  const now = new Date();
  return {
    format: 'UDB',
    udbVersion: UDB_VERSION,
    appVersion: config.app.version,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    checksum,
    encryption: DEFAULT_SETTINGS.encryption, // flag only
    collections: Object.keys(data || {}),
    counts: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
    data,
  };
}

export const backupLogic = {
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...(backupService.readSettings() || {}) };
  },
  async saveSettings(patch, actor) {
    const next = { ...this.getSettings(), ...patch };
    backupService.writeSettings(next);
    await auditService.record({ action: 'backup.settings', module: 'backup', user: actor, details: 'Updated backup settings' });
    return ok(next);
  },

  list() {
    // Strip the heavy payload for listing; keep metadata.
    return backupService.listBackups().map(({ data, ...meta }) => meta);
  },

  stats() {
    const all = backupService.listBackups();
    const totalBytes = all.reduce((s, b) => s + (b.size || 0), 0);
    const protectedCount = all.filter((b) => b.protected).length;
    const sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const s = this.getSettings();
    return {
      total: all.length,
      protectedCount,
      totalBytes,
      lastBackup: sorted[0]?.createdAt || null,
      retention: s.retention,
      frequency: s.frequency,
      time: s.time,
      lastStatus: sorted[0]?.status || 'none',
    };
  },

  async create({ type = 'manual', note = '' } = {}, actor) {
    try {
      const started = Date.now();
      const snap = await buildSnapshot();
      const id = `bk_${snap.checksum.slice(0, 10)}_${started.toString(36)}`;
      const record = {
        id,
        name: backupFileName(new Date(snap.createdAt)),
        type,
        note,
        status: 'Completed',
        size: approxSize(snap.data),
        createdAt: snap.createdAt,
        durationMs: Date.now() - started,
        protected: false,
        checksum: snap.checksum,
        udbVersion: snap.udbVersion,
        appVersion: snap.appVersion,
        schemaVersion: snap.schemaVersion,
        counts: snap.counts,
        data: snap.data,
      };

      // Optional: store a copy of the UDB in the file storage Backup folder.
      try {
        await backupFileService.ensureBackupRoot();
        const dbResult = await backupFileService.createDatabaseBackup(snap);
        record.dbBackupRef = dbResult.ref;
        record.dbBackupFolder = dbResult.folder;
        const fileResult = await backupFileService.createDatafileBackup();
        record.fileBackupRef = fileResult.ref;
        record.fileBackupFolder = fileResult.folder;
      } catch (fileErr) {
        // File-storage backup is best-effort; DB backup always succeeds.
      }

      const list = backupService.listBackups();
      list.unshift(record);
      backupService.saveCatalog(list);

      const cleanup = this.applyRetention(actor);
      await auditService.record({ action: 'backup.create', module: 'backup', user: actor, details: `${record.name} (${type})` });
      return ok({ backup: stripPayload(record), removed: cleanup.removed });
    } catch (e) {
      return fail(e);
    }
  },

  // FIFO retention: keep newest N non-protected backups; protected ones are
  // always excluded from cleanup. Also removes file-storage backup folders.
  applyRetention(actor) {
    const s = this.getSettings();
    if (!s.autoCleanup || s.retention === 'unlimited') return { removed: [] };
    const limit = Number(s.retention);
    if (!limit || Number.isNaN(limit)) return { removed: [] };

    const list = backupService.listBackups();
    const protectedOnes = list.filter((b) => b.protected);
    const normal = list.filter((b) => !b.protected).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const keepNormalCount = Math.max(0, limit - 0);
    const keep = normal.slice(0, keepNormalCount);
    const removed = normal.slice(keepNormalCount);
    if (!removed.length) return { removed: [] };

    // Remove file-storage backup folders for removed entries
    for (const r of removed) {
      if (r.dbBackupRef || r.fileBackupRef) {
        backupFileService.deleteBackupPair(r.dbBackupRef, r.fileBackupRef).catch(() => {});
      }
    }

    const merged = [...protectedOnes, ...keep].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    backupService.saveCatalog(merged);
    removed.forEach((r) => auditService.record({ action: 'backup.autodelete', module: 'backup', user: actor, details: `Retention removed ${r.name}` }));
    return { removed: removed.map((r) => r.name) };
  },

  async setProtected(id, isProtected, actor) {
    const list = backupService.listBackups();
    const b = list.find((x) => x.id === id);
    if (!b) return fail('Backup not found.');
    b.protected = isProtected;
    backupService.saveCatalog(list);
    await auditService.record({ action: isProtected ? 'backup.protect' : 'backup.unprotect', module: 'backup', user: actor, details: b.name });
    return ok(stripPayload(b));
  },

  async remove(id, actor) {
    const list = backupService.listBackups();
    const b = list.find((x) => x.id === id);
    if (!b) return fail('Backup not found.');
    if (b.protected) return fail('Protected backups must be unprotected before deletion.');

    // Remove file-storage backup folders
    if (b.dbBackupRef || b.fileBackupRef) {
      await backupFileService.deleteBackupPair(b.dbBackupRef, b.fileBackupRef).catch(() => {});
    }

    backupService.saveCatalog(list.filter((x) => x.id !== id));
    await auditService.record({ action: 'backup.delete', module: 'backup', user: actor, details: b.name });
    return ok(true);
  },

  // Verify a stored backup's integrity by recomputing its checksum.
  async verify(id) {
    const b = backupService.listBackups().find((x) => x.id === id);
    if (!b) return { valid: false, reason: 'Not found' };
    return this.verifyRecord(b);
  },
  async verifyRecord(b) {
    try {
      const recomputed = await sha256Hex(JSON.stringify(b.data));
      const valid = recomputed === b.checksum;
      return { valid, checksum: recomputed, expected: b.checksum, reason: valid ? 'Checksum matches' : 'Checksum mismatch — backup may be corrupted' };
    } catch (e) {
      return { valid: false, reason: e.message };
    }
  },

  async restore(id, actor) {
    try {
      const b = backupService.listBackups().find((x) => x.id === id);
      if (!b) return fail('Backup not found.');
      const integrity = await this.verifyRecord(b);
      if (!integrity.valid) return fail(`Restore aborted: ${integrity.reason}`);
      await backupService.writeDatabase(b.data);
      await auditService.record({ action: 'backup.restore', module: 'backup', user: actor, details: `Restored ${b.name}` });
      return ok({ name: b.name, restoredAt: new Date().toISOString(), counts: b.counts });
    } catch (e) {
      return fail(e);
    }
  },

  export(id) {
    const b = backupService.listBackups().find((x) => x.id === id);
    if (!b) return fail('Backup not found.');
    // .udb file = the full snapshot object (JSON). Metadata + checksum preserved.
    const snapshot = {
      format: 'UDB', udbVersion: b.udbVersion, appVersion: b.appVersion, schemaVersion: b.schemaVersion,
      createdAt: b.createdAt, checksum: b.checksum, counts: b.counts, encryption: b.encryption, data: b.data,
    };
    downloadFile(b.name, JSON.stringify(snapshot, null, 2), 'application/octet-stream');
    return ok(true);
  },

  // Parse + validate an imported .udb file's text content.
  async parseImport(text) {
    let snap;
    try { snap = JSON.parse(text); } catch { return { ok: false, reason: 'File is not valid UDB JSON.' }; }
    if (snap.format !== 'UDB' || !snap.data) return { ok: false, reason: 'Not a UDB backup file.' };
    const recomputed = await sha256Hex(JSON.stringify(snap.data));
    const checksumOk = !snap.checksum || recomputed === snap.checksum;
    const versionOk = !snap.schemaVersion || snap.schemaVersion <= SCHEMA_VERSION;
    return {
      ok: true,
      snapshot: snap,
      checksumOk,
      versionOk,
      reason: !checksumOk ? 'Checksum mismatch (possible corruption)' : (!versionOk ? 'Newer schema than this app supports' : 'Valid backup'),
    };
  },

  async importBackup(snapshot, { restoreNow = false } = {}, actor) {
    try {
      const now = new Date();
      const record = {
        id: `bk_import_${now.getTime().toString(36)}`,
        name: backupFileName(now),
        type: 'imported',
        status: 'Completed',
        size: approxSize(snapshot.data),
        createdAt: now.toISOString(),
        durationMs: 0,
        protected: false,
        checksum: snapshot.checksum || await sha256Hex(JSON.stringify(snapshot.data)),
        udbVersion: snapshot.udbVersion || UDB_VERSION,
        appVersion: snapshot.appVersion || config.app.version,
        schemaVersion: snapshot.schemaVersion || SCHEMA_VERSION,
        counts: snapshot.counts || {},
        data: snapshot.data,
      };
      const list = backupService.listBackups();
      list.unshift(record);
      backupService.saveCatalog(list);
      this.applyRetention(actor);
      await auditService.record({ action: 'backup.import', module: 'backup', user: actor, details: record.name });
      if (restoreNow) return this.restore(record.id, actor);
      return ok({ backup: stripPayload(record) });
    } catch (e) {
      return fail(e);
    }
  },
};

function stripPayload(b) { const { data, ...meta } = b; return meta; }

export { backupFileName };
export default backupLogic;
