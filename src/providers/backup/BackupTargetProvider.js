// BackupTargetProvider — contract for a destination a .udb backup can be sent to.
// Concrete targets live alongside this file; only they may know vendor specifics.
export default class BackupTargetProvider {
  get key() { return 'base'; }
  get label() { return 'Base'; }
  get available() { return false; }

  // Send a named .udb payload (string) to the destination.
  // eslint-disable-next-line no-unused-vars
  async send(filename, content) { throw new Error('not implemented'); }

  async status() { return { provider: this.key, connected: this.available }; }
}
