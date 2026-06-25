import { judgesRepository } from '@/data-layer/repositories/judgesRepository.js';

export const judgeService = {
  list: (query) => judgesRepository.getAll(query),
  get: (id) => judgesRepository.getById(id),
  create: (record) => judgesRepository.create(record),
  update: (id, patch) => judgesRepository.update(id, patch),
  remove: (id) => judgesRepository.delete(id),
};

export default judgeService;
