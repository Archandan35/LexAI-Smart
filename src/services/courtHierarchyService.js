import { courtHierarchyRepository } from '@/data-layer/repositories/courtHierarchyRepository.js';

export const courtHierarchyService = {
  list: (query) => courtHierarchyRepository.getAll(query),
  get: (id) => courtHierarchyRepository.getById(id),
  create: (record) => courtHierarchyRepository.create(record),
  update: (id, patch) => courtHierarchyRepository.update(id, patch),
  remove: (id) => courtHierarchyRepository.delete(id),
};

export default courtHierarchyService;
