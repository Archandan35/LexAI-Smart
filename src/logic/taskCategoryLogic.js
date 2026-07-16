import { taskCategoriesRepository } from '@/data-layer/repositories/taskCategoriesRepository.js';
import { DateEngine } from '@/core/index.js';
import { ok, fail } from '@/utils/result.js';

function autoShortCode(name = '') {
  const slug = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug;
}

export const taskCategoryLogic = {
  async list() {
    try { return ok(await taskCategoriesRepository.getAll({})); }
    catch (err) { return fail(err); }
  },
  async create(data = {}) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Category name is required.');
      return ok(await taskCategoriesRepository.create({
        name,
        short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(name),
        description: data.description || '',
        color: data.color || '#6b7280',
        status: data.status || 'Active',
        createdAt: DateEngine.now(),
      }));
    } catch (err) { return fail(err); }
  },
  async update(id, data = {}) {
    try {
      const patch = {};
      if (data.name !== undefined) {
        const name = (data.name || '').trim();
        if (!name) return fail('Category name is required.');
        patch.name = name;
      }
      if (data.short_code !== undefined) patch.short_code = (data.short_code || '').trim().toUpperCase();
      if (data.description !== undefined) patch.description = data.description || '';
      if (data.color !== undefined) patch.color = data.color;
      if (data.status !== undefined) patch.status = data.status || 'Active';
      return ok(await taskCategoriesRepository.update(id, patch));
    } catch (err) { return fail(err); }
  },
  async remove(id) {
    try { return ok(await taskCategoriesRepository.delete(id)); }
    catch (err) { return fail(err); }
  },
};

export default taskCategoryLogic;
