import { getFileStorageProvider } from '@/providers/file-storage/index.js';
import { caseService } from '@/services/caseService.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';

const ROOT = 'Backup';

const fmt = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} - ${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
};

function dbFolderName(ts) { return `database-backup-${fmt(ts)}`; }
function fileFolderName(ts) { return `datafile-backup-${fmt(ts)}`; }

const CONCURRENCY = 3;

async function copyFile(provider, srcRef, destPath) {
  const blob = await provider.download(srcRef);
  if (!blob) return false;
  const result = await provider.upload(blob, destPath);
  return !!result;
}

async function runWithConcurrency(items, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export const backupFileService = {
  async ensureBackupRoot() {
    const marker = `${ROOT}/.backup-root`;
    const blob = new Blob([''], { type: 'text/plain' });
    const result = await getFileStorageProvider().upload(blob, marker).catch(() => null);
    return !!result;
  },

  async createDatabaseBackup(udbData) {
    const ts = new Date();
    const folder = dbFolderName(ts);
    const name = `LEXAI_BACKUP_${fmt(ts).replace(/ - /g, '_').replace(/-/g, '_')}.udb`;
    const path = `${ROOT}/${folder}/${name}`;
    const blob = new Blob([JSON.stringify(udbData, null, 2)], { type: 'application/octet-stream' });
    const result = await getFileStorageProvider().upload(blob, path);
    return { ref: result.ref, folder, path, createdAt: ts.toISOString() };
  },

  // Mirror all case files by downloading each from the primary provider and
  // re-uploading to the backup folder. Also stores a manifest for metadata.
  async createDatafileBackup() {
    const ts = new Date();
    const folder = fileFolderName(ts);
    const provider = getFileStorageProvider();
    const backlink = `${ROOT}/${folder}`;
    const copied = [];
    const failed = [];

    const cases = await caseService.listCases();
    for (const c of cases) {
      const docs = await documentsRepository.getAll({ caseId: c.id });
      if (!docs || !docs.length) continue;
      const cn = c.caseNumber || c.case_display_number || c.id;
      const items = docs.filter((d) => d.ref).map((d) => {
        const dest = `${backlink}/${cn}/${d.ref.replace(/^.*\//, '')}`;
        return { doc: d, dest };
      });

      // eslint-disable-next-line no-await-in-loop
      const results = await runWithConcurrency(items, ({ doc, dest }) =>
        copyFile(provider, doc.ref, dest).then((ok) => {
          if (ok) copied.push(doc.ref); else failed.push(doc.ref);
        }),
      );
    }

    // Write manifest with metadata for every file (including failed ones)
    const manifest = {
      createdAt: ts.toISOString(),
      copiedCount: copied.length,
      failedCount: failed.length,
      failedRefs: failed,
      cases: {},
    };
    for (const c of cases) {
      const docs = await documentsRepository.getAll({ caseId: c.id });
      if (!docs || !docs.length) continue;
      manifest.cases[c.id] = {
        caseNumber: c.caseNumber || c.case_display_number || 'Unknown',
        files: docs.map((d) => ({
          name: d.name, ref: d.ref, folder: d.folder, folder_id: d.folder_id,
          mime: d.mime, size: d.size, uploadedAt: d.uploaded_at || d.uploadedAt,
        })),
      };
    }

    const manifestPath = `${backlink}/manifest.json`;
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    await provider.upload(blob, manifestPath);
    return { ref: manifestPath, folder, path: backlink, createdAt: ts.toISOString(), copied: copied.length, failed: failed.length };
  },

  // Delete a backup pair (database + file folders) from storage.
  async deleteBackupPair(dbRef, fileRef) {
    const provider = getFileStorageProvider();
    try { await provider.delete(dbRef).catch(() => {}); } catch {}
    try { await provider.delete(fileRef).catch(() => {}); } catch {}
  },
};

export default backupFileService;
