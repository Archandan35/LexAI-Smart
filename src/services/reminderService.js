import { remindersRepository } from '@/data-layer/repositories/remindersRepository.js';
import { DateEngine } from '@/core/index.js';

// reminderService — case reminders (hearing / filing / evidence / compliance deadlines).
export const reminderService = {
  list: (caseId) => remindersRepository.getAll(caseId ? { caseId } : {}),
  create: (data) => remindersRepository.create({ done: false, createdAt: DateEngine.now(), ...data }),
  update: (id, patch) => remindersRepository.update(id, patch),
  remove: (id) => remindersRepository.delete(id),
};

export default reminderService;
