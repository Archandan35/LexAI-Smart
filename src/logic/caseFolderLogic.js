import { caseFolderService } from '@/services/caseFolderService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { storageService } from '@/services/storageService.js';
import { draftsRepository } from '@/data-layer/repositories/draftsRepository.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { ok, fail } from '@/utils/result.js';
import { DateEngine } from '@/core/index.js';

// caseFolderLogic — per-case folder management for documents and drafts.
export const caseFolderLogic = {
  // Return existing folders for a case. No auto-creation of template subfolders.
  // The parent case folder is created in caseLogic.create().
  async ensureForCase(caseId) {
    return caseFolderService.list(caseId);
  },

  async list(caseId, kind) {
    const rows = await this.ensureForCase(caseId);
    const filtered = kind ? rows.filter((f) => f.kind === kind) : rows;
    return [...filtered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async getAllDescendantIds(parentId, allFolders) {
    const ids = [];
    if (!allFolders || !allFolders.length) return ids;
    const walk = (pid) => {
      const children = allFolders.filter((f) => f.parent_id === pid || f.parentId === pid);
      for (const c of children) { ids.push(c.id); walk(c.id); }
    };
    walk(parentId);
    return ids;
  },

  async create(caseId, name, kind, user, parentId) {
    const n = (name || '').trim();
    if (!n) return fail('Folder name is required.');
    const existing = await caseFolderService.list(caseId, kind);
    if (!parentId && parentId !== null && existing.some((f) => f.name.toLowerCase() === n.toLowerCase())) return fail('Folder already exists.');
    const order = existing.reduce((m, f) => Math.max(m, f.order ?? 0), 0) + 1;
    const row = await caseFolderService.create({ caseId, name: n, kind, order, parentId: parentId || null, system: false, createdAt: DateEngine.now() });
    await caseActivityService.record(caseId, 'folder.create', `Created ${kind} folder "${n}"`, user);
    return ok(row);
  },

  async rename(folder, name, user) {
    const n = (name || '').trim();
    if (!n) return fail('Folder name is required.');
    // Items are linked by folder_id now, so just update the folder name.
    // For backward compatibility, also update items that still use the old name field.
    const repo = folder.kind === 'draft' ? draftsRepository : documentsRepository;
    const items = await repo.getAll({ caseId: folder.caseId, folder: folder.name });
    for (const it of items) {
      if (it.folder && !it.folder_id) {
        // eslint-disable-next-line no-await-in-loop
        await repo.update(it.id, { folder: n });
      }
    }
    await caseFolderService.update(folder.id, { name: n });
    await caseActivityService.record(folder.caseId, 'folder.rename', `Renamed folder "${folder.name}" → "${n}"`, user);
    return ok(true);
  },

  // Cascade delete: removes folder + all descendants + their documents.
  // Documents linked by folder_id are deleted; old name-linked docs fall back to parent.
  async remove(folder, { moveTo = 'Miscellaneous' } = {}, user) {
    const allFolders = await caseFolderService.list(folder.caseId);
    const descIds = await this.getAllDescendantIds(folder.id, allFolders);
    const allIds = [...descIds, folder.id];

    const repo = folder.kind === 'draft' ? draftsRepository : documentsRepository;

    // Collect documents from all folders (by folder_id)
    let allDocs = [];
    for (const fid of allIds) {
      // eslint-disable-next-line no-await-in-loop
      const docs = await repo.getAll({ caseId: folder.caseId, folder_id: fid });
      allDocs = allDocs.concat(docs);
    }

    // Backward compat: docs linked by old folder name (no folder_id) — move to parent
    const nameItems = await repo.getAll({ caseId: folder.caseId, folder: folder.name });
    for (const it of nameItems) {
      if (it.folder && !it.folder_id) {
        // eslint-disable-next-line no-await-in-loop
        await repo.update(it.id, { folder: moveTo });
      }
    }

    // Delete document binaries + metadata
    const uniqueDocs = allDocs.filter((d, i, a) => a.findIndex((x) => x.id === d.id) === i);
    for (const doc of uniqueDocs) {
      // eslint-disable-next-line no-await-in-loop
      if (doc.ref) await storageService.deleteDocument(doc.id, doc.ref);
    }

    // Delete folders (deepest first)
    for (const fid of [...allIds].reverse()) {
      // eslint-disable-next-line no-await-in-loop
      await caseFolderService.remove(fid);
    }

    await caseActivityService.record(
      folder.caseId, 'folder.delete',
      `Deleted folder "${folder.name}" and ${uniqueDocs.length} document(s) from ${allIds.length} folder(s)`,
      user,
    );
    return ok(true);
  },
};

export default caseFolderLogic;
