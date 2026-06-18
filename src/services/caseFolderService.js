import { caseFoldersRepository } from '@/data-layer/repositories/caseFoldersRepository.js';

// caseFolderService — façade over the `caseFolders` collection.
// A folder row: { id, caseId, name, kind: 'document' | 'draft', order, system }
export const caseFolderService = {
  list: (caseId, kind) => caseFoldersRepository.getAll({ ...(caseId ? { caseId } : {}), ...(kind ? { kind } : {}) }),
  create: (record) => caseFoldersRepository.create(record),
  update: (id, patch) => caseFoldersRepository.update(id, patch),
  remove: (id) => caseFoldersRepository.delete(id),
};

export default caseFolderService;
