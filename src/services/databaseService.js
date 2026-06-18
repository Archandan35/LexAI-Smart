import { getRepository } from '@/data-layer/repositories/index.js';

// databaseService — generic, provider-agnostic data façade. Now delegates to the
// repository layer so EVERY data path in the app (named-entity services AND the
// few logic modules that need generic/dynamic-collection access) funnels through
// the same repositories → DatabaseProvider chain. Switching databases is still a
// single env-var change; no caller here ever imports a provider SDK.
const repo = (collection) => getRepository(collection);

export const databaseService = {
  list: (collection, query) => repo(collection).getAll(query),
  get: (collection, id) => repo(collection).getById(id),
  create: (collection, record) => repo(collection).create(record),
  update: (collection, id, patch) => repo(collection).update(id, patch),
  remove: (collection, id) => repo(collection).delete(id),

  // Extended capabilities, available to generic callers too.
  count: (collection, query) => repo(collection).count(query),
  bulkCreate: (collection, records) => repo(collection).bulkCreate(records),
  bulkRemove: (collection, ids) => repo(collection).bulkDelete(ids),
  clear: (collection) => repo(collection).clear(),
};

export default databaseService;
