import SearchProvider from './SearchProvider.js';

// LocalSearchProvider — in-memory TF-style relevance scorer. Good enough for
// demo retrieval; replaceable by Meilisearch/Elastic behind the same contract.
export default class LocalSearchProvider extends SearchProvider {
  constructor() {
    super();
    this.docs = [];
  }

  async index(docs) {
    this.docs = docs.map((d) => ({
      ...d,
      _blob: `${d.title || ''} ${d.text || ''} ${(d.keywords || []).join(' ')} ${(d.acts || []).join(' ')}`.toLowerCase(),
    }));
    return this.docs.length;
  }

  async search(queryText, opts = {}) {
    const terms = String(queryText || '').toLowerCase().match(/[a-z0-9]{2,}/g) || [];
    if (!terms.length) return [];
    const scored = this.docs.map((d) => {
      let score = 0;
      terms.forEach((t) => {
        const hits = d._blob.split(t).length - 1;
        score += hits;
        if ((d.title || '').toLowerCase().includes(t)) score += 2;
      });
      return { ...d, score };
    });
    return scored
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit || 20)
      .map(({ _blob, ...rest }) => rest);
  }
}
