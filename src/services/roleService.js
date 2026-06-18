import { rolesRepository } from '@/data-layer/repositories/rolesRepository.js';

// roleService — façade over the `roles` collection (via the repository layer).
export const roleService = {
  list: (query) => rolesRepository.getAll(query),
  get: (id) => rolesRepository.getById(id),
  create: (record) => rolesRepository.create(record),
  update: (id, patch) => rolesRepository.update(id, patch),
  remove: (id) => rolesRepository.delete(id),
};

export default roleService;
