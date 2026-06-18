import StorageProvider from './StorageProvider.js';
import { uid } from '@/utils/id.js';

const KEY = 'lexai.storage.v1';

// LocalStorageProvider — stores file payloads as base64 data URLs in
// localStorage. Fine for demo/offline; swap for S3/R2/Supabase in production.
export default class LocalStorageProvider extends StorageProvider {
  #read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }

  #write(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* quota */ }
  }

  async upload(file, opts = {}) {
    const ref = opts.ref || uid('file');
    const dataUrl = await toDataUrl(file);
    const map = this.#read();
    map[ref] = {
      ref,
      name: file.name || opts.name || 'file',
      mime: file.type || opts.mime || 'application/octet-stream',
      size: file.size || (dataUrl?.length ?? 0),
      dataUrl,
    };
    this.#write(map);
    return { ref, name: map[ref].name, size: map[ref].size, mime: map[ref].mime };
  }

  async download(ref) {
    const map = this.#read();
    return map[ref] || null;
  }

  async getUrl(ref) {
    const map = this.#read();
    return map[ref]?.dataUrl || null;
  }

  async delete(ref) {
    const map = this.#read();
    delete map[ref];
    this.#write(map);
    return true;
  }
}

function toDataUrl(file) {
  // Accept a real File/Blob, or a plain object carrying text (tests/seed).
  if (!file || typeof file.arrayBuffer !== 'function') {
    const text = file?.text || '';
    return Promise.resolve(`data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
