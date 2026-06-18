import BackupTargetProvider from './BackupTargetProvider.js';

// LocalDownloadTarget — triggers a browser download of the .udb. The only target
// that needs no backend. DOM is touched here (provider layer), never in the UI.
export default class LocalDownloadTarget extends BackupTargetProvider {
  get key() { return 'local'; }
  get label() { return 'Local Download'; }
  get available() { return true; }

  async send(filename, content) {
    try {
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      return { ok: true, target: this.key, filename };
    } catch (e) {
      return { ok: false, target: this.key, reason: e.message };
    }
  }

  async status() { return { provider: this.key, connected: true, message: 'In-browser download — always available.' }; }
}
