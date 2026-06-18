import { getStorageProvider } from '@/providers/storage/index.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { getOCRProvider } from '@/providers/ocr/index.js';
import { fileSyncService } from './fileSyncService.js';
import { nowISO } from '@/utils/id.js';

// storageService — the SINGLE entry point the UI/logic use for case & draft
// files. It persists the binary via the configured StorageProvider, a metadata
// row via the DatabaseProvider, and triggers cloud sync via fileSyncService.
// UI code never imports a provider directly — everything goes through here.
export const storageService = {
  async upload(file, { caseId, folder = 'Miscellaneous', ocr = false } = {}) {
    const stored = await getStorageProvider().upload(file);
    let text = '';
    if (ocr) {
      try { ({ text } = await getOCRProvider().extract(file)); } catch { text = ''; }
    }
    return { ...stored, text, caseId, folder };
  },

  // Upload + create the `documents` metadata row in one step (with OCR).
  async uploadDocument(file, { caseId, folder = 'Miscellaneous', ocr = true } = {}) {
    const stored = await getStorageProvider().upload(file);
    let text = '';
    if (ocr) {
      try { ({ text } = await getOCRProvider().extract(file)); } catch { text = ''; }
    }
    return this.createDocumentRecord({
      caseId: caseId || null, name: stored.name, folder, mime: stored.mime, size: stored.size, ref: stored.ref, text,
    });
  },

  async createDocumentRecord(data) {
    const record = await documentsRepository.create({
      version: 1, syncStatus: 'pending', uploadedAt: nowISO(), ...data,
    });
    const synced = await fileSyncService.onChange('create', record);
    return synced || record;
  },

  getUrl: (ref) => getStorageProvider().getUrl(ref),
  download: (ref) => getStorageProvider().download(ref),

  async moveDocument(id, folder) {
    const row = await documentsRepository.update(id, { folder });
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
    if (ref) await getStorageProvider().delete(ref);
    await fileSyncService.onChange('delete', { id, ref });
    return documentsRepository.delete(id);
  },
};

export default storageService;
