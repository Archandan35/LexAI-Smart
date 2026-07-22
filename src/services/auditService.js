import { auditLogsRepository } from '@/data-layer/repositories/auditLogsRepository.js';
import { nowISO } from '@/utils/id.js';

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
let currentLevel = LOG_LEVELS.INFO;

// auditService — structured logging over the `auditLogs` collection.
// NOTE: client-side app — there is no trustworthy server IP. We record a
// best-effort client hint only, clearly labelled.
export const auditService = {
  list: (query) => auditLogsRepository.getAll(query),

  setLevel(level) {
    if (level in LOG_LEVELS) currentLevel = LOG_LEVELS[level];
  },

  debug(action, details = '', meta = {}) {
    if (currentLevel > LOG_LEVELS.DEBUG) return;
    return this.record({ action, module: 'debug', details, meta });
  },

  info(action, details = '', meta = {}) {
    if (currentLevel > LOG_LEVELS.INFO) return;
    return this.record({ action, module: 'info', details, meta });
  },

  warn(action, details = '', meta = {}) {
    if (currentLevel > LOG_LEVELS.WARN) return;
    return this.record({ action, module: 'warn', details, meta });
  },

  error(action, details = '', meta = {}) {
    if (currentLevel > LOG_LEVELS.ERROR) return;
    return this.record({ action, module: 'error', details, meta });
  },

  async record({ action, module, user, details = '', meta = {} }) {
    try {
      return await auditLogsRepository.create({
        action,
        module: module || '',
        userId: user?.id || null,
        userName: user?.name || user?.email || 'system',
        ip: 'client',
        at: nowISO(),
        details,
        meta,
      });
    } catch {
      return null;
    }
  },
};

export default auditService;
