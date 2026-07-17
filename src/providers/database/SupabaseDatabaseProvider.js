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
    this.serviceKey = config.credentials.supabaseServiceRoleKey;
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

  _serviceHeaders() {
    if (!this.serviceKey) return null;
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      'Content-Type': 'application/json',
    };
  }

  _bootstrapSql() {
    const lines = [];
    lines.push('create or replace function exec_sql(sql text)');
    lines.push('returns setof jsonb');
    lines.push('language plpgsql');
    lines.push('security definer');
    lines.push('as $$');
    lines.push('begin');
    lines.push("  if exists (select 1 from pg_tables where tablename = 'migration_registry') then");
    lines.push("    insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)");
    lines.push("    values (gen_random_uuid()::text, 0, 'exec_sql', md5(sql), now(), 0, true);");
    lines.push('  end if;');
    lines.push('  return query execute sql;');
    lines.push('exception');
    lines.push('  when others then');
    lines.push('    execute sql;');
    lines.push("    return query select '{\"ok\":true}'::jsonb;");
    lines.push('end;');
    lines.push('$$;');
    lines.push('');
    lines.push('create or replace function safe_ddl(sql text)');
    lines.push('returns void');
    lines.push('language plpgsql');
    lines.push('security definer');
    lines.push('as $$');
    lines.push('declare');
    lines.push('  v_upper text;');
    lines.push('begin');
    lines.push("  v_upper := upper(sql);");
    lines.push("  if v_upper ~ '^\\s*DROP\\s+(DATABASE|SCHEMA|TABLE|VIEW|FUNCTION|INDEX|ROLE|POLICY|TRIGGER|EXTENSION|PUBLICATION|SUBSCRIPTION)' then");
    lines.push("    raise exception 'safe_ddl: DROP is not permitted';");
    lines.push('  end if;');
    lines.push("  if v_upper ~ '^\\s*TRUNCATE' then raise exception 'safe_ddl: TRUNCATE is not permitted'; end if;");
    lines.push("  if v_upper ~ 'ALTER\\s+TABLE.*DROP\\s+(COLUMN|CONSTRAINT)' then");
    lines.push("    raise exception 'safe_ddl: ALTER TABLE DROP is not permitted';");
    lines.push('  end if;');
    lines.push('  if not (');
    lines.push("    v_upper ~ '^\\s*CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s' or");
    lines.push("    v_upper ~ '^\\s*CREATE\\s+INDEX\\s+IF\\s+NOT\\s+EXISTS\\s' or");
    lines.push("    v_upper ~ 'ALTER\\s+TABLE.*ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS' or");
    lines.push("    v_upper ~ 'ALTER\\s+TABLE.*ADD\\s+CONSTRAINT' or");
    lines.push("    v_upper ~ '^\\s*CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s' or");
    lines.push("    v_upper ~ '^\\s*ALTER\\s+TABLE\\s+IF\\s+EXISTS\\s' or");
    lines.push("    v_upper ~ 'ALTER\\s+TABLE.*ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY' or");
    lines.push("    v_upper ~ 'ALTER\\s+TABLE.*DISABLE\\s+ROW\\s+LEVEL\\s+SECURITY' or");
    lines.push("    v_upper ~ '^\\s*CREATE\\s+POLICY\\s' or");
    lines.push("    v_upper ~ '^\\s*ALTER\\s+POLICY\\s' or");
    lines.push("    v_upper ~ '^\\s*DROP\\s+POLICY\\s+IF\\s+EXISTS\\s' or");
    lines.push("    v_upper ~ '^\\s*COMMENT\\s+ON\\s' or");
    lines.push("    v_upper ~ '^\\s*DO\\s+\\$\\$' or");
    lines.push("    v_upper ~ '^\\s*--'");
    lines.push('  ) then');
    lines.push("    raise exception 'safe_ddl: Statement does not match any allowed pattern: %', substr(sql, 1, 80);");
    lines.push('  end if;');
    lines.push('  execute sql;');
    lines.push('end;');
    lines.push('$$;');
    lines.push('');
    lines.push('grant execute on function exec_sql(text) to authenticated;');
    lines.push('grant execute on function exec_sql(text) to anon;');
    lines.push('grant execute on function safe_ddl(text) to authenticated;');
    lines.push('grant execute on function safe_ddl(text) to anon;');
    return lines.join('\n');
  }

  async _tryBootstrapExecSql() {
    const h = this._serviceHeaders();
    if (!h) return false;
    const sql = this._bootstrapSql();
    try {
      const res = await fetch(`${this.url}/pg/v1/sql`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ query: sql }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[Supabase] bootstrap via /pg/v1/sql failed:', res.status, body.slice(0, 300));
        return false;
      }
      this._bootstrapped = true;
      console.log('[Supabase] exec_sql function bootstrapped successfully');
      return true;
    } catch (e) {
      console.warn('[Supabase] bootstrap error:', e.message);
      return false;
    }
  }

  _endpoint(collection) {
    return `${this.url}/rest/v1/${collection}`;
  }

  async list(collection, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, `eq.${v}`);
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
    // Returning null here lets userLogic.update surface this truthfully
    // instead of reporting success for a no-op write.
    return rows[0] || null;
  }

  // Execute arbitrary SQL via the exec_sql RPC (requires custom function in Supabase).
  // If the RPC is not available (405), tries to bootstrap the function using the
  // service role key via /pg/v1/sql, then retries via RPC.
  async execSql(sql) {
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
      // 405 = function does not exist → try to bootstrap
      if (res.status === 405 && !this._bootstrapped) {
        const booted = await this._tryBootstrapExecSql();
        if (booted) {
          // After bootstrap the RPC is still invisible to PostgREST until its
          // schema cache is refreshed. Use the service-key SQL endpoint directly.
          const h = this._serviceHeaders();
          if (h) {
            const retry = await fetch(`${this.url}/pg/v1/sql`, {
              method: 'POST',
              headers: h,
              body: JSON.stringify({ query: sql }),
            });
            if (retry.ok) {
              const body = await retry.text().catch(() => '');
              if (!body) return { ok: true, raw: true };
              try {
                const data = JSON.parse(body);
                return { ok: true, data: Array.isArray(data) ? data : [data], raw: true };
              } catch {
                return { ok: true, raw: true };
              }
            }
            return { ok: false, error: await retry.text().catch(() => 'Retry failed') };
          }
          // Fallback: try the RPC anyway (won't work until cache refreshes)
          const retry = await fetch(`${this.url}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: { ...this._headers(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql }),
          });
          if (retry.ok) {
            const body = await retry.text().catch(() => '');
            if (!body) return { ok: true };
            try {
              const data = JSON.parse(body);
              return { ok: true, data: Array.isArray(data) ? data : [data] };
            } catch {
              return { ok: true };
            }
          }
          return { ok: false, error: await retry.text().catch(() => 'Retry failed') };
        }
      }
      return { ok: false, needsManual: res.status === 405, error: await res.text().catch(() => 'Unknown error') };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async _ensureExecSqlBootstrapped() {
    // Probe whether exec_sql responds. The first call through execSql will auto-bootstrap
    // if the service key is available — this just checks the result.
    const probe = await this.execSql('select 1 as ok');
    if (!probe.ok) {
      console.warn('[Supabase] exec_sql RPC unavailable. Auto-provisioning will fall through.');
      console.warn('[Supabase] Run supabase_migration.sql in your Supabase SQL Editor once, or set VITE_SUPABASE_SERVICE_ROLE_KEY in .env.');
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
    // Try via exec_sql RPC first (works once cache is warm)
    const viaRpc = await this.execSql("SELECT pg_notify('pgrst', 'reload schema');");
    if (viaRpc.ok) return;
    // Fallback: use the service-key SQL endpoint directly
    const h = this._serviceHeaders();
    if (!h) return;
    try {
      await fetch(`${this.url}/pg/v1/sql`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ query: "SELECT pg_notify('pgrst', 'reload schema');" }),
      });
    } catch (e) {
      console.warn('[Supabase] schema cache reload failed:', e?.message);
    }
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
