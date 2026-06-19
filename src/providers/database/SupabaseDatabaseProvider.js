import DatabaseProvider from './DatabaseProvider.js';
import { config } from '@/config/config.js';

// SupabaseDatabaseProvider — reference template showing how a real backend
// plugs in behind the SAME contract. Uses the REST endpoint to avoid a hard SDK
// dependency. Activate with VITE_DATABASE_PROVIDER=supabase + URL/key.
export default class SupabaseDatabaseProvider extends DatabaseProvider {
  constructor() {
    super();
    this.url = config.credentials.supabaseUrl;
    this.key = config.credentials.supabaseAnonKey;
    if (!this.url || !this.key) {
      console.warn('[LexAI] Supabase not configured; provider will fail on use.');
    }
  }

  #headers() {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  #endpoint(collection) {
    return `${this.url}/rest/v1/${collection}`;
  }

  async list(collection, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, `eq.${v}`);
    });
    const res = await fetch(`${this.#endpoint(collection)}?${params.toString()}`, { headers: this.#headers() });
    if (!res.ok) throw new Error(`Supabase list ${collection} ${res.status}`);
    return res.json();
  }

  async get(collection, id) {
    const res = await fetch(`${this.#endpoint(collection)}?id=eq.${id}`, { headers: this.#headers() });
    if (!res.ok) throw new Error(`Supabase get ${collection} ${res.status}`);
    const rows = await res.json();
    return rows[0] || null;
  }

  async create(collection, record) {
    const res = await fetch(this.#endpoint(collection), {
      method: 'POST', headers: this.#headers(), body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`Supabase create ${collection} ${res.status}`);
    const rows = await res.json();
    // PostgREST can return 200/201 with an empty body if RLS silently filters
    // the insert back out — that is NOT a successful create.
    if (!rows[0]) throw new Error(`Supabase create ${collection} returned no row — check RLS policies.`);
    return rows[0];
  }

  async update(collection, id, patch) {
    const res = await fetch(`${this.#endpoint(collection)}?id=eq.${id}`, {
      method: 'PATCH', headers: this.#headers(), body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Supabase update ${collection} ${res.status}`);
    const rows = await res.json();
    // Empty array = no row matched `id` (wrong id, or RLS blocked it) — the
    // update did NOT happen, even though the HTTP call itself was 200 OK.
    // Returning null here lets userLogic.update surface this truthfully
    // instead of reporting success for a no-op write.
    return rows[0] || null;
  }

  // Execute arbitrary SQL via the exec_sql RPC (requires custom function in Supabase).
  async execSql(sql) {
    try {
      const res = await fetch(`${this.url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: { ...this.#headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      return res.ok ? { ok: true } : { ok: false, error: await res.text().catch(() => 'Unknown error') };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Call a Postgres function via Supabase RPC
  async rpc(functionName, params = {}) {
    try {
      const res = await fetch(`${this.url}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: { ...this.#headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return { ok: false, error: `RPC ${functionName} failed: ${res.status}` };
      const data = await res.json();
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Probe whether a table exists & is reachable under the current key/RLS.
  // Throws on auth errors (401/403) so callers can distinguish "no table" from
  // "can't check."
  async collectionExists(name) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.#endpoint(name)}?limit=1`, { headers: this.#headers(), signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Auth denied (${res.status}) for ${name}`);
      }
      return res.ok;
    } catch (e) {
      clearTimeout(timer);
      if (e?.name === 'AbortError') throw new Error(`Timeout probing ${name}`);
      throw e;
    }
  }

  // Efficient Postgres count via PostgREST range header.
  // Throws on auth errors (401/403).
  async count(collection, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, `eq.${v}`);
    });
    const res = await fetch(`${this.#endpoint(collection)}?${params.toString()}`, {
      headers: { ...this.#headers(), Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Supabase auth denied (${res.status}) for ${collection}`);
    }
    if (!res.ok) return 0;
    const range = res.headers.get('content-range') || '';
    const m = range.match(/\/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // Introspect column metadata via Postgres information_schema — exposes
  // column names and data_type so SchemaDiffEngine can detect missing/wrong columns.
  // Requires the anon key to have SELECT on information_schema.columns, which is
  // the Supabase default. Returns null when not accessible.
  async listColumns(tableName) {
    try {
      const res = await fetch(
        `${this.#endpoint('information_schema.columns')}?table_schema=eq.public&table_name=eq.${tableName}&select=column_name,data_type`,
        { headers: this.#headers() }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      return rows.map((r) => ({ name: r.column_name, type: r.data_type }));
    } catch { return null; }
  }

  // Introspect index metadata via pg_indexes. Returns null when not accessible.
  async listIndexes(tableName) {
    try {
      const res = await fetch(
        `${this.#endpoint('pg_indexes')}?schemaname=eq.public&tablename=eq.${tableName}&select=indexname,indexdef`,
        { headers: this.#headers() }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      // Extract the first column referenced in each index definition.
      return rows.map((r) => {
        const m = (r.indexdef || '').match(/\(([^)]+)\)/);
        const field = m ? m[1].replace(/"/g, '').split(',')[0].trim() : '';
        return { name: r.indexname, column: field };
      });
    } catch { return null; }
  }

  // Try to create the table via exec_sql RPC if a schema is provided. Falls
  // back to needsManual when the RPC doesn't exist or DDL is denied.
  async ensureCollection(name, schema) {
    const exists = await this.collectionExists(name);
    if (exists) return { created: false, ok: true };

    if (schema && schema.fields) {
      const PG_TYPE_MAP = { string: 'text', number: 'numeric', boolean: 'boolean', datetime: 'timestamptz', array: 'jsonb', object: 'jsonb' };
      const columns = Object.entries(schema.fields)
        .map(([field, type]) => `"${field}" ${PG_TYPE_MAP[type] || 'text'}`)
        .join(', ');
      const sql = `CREATE TABLE IF NOT EXISTS "${name}" (${columns});`;
      try {
        const res = await fetch(`${this.url}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: { ...this.#headers(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        });
        if (res.ok) return { created: true, ok: true };
        return { created: false, ok: false, needsManual: true, sql };
      } catch {
        return { created: false, ok: false, needsManual: true, sql };
      }
    }

    return { created: false, ok: false, needsManual: true };
  }

  // Best-effort column creation via exec_sql RPC. If the RPC function does not
  // exist on the Supabase project the call silently fails (DDL from the browser
  // requires a custom pgrpc function). Returns { created, ok, sql } so callers
  // can surface the SQL for manual execution.
  async ensureColumn(collection, column, type) {
    const sql = `ALTER TABLE "${collection}" ADD COLUMN IF NOT EXISTS "${column}" ${type};`;
    try {
      const res = await fetch(`${this.url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: { ...this.#headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      if (res.ok) return { created: true, ok: true, sql };
      return { created: false, ok: false, sql, needsManual: true };
    } catch {
      return { created: false, ok: false, sql, needsManual: true };
    }
  }

  async remove(collection, id) {
    const res = await fetch(`${this.#endpoint(collection)}?id=eq.${id}`, {
      method: 'DELETE', headers: this.#headers(),
    });
    if (!res.ok) return false;
    // res.ok alone is NOT proof anything was deleted — PostgREST returns 200
    // with `[]` when zero rows matched (already-deleted id, wrong id, or an
    // RLS policy silently excluding it). Only a non-empty representation
    // means a row actually got removed. This mirrors the bulk-delete fix in
    // LocalDatabaseProvider: never report success on a write that didn't stick.
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
  }
}
