import { getFileStorageProvider } from '@/providers/file-storage/index.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { getOCRProvider } from '@/providers/ocr/index.js';
import { fileSyncService } from './fileSyncService.js';
import { nowISO } from '@/utils/id.js';

// storageService — the SINGLE entry point the UI/logic use for case & draft
// files. It persists the binary via the unified FileStorageProvider interface
// (which handles primary + Google Drive dual-write automatically), creates a
// metadata row via the DatabaseProvider, and triggers cloud sync.
// UI code never imports a provider directly — everything goes through here.
export const storageService = {
  async upload(file, { caseId, folder = 'Miscellaneous', ocr = false } = {}) {
    const stored = await getFileStorageProvider().upload(file);
    let text = '';
    if (ocr) {
      try { ({ text } = await getOCRProvider().extract(file)); } catch { text = ''; }
    }
    return { ...stored, text, caseId, folder };
  },

  // Upload + create the `documents` metadata row in one step (with OCR).
  // folderId is the case_folders.id; folder name is resolved by the caller for display.
  async uploadDocument(file, { caseId, folder = 'Miscellaneous', folderId = null, ocr = true } = {}) {
    const fileRef = folderId ? `${folderId}/${file.name}` : `${folder}/${file.name}`;
    const stored = await getFileStorageProvider().upload(file, fileRef);
    let text = '';
    if (ocr) {
      try { ({ text } = await getOCRProvider().extract(file)); } catch { text = ''; }
    }
    return this.createDocumentRecord({
      caseId: caseId || null, name: stored.name, folder, folder_id: folderId, mime: stored.mime, size: stored.size, ref: stored.ref, text,
    });
  },

  async createDocumentRecord(data) {
    const record = await documentsRepository.create({
      version: 1, syncStatus: 'pending', uploadedAt: nowISO(), ...data,
    });
    const synced = await fileSyncService.onChange('create', record);
    return synced || record;
  },

  getUrl: (ref) => getFileStorageProvider().getUrl(ref),
  download: (ref) => getFileStorageProvider().download(ref),

  async moveDocument(id, folder, folderId) {
    const row = await documentsRepository.update(id, { folder, folder_id: folderId || null });
    await fileSyncService.onChange('move', row);
    return row;
  },

  async renameDocument(id, name) {
    const row = await documentsRepository.update(id, { name });
    await fileSyncService.onChange('rename', row);
    return row;
  },

  async copyDocument(id) {
    const doc = await documentsRepository.getById(id);
    if (!doc) return null;
    const { id: _drop, ...rest } = doc;
    return this.createDocumentRecord({ ...rest, name: `Copy of ${doc.name}` });
  },

  async deleteDocument(id, ref) {
    if (ref) await getFileStorageProvider().delete(ref);
    await fileSyncService.onChange('delete', { id, ref });
    return documentsRepository.delete(id);
  },
};

export default storageService;
