import { reminderService } from '@/services/reminderService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { ok, fail } from '@/utils/result.js';

export const REMINDER_TYPES = [
  'Hearing Date',
  'Filing Deadline',
  'Evidence Deadline',
  'Compliance Deadline',
];

// reminderLogic — per-case reminders with deadline tracking.
export const reminderLogic = {
  async list(caseId) {
    const rows = await reminderService.list(caseId);
    return [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async add(caseId, { type, title, date }, user) {
    if (!title?.trim()) return fail('Reminder title is required.');
    if (!date) return fail('A date is required.');
    const row = await reminderService.create({ caseId, type: type || REMINDER_TYPES[0], title: title.trim(), date });
    await caseActivityService.record(caseId, 'case.update', `Reminder set: ${title.trim()} (${date})`, user);
    return ok(row);
  },

  async toggle(reminder) {
    return ok(await reminderService.update(reminder.id, { done: !reminder.done }));
  },

  async remove(id) {
    return ok(await reminderService.remove(id));
  },
};

export default reminderLogic;
