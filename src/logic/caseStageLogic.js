import { caseStageService } from '@/services/caseStageService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO } from '@/utils/id.js';

const SHORT_CODE_PREFIX = 'CSTT';

function autoShortCode(name = '') {
  const slug = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug ? `${SHORT_CODE_PREFIX}-${slug}` : '';
}

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
    const n = (typeof name === 'object' ? (name.name || '') : (name || '')).trim();
    if (!n) return fail('Stage name is required.');
    const data = typeof name === 'object' ? name : {};
    const rows = await caseStageService.list();
    if (rows.some((s) => s.name.toLowerCase() === n.toLowerCase())) return fail('That stage already exists.');
    const order = rows.reduce((m, s) => Math.max(m, s.order ?? 0), 0) + 1;
    return ok(await caseStageService.create({
      name: n,
      short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(n),
      description: (data.description || '').trim(),
      display_order: data.display_order ?? order,
      status: data.status || 'Active',
      createdAt: nowISO(),
    }));
  },

  async rename(id, name) {
    const n = (name || '').trim();
    if (!n) return fail('Stage name is required.');
    return ok(await caseStageService.update(id, { name: n }));
  },

  async update(id, data) {
    return ok(await caseStageService.update(id, {
      name: data.name,
      short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(data.name || ''),
      description: (data.description || '').trim(),
      status: data.status,
    }));
  },

  async remove(id) {
    return ok(await caseStageService.remove(id));
  },

  async setStatus(id, status) {
    return ok(await caseStageService.update(id, { status }));
  },

  // Persist a new ordering (drag & reorder).
  async reorder(orderedIds) {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await caseStageService.update(orderedIds[i], { display_order: i });
    }
    return ok(true);
  },
};

export default caseStageLogic;
