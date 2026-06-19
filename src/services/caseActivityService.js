import { caseActivityRepository } from '@/data-layer/repositories/caseActivityRepository.js';
import { DateEngine } from '@/core/index.js';

// caseActivityService — per-case timeline of system events (the Case Timeline /
// audit trail). Distinct from caseHistory (legal proceedings).
export const caseActivityService = {
  list: (caseId) => caseActivityRepository.getAll(caseId ? { caseId } : {}),
  async record(caseId, action, message, user) {
    try {
      return await caseActivityRepository.create({
        caseId, action, message: message || action, by: user?.name || user?.email || 'system', at: DateEngine.now(),
      });
    } catch { return null; }
  },
};

export default caseActivityService;
