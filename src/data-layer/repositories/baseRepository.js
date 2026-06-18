// baseRepository — the per-entity data-access factory. Every repository is a
// thin, uniform wrapper over the active DatabaseProvider, so the service layer
// gets the SAME API for every collection regardless of which backend is live.
//
// Layering: repositories sit BELOW services and ABOVE providers. They import
// only the provider FACTORY (never an SDK) and the universal schema (for
// defaults/validation). Services import repositories; repositories never import
// services. This keeps the dependency arrow pointing down and honours R4/R5.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { applyDefaults, validateRecord } from '@/data-provider/schema/index.js';

export function createRepository(collection) {
  const db = () => getDatabaseProvider();

  return {
    collection,

    // ---- reads ----
    getAll: (query = {}) => db().list(collection, query),
    getById: (id) => db().get(collection, id),
    query: (query = {}) => db().list(collection, query),
    count: (query = {}) => db().count(collection, query),

    // ---- writes ----
    // Schema defaults fill only fields the caller omitted; explicit values win.
    create: (record = {}) => db().create(collection, applyDefaults(collection, record)),
    update: (id, patch = {}) => db().update(collection, id, patch),
    delete: (id) => db().remove(collection, id),

    // ---- bulk ----
    bulkCreate: (records = []) => db().bulkCreate(collection, records.map((r) => applyDefaults(collection, r))),
    bulkDelete: (ids = []) => db().bulkRemove(collection, ids),
    clear: () => db().clear(collection),

    // ---- helpers ----
    validate: (record = {}) => validateRecord(collection, record),
  };
}

export default createRepository;
