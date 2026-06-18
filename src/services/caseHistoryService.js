import { caseHistoryRepository } from '@/data-layer/repositories/caseHistoryRepository.js';

// caseHistoryService — façade over the `caseHistory` collection (legal
// proceedings history; full untruncated text, imported from cause list or added).
// A row: { id, caseId, date, status, text, source, createdAt }
export const caseHistoryService = {
  list: (caseId) => caseHistoryRepository.getAll(caseId ? { caseId } : {}),
  create: (record) => caseHistoryRepository.create(record),
  update: (id, patch) => caseHistoryRepository.update(id, patch),
  remove: (id) => caseHistoryRepository.delete(id),
};

export default caseHistoryService;
