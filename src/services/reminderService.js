import { remindersRepository } from '@/data-layer/repositories/remindersRepository.js';
import { nowISO } from '@/utils/id.js';

// reminderService — case reminders (hearing / filing / evidence / compliance
// deadlines). A row: { id, caseId, type, title, date, done, createdAt }
export const reminderService = {
  list: (caseId) => remindersRepository.getAll(caseId ? { caseId } : {}),
  create: (data) => remindersRepository.create({ done: false, createdAt: nowISO(), ...data }),
  update: (id, patch) => remindersRepository.update(id, patch),
  remove: (id) => remindersRepository.delete(id),
};

export default reminderService;
