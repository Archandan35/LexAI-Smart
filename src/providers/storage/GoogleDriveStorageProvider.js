import StorageProvider from './StorageProvider.js';
import { config } from '@/config/config.js';

// GoogleDriveStorageProvider — reference TEMPLATE. Real Google Drive integration
// requires a BACKEND to hold the OAuth client secret + refresh token and perform
// uploads (these must never live in a browser bundle). This template documents
// the contract and the env vars a backend would consume. It is intentionally
// inert client-side: methods throw a clear, honest error until a backend exists.
//
// Activate with VITE_STORAGE_PROVIDER=google_drive once a backend proxy is wired.
export default class GoogleDriveStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.cfg = config.storage?.googleDrive || {};
    this.rootFolder = config.storage?.rootFolder || 'LexAI';
  }

  #unavailable() {
    throw new Error('Google Drive requires a backend proxy (OAuth secret + refresh token cannot run in the browser). Configure a backend, then enable VITE_STORAGE_PROVIDER=google_drive.');
  }

  async upload() { return this.#unavailable(); }
  async download() { return this.#unavailable(); }
  async delete() { return this.#unavailable(); }
  async getUrl() { return this.#unavailable(); }

  // Cloud-sync hooks consumed by fileSyncService (graceful, non-throwing).
  async sync() { return { ok: false, provider: 'google_drive', reason: 'Backend not configured' }; }
  async testConnection() {
    const ready = !!(this.cfg.clientId && this.cfg.refreshToken);
    return { ok: false, provider: 'google_drive', message: ready ? 'Credentials present but no backend proxy is wired.' : 'Not configured — set Google Drive env vars and a backend proxy.' };
  }
  async status() {
    return { provider: 'google_drive', connected: false, rootFolder: this.rootFolder, message: 'Template — requires backend.' };
  }
}
