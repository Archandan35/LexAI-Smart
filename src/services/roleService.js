import { rolesRepository } from '@/data-layer/repositories/rolesRepository.js';
import { requireCapability } from '@/logic/permissionGuard.js';

// roleService — façade over the `roles` collection (via the repository layer).
// Mutations are gated by the caller's resolved permissions; reads are open so
// the app shell can always resolve the current user's capabilities.
export const roleService = {
  list: (query) => rolesRepository.getAll(query),
  get: (id) => rolesRepository.getById(id),
  create: (record) => { requireCapability('roles.create'); return rolesRepository.create(record); },
  update: (id, patch) => { requireCapability('roles.edit'); return rolesRepository.update(id, patch); },
  remove: (id) => { requireCapability('roles.delete'); return rolesRepository.delete(id); },
};

export default roleService;
