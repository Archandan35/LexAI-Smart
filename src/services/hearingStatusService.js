import { hearingStatusesRepository } from '@/data-layer/repositories/hearingStatusesRepository.js';

export const hearingStatusService = {
  list: () => hearingStatusesRepository.getAll(),
  get: (id) => hearingStatusesRepository.getById(id),
  create: (record) => hearingStatusesRepository.create(record),
  update: (id, patch) => hearingStatusesRepository.update(id, patch),
  remove: (id) => hearingStatusesRepository.delete(id),
};

export default hearingStatusService;
