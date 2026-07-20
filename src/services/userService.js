import { usersRepository } from '@/data-layer/repositories/usersRepository.js';
import { requireCapability } from '@/logic/permissionGuard.js';

// userService — façade over the `users` collection (via the repository layer).
// Mutations are gated by the caller's resolved permissions; reads are open so
// the app shell can resolve roles and the current user.
export const userService = {
  list: (query) => usersRepository.getAll(query),
  get: (id) => usersRepository.getById(id),
  create: (record) => { requireCapability('users.create'); return usersRepository.create(record); },
  update: (id, patch) => { requireCapability('users.edit'); return usersRepository.update(id, patch); },
  remove: (id) => { requireCapability('users.delete'); return usersRepository.delete(id); },
};

export default userService;
