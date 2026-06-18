import { storageService } from '@/services/storageService.js';
import { caseService } from '@/services/caseService.js';
import { ocrService } from '@/services/ocrService.js';
import { caseFolderLogic } from './caseFolderLogic.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { fileSyncService } from '@/services/fileSyncService.js';
import { ok, fail } from '@/utils/result.js';

// fileLogic — keeps pages/components out of the service layer for document, OCR,
// folder and sync operations (Pages → Logic → Services → Providers).
export const fileLogic = {
  async uploadDocument(file, { caseId, folder } = {}, user) {
    try {
      const rec = await storageService.uploadDocument(file, { caseId, folder });
      await caseActivityService.record(caseId, 'document.upload', `Uploaded "${rec.name}" to ${folder}`, user);
      return ok(rec);
    } catch (e) { return fail(e); }
  },

  getUrl: (ref) => storageService.getUrl(ref),
  download: (ref) => storageService.download(ref),
  listDocuments: (caseId) => caseService.listDocuments(caseId),
  extract: (file) => ocrService.extract(file),

  async moveDocument(doc, folder, user) {
    const row = await storageService.moveDocument(doc.id, folder);
    await caseActivityService.record(doc.caseId, 'document.move', `Moved "${doc.name}" → ${folder}`, user);
    return ok(row);
  },
  copyDocument: (doc) => storageService.copyDocument(doc.id).then(ok),
  renameDocument: (id, name) => storageService.renameDocument(id, name).then(ok),

  async deleteDocument(doc, user) {
    await storageService.deleteDocument(doc.id, doc.ref);
    await caseActivityService.record(doc.caseId, 'document.delete', `Deleted "${doc.name}"`, user);
    return ok(true);
  },
  async bulkDelete(docs, user) {
    for (const d of docs) {
      // eslint-disable-next-line no-await-in-loop
      await storageService.deleteDocument(d.id, d.ref);
    }
    if (docs[0]) await caseActivityService.record(docs[0].caseId, 'document.delete', `Deleted ${docs.length} document(s)`, user);
    return ok({ count: docs.length });
  },
  async bulkMove(docs, folder, user) {
    for (const d of docs) {
      // eslint-disable-next-line no-await-in-loop
      await storageService.moveDocument(d.id, folder);
    }
    if (docs[0]) await caseActivityService.record(docs[0].caseId, 'document.move', `Moved ${docs.length} document(s) → ${folder}`, user);
    return ok({ count: docs.length });
  },

  // Folder management (delegates to caseFolderLogic).
  listFolders: (caseId, kind) => caseFolderLogic.list(caseId, kind),
  createFolder: (caseId, name, kind, user) => caseFolderLogic.create(caseId, name, kind, user),
  renameFolder: (folder, name, user) => caseFolderLogic.rename(folder, name, user),
  deleteFolder: (folder, opts, user) => caseFolderLogic.remove(folder, opts, user),

  syncAll: () => fileSyncService.syncAll(),
};

export default fileLogic;
