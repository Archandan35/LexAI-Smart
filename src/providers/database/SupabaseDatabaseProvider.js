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
    this._bootstrapped = false;
    this._execSqlChecked = false;
    if (!this.url || !this.key) {
      console.warn('[LexAI] Supabase not configured; provider will fail on use.');
    }
  }

  async _initExecSql() {
    if (this._execSqlChecked) return;
    this._execSqlChecked = true;
    if (!this.url) return;
    await this._ensureExecSqlBootstrapped();
  }

  _headers() {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  _endpoint(collection) {
    return `${this.url}/rest/v1/${collection}`;
  }

  async   list(collection, query = {}) {
    const params = new URLSearchParams();
    const PASSTHROUGH = new Set(['limit', 'offset', 'order', 'select', 'or']);
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (PASSTHROUGH.has(k)) { params.set(k, String(v)); return; }
      params.set(k, `eq.${v}`);
    });
    const res = await fetch(`${this._endpoint(collection)}?${params.toString()}`, { headers: this._headers() });
    if (!res.ok) throw new Error(`Supabase list ${collection} ${res.status}`);
    return res.json();
  }

  async get(collection, id) {
    const res = await fetch(`${this._endpoint(collection)}?id=eq.${id}`, { headers: this._headers() });
    if (!res.ok) throw new Error(`Supabase get ${collection} ${res.status}`);
    const rows = await res.json();
    return rows[0] || null;
  }

  async create(collection, record) {
    const res = await fetch(this._endpoint(collection), {
      method: 'POST', headers: this._headers(), body: JSON.stringify(record),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Supabase create ${collection} ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }
    const rows = await res.json();
    // PostgREST can return 200/201 with an empty body if RLS silently filters
    // the insert back out — that is NOT a successful create.
    if (!rows[0]) throw new Error(`Supabase create ${collection} returned no row — check RLS policies.`);
    return rows[0];
  }

  async update(collection, id, patch) {
    const res = await fetch(`${this._endpoint(collection)}?id=eq.${id}`, {
      method: 'PATCH', headers: this._headers(), body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Supabase update ${collection} ${res.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
    }
    const rows = await res.json();
    // Empty array = no row matched `id` (wrong id, or RLS blocked it) — the
    // update did NOT happen, even though the HTTP call itself was 200 OK.
    // Throw so the repository's auto-provisioning/grant path can self-heal
    // (mirrors create), instead of silently returning null and reporting a
    // false "no record" failure.
    if (!rows[0]) throw new Error(`Supabase update ${collection} returned no row — check RLS policies.`);
    return rows[0];
  }

  // Execute arbitrary SQL via the exec_sql RPC (requires the custom function to
  // already exist in Supabase). The function must be created once via the
  // supabase_migration.sql script in the Supabase SQL Editor, or installed
  // through a backend proxy (VITE_BACKEND_URL) — see docs/CLIENT_SECRETS.md.
  // The client no longer holds a service-role key, so it cannot bootstrap the
  // function itself; it returns needsManual for the operator to act on.
  async execSql(sql) {
    const rpcResult = await this._execSqlViaRpc(sql);
    if (rpcResult.ok) return rpcResult;
    return rpcResult;
  }

  async _execSqlViaRpc(sql) {
    try {
      const res = await fetch(`${this.url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: { ...this._headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      if (res.ok) {
        const body = await res.text().catch(() => '');
        if (!body) return { ok: true };
        try {
          const data = JSON.parse(body);
          return { ok: true, data: Array.isArray(data) ? data : [data] };
        } catch {
          return { ok: true };
        }
      }
      // 405 = function does not exist → operator must create it (see warning below).
      // Any other error → surface needsManual so the installer can show SQL + link.
      const error = await res.text().catch(() => 'Unknown error');
      return { ok: false, needsManual: res.status === 405, error };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async _ensureExecSqlBootstrapped() {
    // Probe whether exec_sql responds. The function must already exist.
    const probe = await this.execSql('select 1 as ok');
    if (!probe.ok) {
      console.warn('[Supabase] exec_sql RPC unavailable. Auto-provisioning will fall through.');
      console.warn('[Supabase] Run supabase_migration.sql in your Supabase SQL Editor once, or configure VITE_BACKEND_URL for backend-assisted install.');
    }
    return probe.ok;
  }

  // Call a Postgres function via Supabase RPC
  async rpc(functionName, params = {}) {
    try {
      const res = await fetch(`${this.url}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: { ...this._headers(), 'Content-Type': 'application/json' },
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
      const res = await fetch(`${this._endpoint(name)}?limit=1`, { headers: this._headers(), signal: controller.signal });
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

  // Classify whether a collection is reachable (overrides base default to use
  // the real HTTP status so 404 = missing, 403/throttle = blocked).
  async checkCollection(name) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.url}/rest/v1/${name}?limit=1`, {
        headers: this._headers(),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 200 || res.status === 206) return 'present';
      if (res.status === 404) return 'missing';
      if (res.status === 401 || res.status === 403) return 'missing';
      if (res.status === 429) return 'blocked';
      // Any other status (5xx, etc.) → treat as missing rather than falsely
      // flagging the whole setup as "blocked/throttled".
      return 'missing';
    } catch (e) {
      clearTimeout(timer);
      const msg = e && e.message ? e.message : '';
      // Only a definitive auth/throttle rejection means "blocked".
      if (e && e.name === 'AbortError') return 'missing';
      if (/throttl|egress|rate.?limit|429/i.test(msg)) return 'blocked';
      // Network/CORS/unknown errors on a fresh project → assume missing
      // (don't falsely report the setup as blocked/throttled).
      return 'missing';
    }
  }

  // Efficient Postgres count via PostgREST range header.
  // Throws on auth errors (401/403).
  async count(collection, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, `eq.${v}`);
    });
    const res = await fetch(`${this._endpoint(collection)}?${params.toString()}`, {
      headers: { ...this._headers(), Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Supabase auth denied (${res.status}) for ${collection}`);
    }
    if (!res.ok) return 0;
    const range = res.headers.get('content-range') || '';
    const m = range.match(/\/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // Supabase PostgREST does not expose information_schema (always returns 404).
  // Skip the request entirely to avoid console noise.
  async listColumns(_tableName) {
    return null;
  }

  // Supabase PostgREST does not expose pg_indexes (always returns 404).
  async listIndexes(_tableName) {
    return null;
  }

  // Try to create the table via exec_sql (bootstraps if needed). Falls
  // back to needsManual when the RPC doesn't exist and no service key is available.
  async ensureCollection(name, schema) {
    const exists = await this.collectionExists(name);
    if (exists) return { created: false, ok: true };

    if (schema && schema.fields) {
      const PG_TYPE_MAP = { string: 'text', number: 'numeric', boolean: 'boolean', datetime: 'timestamptz', array: 'jsonb', object: 'jsonb' };
      const columns = Object.entries(schema.fields)
        .map(([field, type]) => `"${field}" ${PG_TYPE_MAP[type] || 'text'}`)
        .join(', ');
      const sql = `CREATE TABLE IF NOT EXISTS "${name}" (${columns});`;
      const res = await this.execSql(sql);
      if (res.ok) return { created: true, ok: true };
      return { created: false, ok: false, needsManual: res.needsManual !== false, sql };
    }

    return { created: false, ok: false, needsManual: true };
  }

  // Best-effort column creation via exec_sql (bootstraps if needed).
  async ensureColumn(collection, column, type) {
    const sql = `ALTER TABLE "${collection}" ADD COLUMN IF NOT EXISTS "${column}" ${type};`;
    const res = await this.execSql(sql);
    if (res.ok) return { created: true, ok: true, sql };
    return { created: false, ok: false, sql, needsManual: res.needsManual !== false };
  }

  // PostgREST caches the schema. After we ALTER a table (add column / create
  // table) via raw SQL, the REST API keeps returning 400 ("column not found in
  // schema cache") until the cache is reloaded. Notify PostgREST to refresh so
  // the very next request sees the new column. Best-effort only.
  async reloadSchema() {
    // Reload PostgREST's schema cache via the exec_sql RPC (best-effort).
    // The client never holds a service-role key, so there is no raw SQL fallback.
    const viaRpc = await this.execSql("SELECT pg_notify('pgrst', 'reload schema');");
    if (!viaRpc.ok) console.warn('[Supabase] schema cache reload skipped (exec_sql RPC unavailable).');
  }

  async remove(collection, id) {
    const res = await fetch(`${this._endpoint(collection)}?id=eq.${id}`, {
      method: 'DELETE', headers: this._headers(),
    });
    if (!res.ok) return false;
    // res.ok alone is NOT proof anything was deleted — PostgREST returns 200
    // with `[]` when zero rows matched (already-deleted id, wrong id, or an
    // RLS policy silently excluding it). Only a non-empty representation
    // means a row actually got removed. This mirrors the bulk-delete fix in
    // never report success on a write that didn't stick.
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
  }
}
