import { getFileStorageProvider } from '@/providers/file-storage/index.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { getOCRProvider } from '@/providers/ocr/index.js';
import { fileSyncService } from './fileSyncService.js';
import { nowISO } from '@/utils/id.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
]);
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 3840;
const IMAGE_QUALITY = 0.82;

function validateFile(file) {
  if (!file) throw new Error('No file provided');
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 100MB.`);
  }
  const mime = file.type?.toLowerCase() || '';
  if (mime && !ALLOWED_MIME_TYPES.has(mime) && !mime.startsWith('image/')) {
    throw new Error(`File type "${file.type}" is not supported. Allowed: PDF, DOC, DOCX, images, text.`);
  }
}

async function compressImage(file) {
  if (!file.type?.startsWith('image/')) return file;
  if (file.size < 200 * 1024) return file;

  try {
    const img = await createImageBitmap(file);
    let { width, height } = img;
    if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
      const ratio = Math.min(IMAGE_MAX_DIMENSION / width, IMAGE_MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    img.close();

    const outputMime = file.type === 'image/png' ? 'image/png' : 'image/webp';
    const blob = await new Promise((r) => canvas.toBlob(r, outputMime, IMAGE_QUALITY));
    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, outputMime === 'image/webp' ? '.webp' : '.png'), {
      type: outputMime,
      lastModified: Date.now(),
    });
    return compressed;
  } catch {
    return file;
  }
}

export const storageService = {
  async upload(file, { caseId, folder = 'Miscellaneous', ocr = false, compress = true, onProgress } = {}) {
    validateFile(file);
    const processed = compress ? await compressImage(file) : file;
    const stored = await getFileStorageProvider().upload(processed, null, onProgress);
    let text = '';
    if (ocr && processed.type === 'image/jpeg' || ocr && processed.type === 'image/png') {
      try { ({ text } = await getOCRProvider().extract(processed)); } catch { text = ''; }
    }
    return { ...stored, text, caseId, folder, compressed: processed !== file };
  },

  async uploadDocument(file, { caseId, folder = 'Miscellaneous', folderId = null, ocr = true, compress = true, onProgress } = {}) {
    validateFile(file);
    const processed = compress ? await compressImage(file) : file;
    const fileRef = folderId ? `${folderId}/${processed.name}` : `${folder}/${processed.name}`;
    const stored = await getFileStorageProvider().upload(processed, fileRef, onProgress);
    let text = '';
    if (ocr) {
      try { ({ text } = await getOCRProvider().extract(processed)); } catch { text = ''; }
    }
    return this.createDocumentRecord({
      caseId: caseId || null, name: stored.name, folder, folder_id: folderId,
      mime: stored.mime, size: stored.size, ref: stored.ref, text, compressed: processed !== file,
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
