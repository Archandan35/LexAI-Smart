import { aiService } from './aiService.js';
import { draftsRepository } from '@/data-layer/repositories/draftsRepository.js';
import { uid, nowISO } from '@/utils/id.js';
import { limits } from '@/config/featureFlags.js';

// draftingService — generation + persistence + version history for drafts.
export const draftingService = {
  generate: (data) => aiService.generateDraft(data),

  listDrafts: (caseId) => draftsRepository.getAll(caseId ? { caseId } : {}),
  getDraft: (id) => draftsRepository.getById(id),

  createDraft: (data) =>
    draftsRepository.create({ versions: [], updatedAt: nowISO(), ...data }),

  async saveDraft(id, { content, title }) {
    const existing = await draftsRepository.getById(id);
    if (!existing) return null;
    // Push the previous content as a version snapshot before overwriting.
    const versions = [
      { id: uid('ver'), content: existing.content, savedAt: existing.updatedAt || nowISO() },
      ...(existing.versions || []),
    ].slice(0, limits.maxDraftVersions);
    return draftsRepository.update(id, {
      content: content ?? existing.content,
      title: title ?? existing.title,
      versions,
    });
  },

  deleteDraft: (id) => draftsRepository.delete(id),

  async restoreVersion(id, versionId) {
    const draft = await draftsRepository.getById(id);
    const version = (draft?.versions || []).find((v) => v.id === versionId);
    if (!version) return null;
    return this.saveDraft(id, { content: version.content });
  },
};

export default draftingService;
