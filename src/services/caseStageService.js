import { caseStagesRepository } from '@/data-layer/repositories/caseStagesRepository.js';

// caseStageService — façade over the `caseStages` collection (dynamic stages).
export const caseStageService = {
  list: () => caseStagesRepository.getAll(),
  create: (record) => caseStagesRepository.create(record),
  update: (id, patch) => caseStagesRepository.update(id, patch),
  remove: (id) => caseStagesRepository.delete(id),
};

export default caseStageService;
