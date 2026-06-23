import { benchTypesRepository } from '@/data-layer/repositories/benchTypesRepository.js';

export const benchTypeService = {
  list: (query) => benchTypesRepository.getAll(query),
  get: (id) => benchTypesRepository.getById(id),
  create: (record) => benchTypesRepository.create(record),
  update: (id, patch) => benchTypesRepository.update(id, patch),
  remove: (id) => benchTypesRepository.delete(id),
};

export default benchTypeService;
