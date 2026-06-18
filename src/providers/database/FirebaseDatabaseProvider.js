import DatabaseProvider from './DatabaseProvider.js';
import { config } from '@/config/config.js';

// FirebaseDatabaseProvider — talks to Cloud Firestore over its REST API (HTTPS),
// deliberately WITHOUT the firebase SDK so nothing leaks an SDK into the bundle
// and the same SDK-free, fetch-based pattern as the Supabase/Mongo providers is
// preserved. Firestore stores typed values ({stringValue}, {integerValue}, …),
// so #encode/#decode translate between plain JS records and that wire format.
//
// Access is governed by Firestore security rules. For a browser SPA the Web API
// key is sufficient for rules-gated reads/writes; a bearer access token may be
// supplied for privileged use. Activate with VITE_DATABASE_PROVIDER=firebase +
// VITE_FIREBASE_PROJECT_ID + VITE_FIREBASE_API_KEY.
export default class FirebaseDatabaseProvider extends DatabaseProvider {
  constructor() {
    super();
    this.projectId = config.credentials.firebaseProjectId;
    this.apiKey = config.credentials.firebaseApiKey;
    this.token = config.credentials.firebaseAccessToken;
    this.base = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
    if (!this.projectId || (!this.apiKey && !this.token)) {
      console.warn('[LexAI] Firebase not fully configured; provider will fail on use.');
    }
  }

  #headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  #keyQS(extra = '') {
    const key = this.apiKey ? `key=${encodeURIComponent(this.apiKey)}` : '';
    return [key, extra].filter(Boolean).join('&');
  }

  // ---- typed-value codec --------------------------------------------------
  #encodeValue(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') {
      return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    }
    if (Array.isArray(v)) return { arrayValue: { values: v.map((x) => this.#encodeValue(x)) } };
    if (typeof v === 'object') return { mapValue: { fields: this.#encodeFields(v) } };
    return { stringValue: String(v) };
  }

  #encodeFields(obj = {}) {
    const fields = {};
    Object.entries(obj).forEach(([k, v]) => { fields[k] = this.#encodeValue(v); });
    return fields;
  }

  #decodeValue(val) {
    if (!val || typeof val !== 'object') return val;
    if ('nullValue' in val) return null;
    if ('booleanValue' in val) return val.booleanValue;
    if ('integerValue' in val) return Number(val.integerValue);
    if ('doubleValue' in val) return val.doubleValue;
    if ('stringValue' in val) return val.stringValue;
    if ('timestampValue' in val) return val.timestampValue;
    if ('arrayValue' in val) return (val.arrayValue.values || []).map((x) => this.#decodeValue(x));
    if ('mapValue' in val) return this.#decodeFields(val.mapValue.fields || {});
    return null;
  }

  #decodeFields(fields = {}) {
    const out = {};
    Object.entries(fields).forEach(([k, v]) => { out[k] = this.#decodeValue(v); });
    return out;
  }

  // A Firestore document path ends in /collection/docId — derive the record id.
  #decodeDoc(doc) {
    if (!doc || !doc.fields) return null;
    const record = this.#decodeFields(doc.fields);
    if (!record.id && doc.name) record.id = doc.name.split('/').pop();
    return record;
  }

  async #req(path, { method = 'GET', body, qs = '' } = {}) {
    const url = `${this.base}/${path}${(this.#keyQS(qs)) ? `?${this.#keyQS(qs)}` : ''}`;
    const res = await fetch(url, { method, headers: this.#headers(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Firestore ${method} ${path} ${res.status}`);
    return data;
  }

  async list(collection, query = {}) {
    // Read the whole collection (paged), then filter client-side to honour the
    // same simple equality-query contract the other providers expose.
    let rows = [];
    let pageToken = '';
    do {
      // eslint-disable-next-line no-await-in-loop
      const data = await this.#req(collection, { qs: `pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}` });
      (data.documents || []).forEach((d) => { const r = this.#decodeDoc(d); if (r) rows.push(r); });
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      rows = rows.filter((r) => r[k] === v);
    });
    return rows;
  }

  async get(collection, id) {
    try {
      const doc = await this.#req(`${collection}/${id}`);
      return this.#decodeDoc(doc);
    } catch { return null; }
  }

  async create(collection, record) {
    const id = record.id;
    const body = { fields: this.#encodeFields(record) };
    // documentId lets us control the id so it matches our `id` field.
    const doc = await this.#req(collection, { method: 'POST', body, qs: id ? `documentId=${encodeURIComponent(id)}` : '' });
    const created = this.#decodeDoc(doc);
    if (!created) throw new Error(`Firestore create ${collection} returned no document.`);
    return created;
  }

  async update(collection, id, patch) {
    // updateMask ensures only the patched fields are written (merge semantics).
    const mask = Object.keys(patch).map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    try {
      const doc = await this.#req(`${collection}/${id}`, { method: 'PATCH', body: { fields: this.#encodeFields(patch) }, qs: mask });
      return this.#decodeDoc(doc);
    } catch {
      // No matching document → the update did not happen. Mirror the truthful
      // null contract used by the other providers.
      return null;
    }
  }

  async remove(collection, id) {
    try {
      // Confirm existence first so we never report success for a no-op delete.
      const existing = await this.get(collection, id);
      if (!existing) return false;
      await this.#req(`${collection}/${id}`, { method: 'DELETE' });
      return true;
    } catch { return false; }
  }

  // ---- schema hooks -------------------------------------------------------
  async collectionExists(name) {
    try { await this.#req(name, { qs: 'pageSize=1' }); return true; }
    catch { return false; }
  }

  async ensureCollection(name) {
    // Firestore creates collections lazily on first document write.
    const ok = await this.collectionExists(name);
    return { created: false, ok, lazy: true };
  }
}
