import BackupTargetProvider from './BackupTargetProvider.js';
import { config } from '@/config/config.js';

// Cloud backup targets — Google Drive / Mega / Terabox. Each needs a BACKEND to
// hold OAuth/app credentials securely (they must never live in the browser
// bundle). These templates are honest: they report unavailability with a clear
// reason until a backend proxy is wired, mirroring GoogleDriveStorageProvider.
class CloudTarget extends BackupTargetProvider {
  constructor(key, label) { super(); this._key = key; this._label = label; }
  get key() { return this._key; }
  get label() { return this._label; }
  get available() { return false; }

  #reason() {
    return `${this.label} backup needs a backend proxy to hold its credentials securely (never the frontend bundle). Configure a backend, then enable this destination. Local Download works without one.`;
  }

  async send() { return { ok: false, target: this.key, reason: this.#reason() }; }
  async status() { return { provider: this.key, connected: false, message: this.#reason() }; }
}

export class GoogleDriveBackupTarget extends CloudTarget {
  constructor() { super('google_drive', 'Google Drive'); this.cfg = config.storage?.googleDrive || {}; }
}
export class MegaBackupTarget extends CloudTarget {
  constructor() { super('mega', 'Mega'); }
}
export class TeraboxBackupTarget extends CloudTarget {
  constructor() { super('terabox', 'Terabox'); }
}

export default { GoogleDriveBackupTarget, MegaBackupTarget, TeraboxBackupTarget };
