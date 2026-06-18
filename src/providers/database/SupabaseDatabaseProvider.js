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

  // Run DDL via an `exec_sql` Postgres function exposed as a PostgREST RPC.
  // This is the standard way to let a browser client install schema: create
  //   create function exec_sql(sql text) returns void language plpgsql as $$
  //   begin execute sql; end; $$;
  // (secure it to service-role / an admin policy). If absent, the installer
  // falls back to surfacing the SQL for the SQL editor.
  async execSql(sql) {
    const res = await fetch(`${this.url}/rest/v1/rpc/exec_sql`, {
      method: 'POST', headers: this.#headers(), body: JSON.stringify({ sql }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`exec_sql ${res.status} ${detail}`.trim());
    }
    return true;
  }

  // Probe whether a table exists & is reachable under the current key/RLS.
  async collectionExists(name) {
    try {
      const res = await fetch(`${this.#endpoint(name)}?limit=1`, { headers: this.#headers() });
      return res.ok;
    } catch { return false; }
  }

  // Efficient Postgres count via PostgREST range header.
  async count(collection, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, `eq.${v}`);
    });
    const res = await fetch(`${this.#endpoint(collection)}?${params.toString()}`, {
      headers: { ...this.#headers(), Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
    });
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

  // Postgres tables require DDL, which the anon REST key cannot run. We probe
  // and report honestly: existing → ok; missing → needs the SQL in
  // SupabaseMigration.sqlFor() executed once in the SQL editor (or via an
  // `exec_sql` RPC if you add one). We never silently claim success.
  async ensureCollection(name) {
    const exists = await this.collectionExists(name);
    return { created: false, ok: exists, needsManual: !exists };
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
