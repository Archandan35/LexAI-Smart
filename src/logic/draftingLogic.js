import { draftingService } from '@/services/draftingService.js';
import { citationService } from '@/services/citationService.js';
import { storageService } from '@/services/storageService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { DRAFT_TYPE_MAP } from '@/constants/draftTypes.js';
import { ok, fail } from '@/utils/result.js';
import { MESSAGES } from '@/constants/messages.js';
import { nowISO } from '@/utils/id.js';

// draftingLogic — orchestrates draft generation. Validates inputs, calls the
// drafting service, and (critically) only appends citations that the citation
// provider actually returned. The AI text itself carries no invented authority.
export const draftingLogic = {
  async generate(input) {
    if (!input?.type || !DRAFT_TYPE_MAP[input.type]) {
      return fail('Select a valid draft type.');
    }
    try {
      const content = await draftingService.generate(input);

      // If the user asked to attach precedent, retrieve REAL authorities only.
      let citations = [];
      if (input.attachCitations && (input.facts || input.issue)) {
        citations = await citationService.searchCases({
          facts: input.facts, issue: input.issue, act: input.act,
        });
      }
      const citationBlock = citations.length
        ? `\n\nAUTHORITIES RELIED UPON (verified):\n${citations
            .map((c, i) => `${i + 1}. ${c.citation} — ${c.court} (${c.date}) [${c.sourceUrl}]`)
            .join('\n')}`
        : input.attachCitations
        ? `\n\nAUTHORITIES: ${MESSAGES.noPrecedent}`
        : '';

      return ok({ content: content + citationBlock, citations });
    } catch (e) {
      return fail(e);
    }
  },

  listDrafts: (caseId) => draftingService.listDrafts(caseId),
  getDraft: (id) => draftingService.getDraft(id),
  createDraft: (data) => draftingService.createDraft({ folder: 'Miscellaneous', fileType: 'docx', status: 'draft', ...data }),
  saveDraft: (id, patch) => draftingService.saveDraft(id, patch),
  deleteDraft: (id) => draftingService.deleteDraft(id),
  restoreVersion: (id, versionId) => draftingService.restoreVersion(id, versionId),

  async duplicate(id) {
    const d = await draftingService.getDraft(id);
    if (!d) return fail('Draft not found.');
    const { id: _drop, versions, createdAt, updatedAt, ...rest } = d;
    return ok(await draftingService.createDraft({ ...rest, title: `${d.title} (Copy)`, versions: [], updatedAt: nowISO() }));
  },

  // Move a draft into a case document folder: creates a document from the draft
  // content in the chosen folder, then removes it from the draft workspace.
  async storeInCase(id, { caseId, folder }, user) {
    try {
      const d = await draftingService.getDraft(id);
      if (!d) return fail('Draft not found.');
      const targetCase = caseId || d.caseId;
      if (!targetCase) return fail('Select a case to store the draft in.');
      const ext = d.fileType || 'docx';
      const stored = await storageService.upload(
        { name: `${d.title}.${ext}`, text: d.content || '', type: 'text/plain' },
      );
      await storageService.createDocumentRecord({
        caseId: targetCase, name: `${d.title}.${ext}`, folder: folder || 'Miscellaneous',
        mime: 'text/plain', size: stored.size, ref: stored.ref, text: d.content || '',
        source: 'draft', fromDraftId: id,
      });
      await draftingService.deleteDraft(id);
      await caseActivityService.record(targetCase, 'draft.store', `Draft "${d.title}" stored in ${folder}`, user);
      return ok({ folder });
    } catch (e) {
      return fail(e);
    }
  },
};

export default draftingLogic;
