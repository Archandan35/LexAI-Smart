import { auditLogsRepository } from '@/data-layer/repositories/auditLogsRepository.js';
import { nowISO } from '@/utils/id.js';

// auditService — append-only-ish log over the `auditLogs` collection.
// NOTE: client-side app — there is no trustworthy server IP. We record a
// best-effort client hint only, clearly labelled.
export const auditService = {
  list: (query) => auditLogsRepository.getAll(query),

  async record({ action, module, user, details = '', meta = {} }) {
    try {
      return await auditLogsRepository.create({
        action,
        module: module || '',
        userId: user?.id || null,
        userName: user?.name || user?.email || 'system',
        ip: 'client', // no backend; not a real source IP
        at: nowISO(),
        details,
        meta,
      });
    } catch {
      return null; // never let audit logging break a user action
    }
  },
};

export default auditService;
