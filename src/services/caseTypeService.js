import { caseTypesRepository } from '@/data-layer/repositories/caseTypesRepository.js';

export const caseTypeService = {
  list: (query) => caseTypesRepository.getAll(query),
  get: (id) => caseTypesRepository.getById(id),
  create: (record) => caseTypesRepository.create(record),
  update: (id, patch) => caseTypesRepository.update(id, patch),
  remove: (id) => caseTypesRepository.delete(id),
  bulkCreate: (records) => caseTypesRepository.bulkCreate(records),
  bulkDelete: (ids) => caseTypesRepository.bulkDelete(ids),
};

export default caseTypeService;
