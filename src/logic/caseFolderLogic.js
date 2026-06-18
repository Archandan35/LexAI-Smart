import { caseFolderService } from '@/services/caseFolderService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { databaseService } from '@/services/databaseService.js';
import { DEFAULT_DOC_FOLDERS, DEFAULT_DRAFT_FOLDERS } from '@/constants/caseFolders.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO } from '@/utils/id.js';

// caseFolderLogic — per-case folder management for documents and drafts.
export const caseFolderLogic = {
  // Create the default folder set for a case (called on case creation). Idempotent.
  async ensureForCase(caseId) {
    const existing = await caseFolderService.list(caseId);
    if (existing.length) return existing;
    let order = 0;
    for (const name of DEFAULT_DOC_FOLDERS) {
      // eslint-disable-next-line no-await-in-loop
      await caseFolderService.create({ caseId, name, kind: 'document', order: order++, system: true, createdAt: nowISO() });
    }
    order = 0;
    for (const name of DEFAULT_DRAFT_FOLDERS) {
      // eslint-disable-next-line no-await-in-loop
      await caseFolderService.create({ caseId, name, kind: 'draft', order: order++, system: true, createdAt: nowISO() });
    }
    return caseFolderService.list(caseId);
  },

  async list(caseId, kind) {
    const rows = await this.ensureForCase(caseId);
    const filtered = kind ? rows.filter((f) => f.kind === kind) : rows;
    return [...filtered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async create(caseId, name, kind, user) {
    const n = (name || '').trim();
    if (!n) return fail('Folder name is required.');
    const rows = await caseFolderService.list(caseId, kind);
    if (rows.some((f) => f.name.toLowerCase() === n.toLowerCase())) return fail('Folder already exists.');
    const order = rows.reduce((m, f) => Math.max(m, f.order ?? 0), 0) + 1;
    const row = await caseFolderService.create({ caseId, name: n, kind, order, system: false, createdAt: nowISO() });
    await caseActivityService.record(caseId, 'folder.create', `Created ${kind} folder "${n}"`, user);
    return ok(row);
  },

  async rename(folder, name, user) {
    const n = (name || '').trim();
    if (!n) return fail('Folder name is required.');
    // Re-tag any items currently filed under the old name.
    const collection = folder.kind === 'draft' ? 'drafts' : 'documents';
    const items = await databaseService.list(collection, { caseId: folder.caseId, folder: folder.name });
    for (const it of items) {
      // eslint-disable-next-line no-await-in-loop
      await databaseService.update(collection, it.id, { folder: n });
    }
    await caseFolderService.update(folder.id, { name: n });
    await caseActivityService.record(folder.caseId, 'folder.rename', `Renamed folder "${folder.name}" → "${n}"`, user);
    return ok(true);
  },

  async remove(folder, { moveTo = 'Miscellaneous' } = {}, user) {
    const collection = folder.kind === 'draft' ? 'drafts' : 'documents';
    const items = await databaseService.list(collection, { caseId: folder.caseId, folder: folder.name });
    // Reassign items to a fallback folder rather than orphaning them.
    for (const it of items) {
      // eslint-disable-next-line no-await-in-loop
      await databaseService.update(collection, it.id, { folder: moveTo });
    }
    await caseFolderService.remove(folder.id);
    await caseActivityService.record(folder.caseId, 'folder.delete', `Deleted folder "${folder.name}" (moved ${items.length} item(s) to ${moveTo})`, user);
    return ok(true);
  },
};

export default caseFolderLogic;
