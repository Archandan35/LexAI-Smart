import { actsRepository } from '@/data-layer/repositories/actsRepository.js';

export const actService = {
  list: () => actsRepository.getAll(),
  get: (id) => actsRepository.getById(id),
  create: (record) => actsRepository.create(record),
  update: (id, patch) => actsRepository.update(id, patch),
  remove: (id) => actsRepository.delete(id),
};

export default actService;
