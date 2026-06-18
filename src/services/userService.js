import { usersRepository } from '@/data-layer/repositories/usersRepository.js';

// userService — façade over the `users` collection (via the repository layer).
export const userService = {
  list: (query) => usersRepository.getAll(query),
  get: (id) => usersRepository.getById(id),
  create: (record) => usersRepository.create(record),
  update: (id, patch) => usersRepository.update(id, patch),
  remove: (id) => usersRepository.delete(id),
};

export default userService;
