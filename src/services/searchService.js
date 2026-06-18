import { getSearchProvider } from '@/providers/search/index.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { draftsRepository } from '@/data-layer/repositories/draftsRepository.js';
import { casesRepository } from '@/data-layer/repositories/casesRepository.js';

// searchService — façade over the active SearchProvider. Can (re)build the index
// from DB-held documents/drafts and run relevance queries.
export const searchService = {
  async reindexCaseCorpus() {
    const [documents, drafts, cases] = await Promise.all([
      documentsRepository.getAll(),
      draftsRepository.getAll(),
      casesRepository.getAll(),
    ]);
    const docs = [
      ...documents.map((d) => ({ id: d.id, kind: 'document', title: d.name, text: d.text, caseId: d.caseId })),
      ...drafts.map((d) => ({ id: d.id, kind: 'draft', title: d.title, text: d.content, caseId: d.caseId })),
      ...cases.map((c) => ({ id: c.id, kind: 'case', title: c.title, text: `${c.description} ${c.caseNumber}`, caseId: c.id })),
    ];
    await getSearchProvider().index(docs);
    return docs.length;
  },

  async search(queryText, opts) {
    await this.reindexCaseCorpus();
    return getSearchProvider().search(queryText, opts);
  },
};

export default searchService;
