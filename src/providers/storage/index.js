import { config } from '@/config/config.js';
import LocalStorageProvider from './LocalStorageProvider.js';
import GoogleDriveStorageProvider from './GoogleDriveStorageProvider.js';
import SupabaseStorageProvider from './SupabaseStorageProvider.js';

const registry = {
  local: () => new LocalStorageProvider(),
  google_drive: () => new GoogleDriveStorageProvider(),
  supabase: () => new SupabaseStorageProvider(),
  // mega / terabox / s3 / r2 / onedrive / dropbox implement the same contract.
};

let instance = null;

export function getStorageProvider() {
  if (instance) return instance;
  const make = registry[config.providers.storage] || registry.local;
  instance = make();
  return instance;
}

export function resetStorageProvider() { instance = null; }

export default getStorageProvider;
