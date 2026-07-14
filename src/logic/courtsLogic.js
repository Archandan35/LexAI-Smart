import { courtsService } from '@/services/courtsService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';
import { orderComparator, normalizeDisplayOrder } from '@/utils/displayOrder.js';

const SHORT_CODE_PREFIX = 'COUT';

function autoShortCode(name = '') {
  const slug = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug ? `${SHORT_CODE_PREFIX}-${slug}` : '';
}

async function resolveParentId({ parent_id, parent_name }, courtsService) {
  if (parent_id) return parent_id;
  if (!parent_name) return null;
  const target = String(parent_name).trim().toLowerCase();
  if (!target) return null;
  const rows = await courtsService.list();
  const match = rows.find((c) => String(c.name).trim().toLowerCase() === target);
  return match?.id ?? null;
}

export const courtsLogic = {
  async list() {
    try {
      const rows = await courtsService.list();
      return [...rows].sort(orderComparator);
    } catch (err) { return fail(err); }
  },

  // Renumber each sibling group (rows sharing the same parent_id) to a clean 1..N.
  async normalizeOrder() {
    const rows = await courtsService.list();
    return normalizeDisplayOrder(rows, (id, patch) => courtsService.update(id, patch), { groupBy: 'parent_id' });
  },

  async get(id) {
    try {
      return courtsService.get(id);
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Court name is required.');

      const parent_id = await resolveParentId(
        { parent_id: data.parent_id, parent_name: data.parent_name },
        courtsService
      );

      const short_code = (data.short_code || '').trim() || autoShortCode(name);

      return ok(await courtsService.create({
        name,
        short_code,
        level: data.level ?? 1,
        parent_id,
        display_order: data.display_order ?? 0,
        color: data.color || '#6b7280',
        status: 'Active',
        createdAt: nowISO(),
      }));
    } catch (err) { return fail(err); }
  },

  // Update only the fields actually provided. This is critical: a partial
  // update (e.g. a status toggle or a drag-reorder) must NOT wipe out
  // parent_id, short_code or display_order that the caller didn't touch.
  async update(id, data) {
    try {
      const patch = {};
      if (data.name !== undefined) {
        const name = (data.name || '').trim();
        if (!name) return fail('Court name is required.');
        patch.name = name;
      }
      if (data.short_code !== undefined) patch.short_code = (data.short_code || '').trim().toUpperCase();
      if (data.parent_id !== undefined || data.parent_name !== undefined) {
        patch.parent_id = await resolveParentId(
          { parent_id: data.parent_id, parent_name: data.parent_name },
          courtsService
        );
      }
      if (data.description !== undefined) patch.description = (data.description || '').trim();
      if (data.level !== undefined) patch.level = data.level;
      if (data.display_order !== undefined) patch.display_order = data.display_order;
      if (data.color !== undefined) patch.color = data.color;
      if (data.status !== undefined) patch.status = data.status;
      return ok(await courtsService.update(id, patch));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try {
      return ok(await courtsService.remove(id));
    } catch (err) { return fail(err); }
  },

  async bulkCreate(records) {
    try {
      const existing = await courtsService.list();
      const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));

      let maxOrder = existing.reduce((m, c) => Math.max(m, c.display_order ?? 0), 0);

      const imported = [];
      const skipped = [];
      const failed = [];

      for (const r of records) {
        try {
          const name = (r.name || '').trim();
          if (!name) { failed.push({ record: r, error: 'Name is required' }); continue; }

          if (existingNames.has(name.toLowerCase())) {
            skipped.push({ name, error: 'Duplicate court name' });
            continue;
          }

          const parent_id = await resolveParentId(
            { parent_id: r.parent_id, parent_name: r.parent_name },
            courtsService
          );

          const short_code = (r.short_code || '').trim() || autoShortCode(name);

          maxOrder += 1;
          const result = await courtsService.create({
            name,
            short_code,
            level: r.level ?? 1,
            parent_id,
            display_order: maxOrder,
            status: 'Active',
            createdAt: nowISO(),
          });

          existingNames.add(name.toLowerCase());
          imported.push(result);
        } catch (err) {
          failed.push({ record: r, error: err.message || String(err) });
        }
      }

      return ok({ imported, skipped, failed });
    } catch (err) { return fail(err); }
  },

  async bulkRemove(ids) {
    try {
      let deleted = 0;
      const batchSize = 5;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await Promise.all(batch.map((id) => courtsService.remove(id).then(() => { deleted += 1; }).catch(() => {})));
      }
      return ok({ deleted, failed: ids.length - deleted });
    } catch (err) { return fail(err); }
  },

  async importCSV(csvText) {
    const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
    const records = [];
    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim());
      const name = parts[0];
      const short_code = parts[1] || '';
      const parent_name = parts[2] || '';
      if (!name) continue;
      records.push({ name, short_code, parent_name });
    }
    return this.bulkCreate(records);
  },

  async importJSON(jsonText) {
    let data;
    try { data = JSON.parse(jsonText); } catch { return fail('Invalid JSON format.'); }
    const arr = Array.isArray(data) ? data : [data];
    const records = arr.map((r) => ({
      name: r.name || r.court_name || r.court || '',
      short_code: r.short_code || r.code || '',
      parent_name: r.parent_name || r.parent || '',
    }));
    return this.bulkCreate(records);
  },

  async importText(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const records = lines.map((name) => ({ name, short_code: '', parent_name: '' }));
    return this.bulkCreate(records);
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await courtsService.update(orderedIds[i], { display_order: i + 1 });
      }
      return ok(true);
    } catch (err) { return fail(err); }
  },
};

export default courtsLogic;
