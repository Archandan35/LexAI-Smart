import DatabaseProvider from './DatabaseProvider.js';
import { config } from '@/config/config.js';

// MongoDatabaseProvider — talks to the MongoDB Atlas Data API (HTTPS).
// IMPORTANT: a raw `mongodb` driver / connection string can NEVER be used
// from browser code — it needs a Node server and would leak credentials in
// the bundle. The Data API is Atlas's own HTTPS façade and is the only way
// to reach MongoDB directly from a client-side SPA with no backend of your
// own. If you already have a backend, point this provider's #call() at YOUR
// REST API instead of Atlas — the rest of the app (pages/logic/services)
// never needs to know or care which one you pick.
// Activate with VITE_DATABASE_PROVIDER=mongodb + the 4 credentials below.
export default class MongoDatabaseProvider extends DatabaseProvider {
  constructor() {
    super();
    this.baseUrl = config.credentials.mongoDataApiUrl;
    this.apiKey = config.credentials.mongoDataApiKey;
    this.dataSource = config.credentials.mongoDataSource;
    this.database = config.credentials.mongoDatabase;
    if (!this.baseUrl || !this.apiKey || !this.dataSource || !this.database) {
      console.warn('[LexAI] MongoDB Atlas Data API not fully configured; provider will fail on use.');
    }
  }

  async #call(action, body) {
    const res = await fetch(`${this.baseUrl}/action/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey },
      body: JSON.stringify({ dataSource: this.dataSource, database: this.database, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Mongo ${action} ${res.status}`);
    return data;
  }

  async list(collection, query = {}) {
    const filter = {};
    Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') filter[k] = v; });
    const { documents } = await this.#call('find', { collection, filter });
    return documents || [];
  }

  async get(collection, id) {
    const { document } = await this.#call('findOne', { collection, filter: { id } });
    return document || null;
  }

  async create(collection, record) {
    const doc = { ...record };
    const { insertedId } = await this.#call('insertOne', { collection, document: doc });
    // No insertedId means nothing was actually written — never report a
    // successful create for a call that didn't really insert anything.
    if (!insertedId) throw new Error(`Mongo create ${collection} failed — no document was inserted.`);
    return { ...doc, id: doc.id || insertedId };
  }

  async update(collection, id, patch) {
    const { matchedCount } = await this.#call('updateOne', {
      collection, filter: { id }, update: { $set: patch },
    });
    // matchedCount === 0 means the filter matched nothing — the update did
    // NOT happen even though the HTTPS call itself returned 200 OK. Returning
    // null (same contract as LocalDatabaseProvider) lets userLogic.update
    // surface this as a real failure instead of a false success.
    if (!matchedCount) return null;
    return this.get(collection, id);
  }

  // MongoDB creates a collection lazily on first insert, so there is nothing to
  // pre-create. We confirm the Data API is reachable for this collection.
  async collectionExists(name) {
    try { await this.#call('findOne', { collection: name, filter: {} }); return true; }
    catch { return false; }
  }

  async ensureCollection(name) {
    // Lazy creation — a successful reachable probe means we're good to go; the
    // collection materialises on the first document written to it.
    const ok = await this.collectionExists(name);
    return { created: false, ok, lazy: true };
  }

  async remove(collection, id) {
    const { deletedCount } = await this.#call('deleteOne', { collection, filter: { id } });
    // deletedCount is the only source of truth — a 200 response with
    // deletedCount: 0 means the document was already gone or the id didn't
    // match. This is the exact bug class fixed in LocalDatabaseProvider and
    // SupabaseDatabaseProvider: HTTP success != row actually deleted.
    return deletedCount > 0;
  }
}
