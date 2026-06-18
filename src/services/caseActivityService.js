import { caseActivityRepository } from '@/data-layer/repositories/caseActivityRepository.js';
import { nowISO } from '@/utils/id.js';

// caseActivityService — per-case timeline of system events (the Case Timeline /
// audit trail). Distinct from caseHistory (legal proceedings).
// A row: { id, caseId, type, text, userName, at }
export const caseActivityService = {
  list: (caseId) => caseActivityRepository.getAll(caseId ? { caseId } : {}),
  async record(caseId, type, text, user) {
    try {
      return await caseActivityRepository.create({
        caseId, type, text, userName: user?.name || user?.email || 'system', at: nowISO(),
      });
    } catch { return null; }
  },
};

export default caseActivityService;
