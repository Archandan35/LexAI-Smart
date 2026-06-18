import CitationProvider from './CitationProvider.js';
import { seedJudgments } from '@/database/seed.js';
import { VERIFICATION_STATUS } from '@/constants/messages.js';

// LocalCitationProvider — retrieves from a local index of REAL reported
// judgments (see seed.js). It only ever returns authorities that exist in the
// index; it cannot fabricate. Production swaps this for Indian Kanoon / CaseMine
// / Verdictum / court portals behind the identical contract.
export default class LocalCitationProvider extends CitationProvider {
  constructor() {
    super();
    this.index = seedJudgments;
  }

  #score(j, query) {
    const hay = `${j.citation} ${j.court} ${(j.keywords || []).join(' ')} ${(j.acts || []).join(' ')} ${(j.paragraphs || []).map((p) => p.text).join(' ')}`.toLowerCase();
    const terms = `${query.facts || ''} ${query.issue || ''} ${query.keywords || ''} ${query.section || ''}`
      .toLowerCase().match(/[a-z0-9]{3,}/g) || [];
    let score = 0;
    terms.forEach((t) => { if (hay.includes(t)) score += 1; });
    if (query.act && (j.acts || []).includes(query.act)) score += 3;
    if (query.court && j.court.toLowerCase().includes(String(query.court).toLowerCase())) score += 2;
    return score;
  }

  async searchCases(query = {}) {
    const ranked = this.index
      .map((j) => ({ judgment: j, score: this.#score(j, query) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({
        ...r.judgment,
        relevance: Math.min(99, Math.round((r.score / (r.score + 2)) * 100)),
        rank: i + 1,
        verification: VERIFICATION_STATUS.VERIFIED, // present in authoritative index
      }));
    return ranked;
  }

  async verifyCitation(citation) {
    const norm = String(citation || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const found = this.index.find(
      (j) => j.citation.toLowerCase().replace(/\s+/g, ' ').includes(norm) ||
             norm.includes(j.citation.toLowerCase().replace(/\s+/g, ' ').slice(0, 20))
    );
    if (!found) {
      return {
        status: VERIFICATION_STATUS.NOT_FOUND,
        judgment: null,
        checks: { judgmentExists: false, citationExists: false, paragraphExists: false, sourceExists: false },
      };
    }
    return {
      status: VERIFICATION_STATUS.VERIFIED,
      judgment: found,
      checks: { judgmentExists: true, citationExists: true, paragraphExists: (found.paragraphs || []).length > 0, sourceExists: !!found.sourceUrl },
    };
  }

  async fetchJudgment(id) {
    return this.index.find((j) => j.id === id) || null;
  }

  async extractParagraphs(id) {
    const j = await this.fetchJudgment(id);
    return j ? j.paragraphs || [] : [];
  }
}
