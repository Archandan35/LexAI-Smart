// baseRepository — the per-entity data-access factory.
//
// ALL entity data access flows through this factory. Pages, services, and
// logic NEVER call a provider directly. Every repository is a thin wrapper
// that applies schema defaults, validates records, provisions missing tables/
// columns on the fly, and translates between LexAI canonical fields and
// provider-specific column names via the FieldMapper.
//
// The layering is:
//   Pages → Components → Logic → Services → Repositories → Providers
//
// Nothing above the repository layer knows about the active provider.

import { getDatabaseProvider } from '@/providers/database/index.js';
import { applyDefaults, validateRecord, getSchema } from '@/data-provider/schema/index.js';
import { EntityRegistry, FieldMapper, IDEngine, DateEngine } from '@/core/index.js';

const ARRAY_TYPES = new Set(['array', 'json', 'jsonb']);

/* ------------------------------------------------------------------ */
/* Idempotency store — deduplicate repeat create/update calls           */
/* ------------------------------------------------------------------ */
const idempotencyStore = new Map();

function getIdempotencyKey(record) {
  return record?.idempotencyKey || record?._idempotencyKey || null;
}

function checkIdempotency(key) {
  if (!key) return null;
  return idempotencyStore.get(key) || null;
}

function setIdempotency(key, result) {
  if (!key) return;
  idempotencyStore.set(key, result);
}

function cleanIdempotency() {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore) {
    if (now - entry.ts > 300_000) idempotencyStore.delete(key);
  }
}
setInterval(cleanIdempotency, 120_000);
/* ------------------------------------------------------------------ */

function normalizeArrays(entityName, record) {
  if (!record) return record;
  const schema = getSchema(entityName);
  if (!schema || !schema.fields) return record;
  const out = { ...record };
  for (const [field, type] of Object.entries(schema.fields)) {
    if (!ARRAY_TYPES.has(type)) continue;
    const val = out[field];
    if (typeof val === 'string') {
      try { out[field] = JSON.parse(val); } catch { out[field] = []; }
    } else if (!Array.isArray(val)) {
      out[field] = [];
    }
  }
  return out;
}

function denormalizeArrays(entityName, record) {
  if (!record) return record;
  const schema = getSchema(entityName);
  if (!schema || !schema.fields) return record;
  const out = { ...record };
  for (const [field, type] of Object.entries(schema.fields)) {
    if (!ARRAY_TYPES.has(type)) continue;
    const val = out[field];
    if (Array.isArray(val)) {
      out[field] = JSON.stringify(val);
    }
  }
  return out;
}

function coerceNumericFields(entityName, record) {
  if (!record) return record;
  const schema = getSchema(entityName);
  if (!schema || !schema.fields) return record;
  const out = { ...record };
  for (const [field, type] of Object.entries(schema.fields)) {
    if (type !== 'number') continue;
    const val = out[field];
    if (typeof val === 'string') {
      const n = Number(val);
      out[field] = Number.isFinite(n) ? n : 0;
    } else if (val === null || val === undefined) {
      out[field] = 0;
    }
  }
  return out;
}

function stripUnknownFields(entityName, record) {
  if (!record) return record;
  const schema = getSchema(entityName);
  if (!schema || !schema.fields) return record;
  const known = new Set(Object.keys(schema.fields));
  known.add('id');
  const out = {};
  for (const [key, val] of Object.entries(record)) {
    if (known.has(key) && val !== undefined) out[key] = val;
  }
  return out;
}

async function ensureCollectionExists(db, collection) {
  const providerName = EntityRegistry.providerTable(collection);
  const exists = await db.collectionExists(providerName).catch(() => false);
  if (!exists) {
    const schema = getSchema(collection);
    const res = await db.ensureCollection(providerName, schema || {}).catch(() => null);
    // A newly created table is invisible to PostgREST until its schema cache is
    // reloaded — do it now so the immediate retry can see the columns.
    if (res?.created && typeof db.reloadSchema === 'function') {
      await db.reloadSchema();
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  return exists;
}

// After we add columns (or create a table) via raw SQL, PostgREST keeps a stale
// schema cache and the next write 400s. Reload the cache and pause briefly so
// the retry runs against the refreshed schema.
async function refreshSchemaAfterProvision(db, provisioned) {
  if (!provisioned || typeof db.reloadSchema !== 'function') return;
  await db.reloadSchema();
  await new Promise((r) => setTimeout(r, 400));
}

async function ensureRecordColumns(db, collection, record) {
  const providerName = EntityRegistry.providerTable(collection);
  const schema = getSchema(collection);
  if (!schema || typeof db.listColumns !== 'function') return;
  const liveColumns = await db.listColumns(providerName).catch(() => null);

  let added = false;
  if (liveColumns) {
    const liveNames = new Set(liveColumns.map((c) => c.name.toLowerCase()));
    for (const [field, val] of Object.entries(record)) {
      if (field === 'id') continue;
      if (liveNames.has(field.toLowerCase())) continue;
      const pgType = EntityRegistry.pgType(schema.fields?.[field] || (typeof val === 'number' ? 'numeric' : 'text'));
      await db.ensureColumn(providerName, field, pgType).catch(() => {});
      liveNames.add(field.toLowerCase());
      added = true;
    }
  } else {
    for (const [field, type] of Object.entries(schema.fields || {})) {
      if (field === 'id') continue;
      await db.ensureColumn(providerName, field, EntityRegistry.pgType(type)).catch(() => {});
      added = true;
    }
  }
  await refreshSchemaAfterProvision(db, added);
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, retries = MAX_RETRIES) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

async function withProvisioning(provider, collection, fn) {
  try {
    return await fn();
  } catch (err) {
    await ensureCollectionExists(provider, collection);
    return fn();
  }
}

async function withProvisioningAndRetry(provider, collection, fn) {
  return withRetry(() => withProvisioning(provider, collection, fn));
}

async function grantCollectionAccess(db, collection) {
  if (typeof db.execSql !== 'function') { console.warn('[grantAccess] provider has no execSql'); return false; }
  const table = EntityRegistry.providerTable(collection);
  const sql = `
    alter table if exists "${table}" enable row level security;
    drop policy if exists "${table}_anon_all" on "${table}";
    create policy "${table}_anon_all" on "${table}" for all to anon using (true) with check (true);
    grant insert, select, update, delete on table "${table}" to anon;
    create table if not exists "_sequences" (id text primary key, entity text, current numeric default 0, "createdAt" timestamptz, "updatedAt" timestamptz);
    alter table if exists "_sequences" enable row level security;
    drop policy if exists "_sequences_anon_all" on "_sequences";
    create policy "_sequences_anon_all" on "_sequences" for all to anon using (true) with check (true);
    grant insert, select, update, delete on table "_sequences" to anon;
  `;
  const res = await db.execSql(sql);
  if (res?.needsManual) {
    console.warn('[grantAccess] exec_sql RPC not available — RLS policies not auto-created. Run installation SQL manually in Supabase SQL Editor.');
    return false;
  }
  if (res?.ok === false) {
    console.warn('[grantAccess] failed:', res.error);
    return false;
  }
  console.log('[grantAccess] RLS policies applied for', table);
  // Fix incorrect FK constraint fk_case_folders_parent_id that earlier versions
  // of SchemaCompiler generated with 'case_id' instead of 'parent_id' as the
  // source column. This causes "Key is not present in table case_folders" when
  // creating the first folder for a case. Drop the wrong constraint and recreate
  // it with the correct column. safe_create_fk skips if the constraint already
  // has the correct definition.
  try {
    await db.execSql(`
      alter table if exists "case_folders" drop constraint if exists "fk_case_folders_parent_id";
      select safe_create_fk('case_folders', 'parent_id', 'case_folders', 'id', 'fk_case_folders_parent_id', 'CASCADE');
    `);
  } catch (_) {}
  return true;
}

export function createRepository(collection) {
  const entityName = collection;
  const providerName = () => EntityRegistry.providerTable(entityName);
  const p = () => getDatabaseProvider();

  return {
    collection: entityName,

    // ---- reads (LexAI field names in, provider translated out) ----
    getAll: (query = {}) => withProvisioningAndRetry(p(), entityName,
      async () => {
        const rows = await p().list(providerName(), FieldMapper.filterToProvider(entityName, query));
        return (rows || []).map((r) => normalizeArrays(entityName, FieldMapper.toLexAI(entityName, r)));
      }),
    getById: (id) => withProvisioningAndRetry(p(), entityName,
      async () => {
        const row = await p().get(providerName(), id);
        return row ? normalizeArrays(entityName, FieldMapper.toLexAI(entityName, row)) : null;
      }),
    query: (query = {}) => withProvisioningAndRetry(p(), entityName,
      async () => {
        const rows = await p().list(providerName(), FieldMapper.filterToProvider(entityName, query));
        return (rows || []).map((r) => normalizeArrays(entityName, FieldMapper.toLexAI(entityName, r)));
      }),
    count: (query = {}) => withProvisioningAndRetry(p(), entityName,
      () => p().count(providerName(), FieldMapper.filterToProvider(entityName, query))),

    // ---- writes with auto‑provisioning ----
    async create(record = {}) {
      const ik = getIdempotencyKey(record);
      if (ik) {
        const cached = checkIdempotency(ik);
        if (cached) return cached.result;
      }
      const cleanRecord = { ...record };
      delete cleanRecord.idempotencyKey;
      delete cleanRecord._idempotencyKey;
      const provider = p();
      const enriched = applyDefaults(entityName, cleanRecord);
      // Generate LexAI business ID if not provided
      if (!enriched.id) {
        enriched.id = await IDEngine.generate(entityName);
      }
      const denormalized = denormalizeArrays(entityName, enriched);
      const coerced = coerceNumericFields(entityName, denormalized);
      const providerRecord = FieldMapper.toProvider(entityName, coerced);
      const wasAutoId = !cleanRecord.id;
      try {
        const result = await provider.create(providerName(), providerRecord);
        const out = normalizeArrays(entityName, FieldMapper.toLexAI(entityName, result));
        if (ik) setIdempotency(ik, { result: out, ts: Date.now() });
        return out;
      } catch (err) {
        await ensureCollectionExists(provider, entityName);
        await ensureRecordColumns(provider, entityName, providerRecord);
        await grantCollectionAccess(provider, entityName);
        if (wasAutoId) {
          enriched.id = await IDEngine.generate(entityName);
        }
        const retryRecord = FieldMapper.toProvider(entityName, coerceNumericFields(entityName, denormalizeArrays(entityName, enriched)));
        const result = await provider.create(providerName(), retryRecord);
        const out = normalizeArrays(entityName, FieldMapper.toLexAI(entityName, result));
        if (ik) setIdempotency(ik, { result: out, ts: Date.now() });
        return out;
      }
    },

    async update(id, patch = {}) {
      const ik = getIdempotencyKey(patch);
      if (ik) {
        const cached = checkIdempotency(ik);
        if (cached) return cached.result;
      }
      const cleanPatch = { ...patch };
      delete cleanPatch.idempotencyKey;
      delete cleanPatch._idempotencyKey;
      const provider = p();
      const stamped = { ...cleanPatch, updatedAt: DateEngine.now() };
      const denormalized = denormalizeArrays(entityName, stamped);
      const stripped = stripUnknownFields(entityName, denormalized);
      const coerced = coerceNumericFields(entityName, stripped);
      const providerPatch = FieldMapper.toProvider(entityName, coerced);
      try {
        const result = await provider.update(providerName(), id, providerPatch);
        const out = normalizeArrays(entityName, FieldMapper.toLexAI(entityName, result));
        if (ik) setIdempotency(ik, { result: out, ts: Date.now() });
        return out;
      } catch (err) {
        await ensureCollectionExists(provider, entityName);
        await ensureRecordColumns(provider, entityName, providerPatch);
        await grantCollectionAccess(provider, entityName);
        // PostgREST schema cache reload (triggered inside ensureRecordColumns)
        // is asynchronous; retry a few times so a freshly-added column is seen.
        let lastErr = err;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const result = await provider.update(providerName(), id, providerPatch);
            const out = normalizeArrays(entityName, FieldMapper.toLexAI(entityName, result));
            if (ik) setIdempotency(ik, { result: out, ts: Date.now() });
            return out;
          } catch (e) {
            lastErr = e;
            if (typeof provider.reloadSchema === 'function') {
              await provider.reloadSchema();
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }
        throw lastErr;
      }
    },

    delete: (id) => p().remove(providerName(), id),

    // ---- bulk ----
    async bulkCreate(records = []) {
      const provider = p();
      const enriched = records.map((r) => applyDefaults(entityName, r));
      // Generate LexAI business IDs
      const withIds = await Promise.all(enriched.map(async (r) => {
        if (!r.id) r.id = await IDEngine.generate(entityName);
        return r;
      }));
      const providerRecords = withIds.map((r) => FieldMapper.toProvider(entityName, coerceNumericFields(entityName, denormalizeArrays(entityName, r))));
      try {
        const results = await provider.bulkCreate(providerName(), providerRecords);
        return (results || []).map((r) => normalizeArrays(entityName, FieldMapper.toLexAI(entityName, r)));
      } catch (err) {
        await ensureCollectionExists(provider, entityName);
        await ensureRecordColumns(provider, entityName, providerRecords[0] || {});
        const results = await provider.bulkCreate(providerName(), providerRecords);
        return (results || []).map((r) => normalizeArrays(entityName, FieldMapper.toLexAI(entityName, r)));
      }
    },

    bulkDelete: (ids = []) => p().bulkRemove(providerName(), ids),
    clear: () => p().clear(providerName()),

    // ---- helpers ----
    validate: (record = {}) => validateRecord(entityName, record),
  };
}

export default createRepository;
