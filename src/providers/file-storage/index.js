import { config } from '@/config/config.js';
import SupabaseFileStorage from './SupabaseFileStorage.js';
import GoogleDriveFileStorage from './GoogleDriveFileStorage.js';
import DualStorageWrapper from './DualStorageWrapper.js';

// Registry of primary storage providers.
const primaryRegistry = {
  supabase: () => new SupabaseFileStorage(),
};

let instance = null;

export function getFileStorageProvider() {
  if (instance) return instance;

  const key = config.providers.storage;
  const make = primaryRegistry[key];
  if (!make) throw new Error(`File storage provider "${key}" is not recognised. Set VITE_STORAGE_PROVIDER to a valid provider (e.g. supabase).`);

  const primary = make();

  // If Google Drive is configured, wrap in DualStorageWrapper for automatic sync.
  const gdCfg = config.storage?.googleDrive || {};
  if (gdCfg.backendUrl && gdCfg.clientId) {
    const googleDrive = new GoogleDriveFileStorage();
    instance = new DualStorageWrapper(primary, googleDrive);
  } else {
    instance = primary;
  }

  return instance;
}

export function resetFileStorageProvider() { instance = null; }

export default getFileStorageProvider;
