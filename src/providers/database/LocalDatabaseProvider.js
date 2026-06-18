import DatabaseProvider from './DatabaseProvider.js';
import seed from '@/database/seed.js';
import { uid, nowISO } from '@/utils/id.js';

const STORAGE_KEY = 'lexai.db.v1';

// LocalDatabaseProvider — browser-persistent store (localStorage) seeded with
// demo data. Implements the full DatabaseProvider contract so a real DB can be
// dropped in later without touching services/logic/pages.
export default class LocalDatabaseProvider extends DatabaseProvider {
  constructor() {
    super();
    this.db = this.#load();
  }

  #load() {
    try {
      const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    // Deep clone seed so mutations don't affect the module-level fixture.
    const fresh = JSON.parse(JSON.stringify(seed));
    this.#persist(fresh);
    return fresh;
  }

  // Returns whether the write actually reached storage. Callers that mutate
  // `this.db` in place (create/update/remove) must check this before
  // reporting success — silently swallowing a quota/security error here is
  // what causes "Successful" toasts for deletes that never really happened.
  #persist(db = this.db) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch {
      return false;
    }
  }

  #col(collection) {
    if (!this.db[collection]) this.db[collection] = [];
    return this.db[collection];
  }

  async list(collection, query = {}) {
    let rows = [...this.#col(collection)];
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      rows = rows.filter((r) => r[k] === v);
    });
    return rows;
  }

  async get(collection, id) {
    return this.#col(collection).find((r) => r.id === id) || null;
  }

  async create(collection, record) {
    const row = { id: record.id || uid(collection.slice(0, 3)), createdAt: nowISO(), ...record };
    const col = this.#col(collection);
    col.unshift(row);
    if (!this.#persist()) {
      col.shift();
      throw new Error(`Create failed — could not persist to storage (collection: ${collection}).`);
    }
    return row;
  }

  async update(collection, id, patch) {
    const col = this.#col(collection);
    const i = col.findIndex((r) => r.id === id);
    if (i === -1) return null;
    const prev = col[i];
    col[i] = { ...prev, ...patch, updatedAt: nowISO() };
    if (!this.#persist()) {
      col[i] = prev;
      return null;
    }
    return col[i];
  }

  async remove(collection, id) {
    const col = this.#col(collection);
    const i = col.findIndex((r) => r.id === id);
    if (i === -1) return false;
    const [removed] = col.splice(i, 1);
    if (!this.#persist()) {
      // Storage write failed — put the row back so in-memory state matches
      // what's actually persisted, and report the real outcome (not deleted).
      col.splice(i, 0, removed);
      return false;
    }
    return true;
  }

  // ---- Extended capabilities (efficient overrides) ------------------------
  async count(collection, query = {}) {
    return (await this.list(collection, query)).length;
  }

  async bulkCreate(collection, records = []) {
    const out = [];
    for (const record of records) {
      const row = { id: record.id || uid(collection.slice(0, 3)), createdAt: nowISO(), ...record };
      this.#col(collection).unshift(row);
      out.push(row);
    }
    if (!this.#persist()) throw new Error(`Bulk create failed — could not persist (collection: ${collection}).`);
    return out;
  }

  async bulkRemove(collection, ids = []) {
    const col = this.#col(collection);
    const set = new Set(ids);
    const before = col.length;
    this.db[collection] = col.filter((r) => !set.has(r.id));
    if (!this.#persist()) { this.db[collection] = col; return 0; }
    return before - this.db[collection].length;
  }

  async clear(collection) {
    const n = this.#col(collection).length;
    this.db[collection] = [];
    if (!this.#persist()) return 0;
    return n;
  }

  // ---- Schema hooks -------------------------------------------------------
  async listCollections() { return Object.keys(this.db); }

  async collectionExists(name) { return Array.isArray(this.db[name]); }

  async ensureCollection(name) {
    if (Array.isArray(this.db[name])) return { created: false, ok: true };
    this.db[name] = [];
    const ok = this.#persist();
    return { created: ok, ok };
  }

  // ---- Snapshot / restore (raw blob — captures everything, fast) ----------
  async snapshot(collections = null) {
    if (!collections) return JSON.parse(JSON.stringify(this.db));
    const out = {};
    collections.forEach((name) => { out[name] = JSON.parse(JSON.stringify(this.db[name] || [])); });
    return out;
  }

  async restore(data = {}) {
    const counts = {};
    Object.entries(data).forEach(([name, rows]) => {
      if (!Array.isArray(rows)) return;
      this.db[name] = JSON.parse(JSON.stringify(rows));
      counts[name] = rows.length;
    });
    this.#persist();
    return counts;
  }

  // Test/demo helper — wipe local state back to seed.
  async __reset() {
    this.db = JSON.parse(JSON.stringify(seed));
    this.#persist();
  }
}
