import StorageProvider from './StorageProvider.js';
import { config } from '@/config/config.js';

// SupabaseStorageProvider — reference TEMPLATE using the Supabase Storage REST
// API (mirrors SupabaseDatabaseProvider). The anon key is public, but real
// uploads/signed URLs should be brokered by a backend with the service role
// key + RLS. Activate with VITE_STORAGE_PROVIDER=supabase.
export default class SupabaseStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.url = config.credentials.supabaseUrl;
    this.key = config.credentials.supabaseAnonKey;
    this.bucket = config.storage?.supabaseBucket || 'case-files';
    this.rootFolder = config.storage?.rootFolder || 'LexAI';
  }

  #ready() { return !!(this.url && this.key); }
  #headers() { return { apikey: this.key, Authorization: `Bearer ${this.key}` }; }
  #object(path) { return `${this.url}/storage/v1/object/${this.bucket}/${encodeURI(path)}`; }

  async upload(file, opts = {}) {
    if (!this.#ready()) throw new Error('Supabase storage not configured (VITE_SUPABASE_URL / ANON_KEY).');
    const path = `${this.rootFolder}/${opts.path || file.name}`;
    const res = await fetch(this.#object(path), {
      method: 'POST', headers: { ...this.#headers(), 'x-upsert': 'true' }, body: file,
    });
    if (!res.ok) throw new Error(`Supabase upload ${res.status}`);
    return { ref: path, name: file.name, size: file.size, mime: file.type };
  }

  async getUrl(ref) { return `${this.url}/storage/v1/object/public/${this.bucket}/${encodeURI(ref)}`; }
  async download(ref) {
    const res = await fetch(this.#object(ref), { headers: this.#headers() });
    return res.ok ? res.blob() : null;
  }
  async delete(ref) {
    const res = await fetch(this.#object(ref), { method: 'DELETE', headers: this.#headers() });
    return res.ok;
  }

  async sync() { return { ok: this.#ready(), provider: 'supabase', reason: this.#ready() ? '' : 'Not configured' }; }
  async testConnection() { return { ok: this.#ready(), provider: 'supabase', message: this.#ready() ? 'Supabase storage reachable.' : 'Set Supabase env vars.' }; }
  async status() { return { provider: 'supabase', connected: this.#ready(), bucket: this.bucket, rootFolder: this.rootFolder }; }
}
