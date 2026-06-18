import LocalDownloadTarget from './LocalDownloadTarget.js';
import { GoogleDriveBackupTarget, MegaBackupTarget, TeraboxBackupTarget } from './CloudBackupTargets.js';

// Backup target registry. Local download is always available; cloud targets are
// pluggable and become available once a backend proxy is wired.
const registry = {
  local: () => new LocalDownloadTarget(),
  google_drive: () => new GoogleDriveBackupTarget(),
  mega: () => new MegaBackupTarget(),
  terabox: () => new TeraboxBackupTarget(),
};

const cache = {};

export function getBackupTarget(key) {
  const make = registry[key] || registry.local;
  if (!cache[key]) cache[key] = make();
  return cache[key];
}

export function listBackupTargets() {
  return Object.keys(registry).map((k) => {
    const t = getBackupTarget(k);
    return { key: t.key, label: t.label, available: t.available };
  });
}

export default getBackupTarget;
