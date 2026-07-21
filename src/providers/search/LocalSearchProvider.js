import SearchProvider from './SearchProvider.js';

const MAX_DOCS = 10000;
const TITLE_BOOST = 3;
const FIELD_BOOST = { title: 3, caseNumber: 2, case_display_number: 2, name: 2, text: 1, description: 1 };

export default class LocalSearchProvider extends SearchProvider {
  constructor() {
    super();
    this.docs = [];
    this.index = new Map();
  }

  async index(docs) {
    const trimmed = docs.slice(0, MAX_DOCS);
    this.docs = trimmed.map((d) => {
      const blob =
        `${d.title || ''} ${d.caseNumber || ''} ${d.case_display_number || ''} ${d.name || ''} ${d.text || ''} ${d.description || ''} ${(d.keywords || []).join(' ')}`
          .toLowerCase();
      return { ...d, _blob: blob };
    });
    this._buildIndex();
    return this.docs.length;
  }

  _buildIndex() {
    this.index.clear();
    for (let i = 0; i < this.docs.length; i++) {
      const tokens = this.docs[i]._blob.match(/[a-z0-9]{2,}/g) || [];
      for (const token of new Set(tokens)) {
        if (!this.index.has(token)) this.index.set(token, []);
        this.index.get(token).push(i);
      }
    }
  }

  async search(queryText, opts = {}) {
    const terms = String(queryText || '').toLowerCase().match(/[a-z0-9]{2,}/g) || [];
    if (!terms.length) return [];

    const docScores = new Map();
    for (const term of terms) {
      const matches = this.index.get(term) || [];
      for (const idx of matches) {
        const score = docScores.get(idx) || 0;
        const boost = FIELD_BOOST.title || 1;
        docScores.set(idx, score + (1 / terms.length) * boost);
      }
    }

    const limit = opts.limit || 20;
    return Array.from(docScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([idx]) => {
        const { _blob, ...rest } = this.docs[idx];
        return rest;
      });
  }
}
