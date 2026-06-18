// backupTargetService — service-layer façade over the backup target providers,
// so logic/UI never import a provider directly.
import { getBackupTarget, listBackupTargets } from '@/providers/backup/index.js';

export const backupTargetService = {
  list: () => listBackupTargets(),
  send: (key, filename, content) => getBackupTarget(key).send(filename, content),
  status: (key) => getBackupTarget(key).status(),
};

export default backupTargetService;
