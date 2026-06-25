import { config } from '@/config/config.js';
import GoogleDriveStorageProvider from './GoogleDriveStorageProvider.js';
import SupabaseStorageProvider from './SupabaseStorageProvider.js';

const registry = {
  google_drive: () => new GoogleDriveStorageProvider(),
  supabase: () => new SupabaseStorageProvider(),
};

let instance = null;

export function getStorageProvider() {
  if (instance) return instance;
  const key = config.providers.storage;
  const make = registry[key];
  if (!make) throw new Error(`Storage provider "${key}" is not recognised or not configured. Set VITE_STORAGE_PROVIDER to supabase or google_drive.`);
  instance = make();
  return instance;
}

export function resetStorageProvider() { instance = null; }

export default getStorageProvider;
