import { caseStageService } from '@/services/caseStageService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO } from '@/utils/id.js';

// caseStageLogic — dynamic case-stage management (Stage Manager).
export const caseStageLogic = {
  async list() {
    const rows = await caseStageService.list();
    return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async names() {
    return (await this.list()).map((s) => s.name);
  },

  async add(name) {
    const n = (name || '').trim();
    if (!n) return fail('Stage name is required.');
    const rows = await caseStageService.list();
    if (rows.some((s) => s.name.toLowerCase() === n.toLowerCase())) return fail('That stage already exists.');
    const order = rows.reduce((m, s) => Math.max(m, s.order ?? 0), 0) + 1;
    return ok(await caseStageService.create({ name: n, order, createdAt: nowISO() }));
  },

  async rename(id, name) {
    const n = (name || '').trim();
    if (!n) return fail('Stage name is required.');
    return ok(await caseStageService.update(id, { name: n }));
  },

  async remove(id) {
    return ok(await caseStageService.remove(id));
  },

  // Persist a new ordering (drag & reorder).
  async reorder(orderedIds) {
    for (let i = 0; i < orderedIds.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await caseStageService.update(orderedIds[i], { order: i });
    }
    return ok(true);
  },
};

export default caseStageLogic;
