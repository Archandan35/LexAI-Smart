import FileStorageProvider from './FileStorageProvider.js';
import { config } from '@/config/config.js';

export default class SupabaseFileStorage extends FileStorageProvider {
  constructor() {
    super();
    this.url = config.credentials.supabaseUrl;
    this.key = config.credentials.supabaseAnonKey;
    this.bucket = config.storage?.supabaseBucket || 'case-files';
    this.rootFolder = config.storage?.rootFolder || 'LexAI';
  }

  #ready() { return !!(this.url && this.key); }
  #headers() { return { apikey: this.key, Authorization: `Bearer ${this.key}` }; }
  #objectUrl(path) { return `${this.url}/storage/v1/object/${this.bucket}/${encodeURI(path)}`; }

  async upload(file, path) {
    if (!this.#ready()) throw new Error('Supabase storage not configured (VITE_SUPABASE_URL / ANON_KEY).');
    const fullPath = `${this.rootFolder}/${path}`;
    const res = await fetch(this.#objectUrl(fullPath), {
      method: 'POST', headers: { ...this.#headers(), 'x-upsert': 'true' }, body: file,
    });
    if (!res.ok) throw new Error(`Supabase upload failed (${res.status})`);
    return { ref: fullPath, name: file.name, size: file.size, mime: file.type };
  }

  async getUrl(ref) {
    return `${this.url}/storage/v1/object/public/${this.bucket}/${encodeURI(ref)}`;
  }

  async download(ref) {
    const res = await fetch(this.#objectUrl(ref), { headers: this.#headers() });
    return res.ok ? res.blob() : null;
  }

  async delete(ref) {
    const res = await fetch(this.#objectUrl(ref), { method: 'DELETE', headers: this.#headers() });
    return res.ok;
  }

  async move(oldRef, newRef) {
    const res = await fetch(`${this.url}/storage/v1/object/move`, {
      method: 'POST',
      headers: { ...this.#headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId: this.bucket, sourceKey: oldRef, destinationKey: newRef }),
    });
    return res.ok;
  }
}
