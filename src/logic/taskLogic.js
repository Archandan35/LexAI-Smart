import { taskService } from '@/services/taskService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

function cleanString(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

export const taskLogic = {
  async list(query = {}) {
    try {
      return ok(await taskService.list(query));
    } catch (err) { return fail(err); }
  },

  async get(id) {
    try { return ok(await taskService.get(id)); }
    catch (err) { return fail(err); }
  },

  async create(data = {}) {
    try {
      const title = cleanString(data.title);
      if (!title) return fail('Task title is required.');
      const record = {
        title,
        description: cleanString(data.description),
        notes: cleanString(data.notes),
        category: cleanString(data.category),
        priority: cleanString(data.priority) || 'Medium',
        status: cleanString(data.status) || 'Pending',
        active: data.active === undefined ? true : !!data.active,
        due_date: data.due_date || null,
        due_time: cleanString(data.due_time),
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        reminder: !!data.reminder,
        reminder_time: cleanString(data.reminder_time),
        color: cleanString(data.color) || '#6b7280',
        case_id: cleanString(data.case_id),
        hearing_id: cleanString(data.hearing_id),
        tags: cleanString(data.tags),
        attachments: cleanString(data.attachments),
        created_by: cleanString(data.created_by),
        archived: data.archived === undefined ? false : !!data.archived,
        createdAt: nowISO(),
      };
      return ok(await taskService.create(record));
    } catch (err) { return fail(err); }
  },

  async update(id, data = {}) {
    try {
      const patch = {};
      if (data.title !== undefined) {
        const title = cleanString(data.title);
        if (!title) return fail('Task title is required.');
        patch.title = title;
      }
      ['description', 'notes', 'category', 'priority', 'status', 'due_time', 'reminder_time', 'color', 'tags', 'attachments', 'created_by', 'case_id', 'hearing_id'].forEach((k) => {
        if (data[k] !== undefined) patch[k] = cleanString(data[k]);
      });
      ['due_date', 'start_date', 'end_date'].forEach((k) => {
        if (data[k] !== undefined) patch[k] = data[k] || null;
      });
      if (data.active !== undefined) patch.active = !!data.active;
      if (data.reminder !== undefined) patch.reminder = !!data.reminder;
      if (data.archived !== undefined) patch.archived = !!data.archived;
      return ok(await taskService.update(id, patch));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try { return ok(await taskService.remove(id)); }
    catch (err) { return fail(err); }
  },

  async markComplete(id) {
    try { return ok(await taskService.update(id, { status: 'Completed', active: false })); }
    catch (err) { return fail(err); }
  },

  async markPending(id) {
    try { return ok(await taskService.update(id, { status: 'Pending', active: true })); }
    catch (err) { return fail(err); }
  },

  async archive(id) {
    try { return ok(await taskService.update(id, { archived: true, active: false })); }
    catch (err) { return fail(err); }
  },

  async restore(id) {
    try { return ok(await taskService.update(id, { archived: false, active: true })); }
    catch (err) { return fail(err); }
  },

  async duplicate(id) {
    try {
      const res = await taskService.get(id);
      if (!res) return fail('Task not found.');
      const src = Array.isArray(res) ? res[0] : res;
      const copy = { ...src };
      delete copy.id;
      delete copy.createdAt;
      delete copy.updatedAt;
      copy.title = `${src.title} (copy)`;
      copy.status = 'Pending';
      copy.active = true;
      copy.archived = false;
      return ok(await taskService.create(copy));
    } catch (err) { return fail(err); }
  },
};

export default taskLogic;
