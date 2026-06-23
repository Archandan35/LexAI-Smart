import { jurisdictionsRepository } from '@/data-layer/repositories/jurisdictionsRepository.js';

export const jurisdictionService = {
  list: (query) => jurisdictionsRepository.getAll(query),
  get: (id) => jurisdictionsRepository.getById(id),
  create: (record) => jurisdictionsRepository.create(record),
  update: (id, patch) => jurisdictionsRepository.update(id, patch),
  remove: (id) => jurisdictionsRepository.delete(id),
};

export default jurisdictionService;
