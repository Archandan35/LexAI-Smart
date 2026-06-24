import { contactTypesRepository } from '@/data-layer/repositories/contactTypesRepository.js';

export const contactTypeService = {
  list: () => contactTypesRepository.getAll(),
  get: (id) => contactTypesRepository.getById(id),
  create: (record) => contactTypesRepository.create(record),
  update: (id, patch) => contactTypesRepository.update(id, patch),
  remove: (id) => contactTypesRepository.delete(id),
};

export default contactTypeService;
