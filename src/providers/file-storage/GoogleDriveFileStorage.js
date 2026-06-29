import FileStorageProvider from './FileStorageProvider.js';
import { config } from '@/config/config.js';

export default class GoogleDriveFileStorage extends FileStorageProvider {
  constructor() {
    super();
    this.cfg = config.storage?.googleDrive || {};
    this.backendUrl = this.cfg.backendUrl || '';
    this.rootFolder = config.storage?.rootFolder || 'LexAI';
  }

  #ready() { return !!(this.backendUrl && this.cfg.clientId); }

  #callBackend(action, payload) {
    if (!this.#ready()) {
      console.warn('Google Drive backend not configured — skipping sync');
      return null;
    }
    return fetch(`${this.backendUrl}/api/drive/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, rootFolder: this.rootFolder }),
    }).then((r) => r.ok ? r.json() : null).catch((e) => {
      console.warn('Google Drive sync failed:', e.message);
      return null;
    });
  }

  async upload(file, path) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('rootFolder', this.rootFolder);
    const res = await fetch(`${this.backendUrl}/api/drive/upload`, { method: 'POST', body: formData });
    if (!res.ok) return { ref: path, name: file.name, size: file.size, mime: file.type, synced: false };
    const data = await res.json();
    return { ref: data.id || path, name: file.name, size: file.size, mime: file.type, synced: true };
  }

  async getUrl(ref) {
    const data = await this.#callBackend('url', { ref });
    return data?.url || null;
  }

  async download(ref) {
    const res = await fetch(`${this.backendUrl}/api/drive/download?ref=${encodeURIComponent(ref)}`);
    return res.ok ? res.blob() : null;
  }

  async delete(ref) {
    const data = await this.#callBackend('delete', { ref });
    return data?.ok || false;
  }

  async move(oldRef, newRef) {
    const data = await this.#callBackend('move', { oldRef, newRef });
    return data?.ok || false;
  }
}
