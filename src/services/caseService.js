import { casesRepository } from '@/data-layer/repositories/casesRepository.js';
import { hearingsRepository } from '@/data-layer/repositories/hearingsRepository.js';
import { notesRepository } from '@/data-layer/repositories/notesRepository.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';

// caseService — case + related-records orchestration over the repository layer.
export const caseService = {
  listCases: (query) => casesRepository.getAll(query),
  getCase: (id) => casesRepository.getById(id),
  createCase: (data) => casesRepository.create(data),
  updateCase: (id, patch) => casesRepository.update(id, patch),
  deleteCase: (id) => casesRepository.delete(id),

  listHearings: (caseId) => hearingsRepository.getAll(caseId ? { caseId } : {}),
  addHearing: (data) => hearingsRepository.create(data),
  updateHearing: (id, patch) => hearingsRepository.update(id, patch),
  deleteHearing: (id) => hearingsRepository.delete(id),

  listNotes: (caseId) => notesRepository.getAll(caseId ? { caseId } : {}),
  addNote: (data) => notesRepository.create(data),
  deleteNote: (id) => notesRepository.delete(id),

  listDocuments: (caseId) => documentsRepository.getAll(caseId ? { caseId } : {}),
};

export default caseService;
