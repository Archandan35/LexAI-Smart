// DatabaseProvider — persistence contract. Implemented by local/supabase/mongodb/firebase.
// The service/repository layer is the ONLY caller; pages never touch this.
//
// Core CRUD (must be implemented by every provider):
//   list · get · create · update · remove
//
// Extended capabilities below ship with working DEFAULT implementations built on
// the core CRUD, so existing providers keep working without changes. Providers
// may override any of them with a more efficient/native version.
export default class DatabaseProvider {
  // ---- Core contract (abstract) -------------------------------------------
  // collection ∈ any name from data-provider/schema (cases, users, roles, …)
  // eslint-disable-next-line no-unused-vars
  async list(collection, query = {}) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async get(collection, id) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async create(collection, record) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async update(collection, id, patch) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async remove(collection, id) { throw new Error('not implemented'); }

  // ---- Extended capabilities (default implementations) --------------------
  // Count matching rows. Default: length of a filtered list.
  async count(collection, query = {}) {
    const rows = await this.list(collection, query);
    return Array.isArray(rows) ? rows.length : 0;
  }

  // Insert many records; returns the created rows. Default: sequential create.
  async bulkCreate(collection, records = []) {
    const out = [];
    for (const r of records) {
      // eslint-disable-next-line no-await-in-loop
      out.push(await this.create(collection, r));
    }
    return out;
  }

  // Delete many by id; returns the count actually removed. Default: sequential.
  async bulkRemove(collection, ids = []) {
    let removed = 0;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      if (await this.remove(collection, id)) removed += 1;
    }
    return removed;
  }

  // Classify whether a collection is reachable. Returns one of:
  //   'present'  — table exists and is queryable
  //   'missing'  — table does not exist (404 / not found)
  //   'blocked'  — request was rejected/throttled (403, auth, network, timeout)
  //                i.e. we CANNOT determine existence; do NOT report as missing.
  // Default impl derives the state from collectionExists() + thrown error text.
  async checkCollection(name) {
    try {
      const exists = await this.collectionExists(name);
      return exists ? 'present' : 'missing';
    } catch (e) {
      const msg = (e && e.message) || '';
      if (/throttl|egress|rate.?limit|429/i.test(msg)) return 'blocked';
      if (/auth denied|401|403|forbidden|unauthorized/i.test(msg)) return 'blocked';
      if (/timeout|abort|network|fetch failed|failed to fetch/i.test(msg)) return 'blocked';
      // Unknown error — treat as blocked (cannot safely assume missing).
      return 'blocked';
    }
  }

  // Remove every row in a collection; returns count removed.
  async clear(collection) {
    const rows = await this.list(collection, {});
    const ids = rows.map((r) => r.id).filter(Boolean);
    return this.bulkRemove(collection, ids);
  }

  // ---- Schema / migration hooks (overridable) -----------------------------
  // Return the collection names the backend currently reports, or null if the
  // backend can't enumerate them (most can't from a browser).
  async listCollections() { return null; }

  // Best-effort existence probe. Default: a successful list() means it exists.
  // eslint-disable-next-line no-unused-vars
  async collectionExists(name) {
    try { await this.list(name, {}); return true; } catch { return false; }
  }

  // Ensure a collection/table exists. Lazy backends (Mongo/Firestore) create on
  // first write, so the default is a success no-op. Providers that need real
  // DDL (e.g. Supabase) override this.
  // eslint-disable-next-line no-unused-vars
  async ensureCollection(name, schema) { return { created: false, ok: true }; }

  // Ensure a column exists on a table. Default no-op; providers with DDL access
  // (e.g. Supabase) override to execute ALTER TABLE ADD COLUMN IF NOT EXISTS.
  // eslint-disable-next-line no-unused-vars
  async ensureColumn(collection, column, type) { return { created: false, ok: true }; }

  // ---- DDL / safe execution (overridable) ---------------------------------
  // Execute a DDL statement through the provider's safe_ddl path. Default:
  // delegates to execSql() when the provider implements it; otherwise returns
  // a needsManual response so the caller can surface the SQL for the user.
  // eslint-disable-next-line no-unused-vars
  async safeDdl(sql) {
    if (typeof this.execSql === 'function') return this.execSql(sql);
    return { ok: false, error: 'DDL not supported by this provider', needsManual: true, sql };
  }

  // ---- Snapshot / restore (for backup + .udb, provider-agnostic) ----------
  // Read every given collection into a plain object { name: rows[] }.
  // `limit` caps rows per collection to bound payload size (egress). A backup/
  // export path passes null to fetch everything; dashboard previews pass a small
  // number. Default is bounded to avoid pulling entire tables on every call.
  async snapshot(collections = [], limit = 1000) {
    const out = {};
    for (const name of collections) {
      // eslint-disable-next-line no-await-in-loop
      try {
        out[name] = limit == null ? await this.list(name, {}) : await this.list(name, { limit });
      } catch { out[name] = []; }
    }
    return out;
  }

  // Overwrite the given collections with the provided rows. Returns per-
  // collection counts. Default: clear then bulkCreate.
  async restore(data = {}) {
    const counts = {};
    for (const [name, rows] of Object.entries(data)) {
      if (!Array.isArray(rows)) continue;
      // eslint-disable-next-line no-await-in-loop
      await this.clear(name);
      // eslint-disable-next-line no-await-in-loop
      await this.bulkCreate(name, rows);
      counts[name] = rows.length;
    }
    return counts;
  }

}
