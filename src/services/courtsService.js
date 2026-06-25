import { courtsRepository } from '@/data-layer/repositories/courtsRepository.js';

export const courtsService = {
  list: (query) => courtsRepository.getAll(query),
  get: (id) => courtsRepository.getById(id),
  create: (record) => courtsRepository.create(record),
  update: (id, patch) => courtsRepository.update(id, patch),
  remove: (id) => courtsRepository.delete(id),
};

export default courtsService;
