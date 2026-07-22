import SearchProvider from './SearchProvider.js';

const DEFAULTS = {
  maxDocs: 5000,
  minScore: 0.15,
  fieldBoost: { title: 3, caseNumber: 2, case_display_number: 2, name: 2, text: 1, description: 1 },
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default class LocalSearchProvider extends SearchProvider {
  constructor(opts = {}) {
    super();
    this.maxDocs = opts.maxDocs ?? DEFAULTS.maxDocs;
    this.minScore = opts.minScore ?? DEFAULTS.minScore;
    this.fieldBoost = { ...DEFAULTS.fieldBoost, ...opts.fieldBoost };
    this.docs = [];
    this.index = new Map();
    this.idfCache = new Map();
    this.docCount = 0;
  }

  async index(docs) {
    const trimmed = docs.slice(0, this.maxDocs);
    this.docs = trimmed.map((d) => {
      const fields = {};
      for (const key of Object.keys(this.fieldBoost)) {
        const val = d[key];
        fields[key] = (Array.isArray(val) ? val.join(' ') : String(val ?? '')).toLowerCase();
      }
      return { ...d, _fields: fields };
    });
    this.docCount = this.docs.length;
    this._buildIndex();
    return this.docCount;
  }

  _buildIndex() {
    this.index.clear();
    this.idfCache.clear();

    for (let i = 0; i < this.docs.length; i++) {
      const seen = new Set();
      for (const text of Object.values(this.docs[i]._fields)) {
        const tokens = text.match(/[a-z0-9]{2,}/g) || [];
        for (const token of tokens) {
          if (!seen.has(token)) {
            seen.add(token);
            if (!this.index.has(token)) this.index.set(token, new Set());
            this.index.get(token).add(i);
          }
        }
      }
    }

    for (const [token, docSet] of this.index) {
      const df = docSet.size;
      const idf = Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));
      this.idfCache.set(token, idf);
    }
  }

  _score(doc, terms) {
    let totalScore = 0;

    for (const term of terms) {
      let tf = 0;

      for (const [field, text] of Object.entries(doc._fields)) {
        const boost = this.fieldBoost[field] || 1;
        const pattern = new RegExp(escapeRegex(term), 'g');
        const count = (text.match(pattern) || []).length;
        if (count > 0) {
          tf += boost * (1 + Math.log(count));
        }
      }

      if (tf === 0) continue;

      const idf = this.idfCache.get(term) || 1;
      totalScore += tf * idf;
    }

    return terms.length > 0 ? totalScore / terms.length : 0;
  }

  _getPrefixMatches(prefix) {
    const results = new Set();
    for (const [token, docSet] of this.index) {
      if (token.startsWith(prefix)) {
        for (const idx of docSet) results.add(idx);
      }
    }
    return results;
  }

  async search(queryText, opts = {}) {
    const rawTerms = String(queryText || '').toLowerCase().match(/[a-z0-9]{2,}/g) || [];
    if (!rawTerms.length) return [];

    const limit = opts.limit ?? 20;
    const minScore = opts.minScore ?? this.minScore;
    const candidates = new Set();

    for (const term of rawTerms) {
      const exact = this.index.get(term);
      if (exact) {
        for (const idx of exact) candidates.add(idx);
      }
      const prefix = this._getPrefixMatches(term);
      for (const idx of prefix) candidates.add(idx);
    }

    const results = [];
    for (const idx of candidates) {
      const doc = this.docs[idx];
      const score = this._score(doc, rawTerms);
      if (score >= minScore) {
        const { _fields, ...rest } = doc;
        results.push({ ...rest, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
