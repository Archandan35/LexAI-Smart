import CitationProvider from './CitationProvider.js';
import { config } from '@/config/config.js';
import { VERIFICATION_STATUS } from '@/constants/messages.js';

// IndianKanoonProvider — reference template for a real citation backend.
// Indian Kanoon exposes a documented API; this shows the wiring. The contract is
// identical to LocalCitationProvider, so nothing upstream changes.
export default class IndianKanoonProvider extends CitationProvider {
  constructor() {
    super();
    this.apiKey = config.credentials.indianKanoonApiKey;
    this.base = 'https://api.indiankanoon.org';
  }

  #headers() {
    return { Authorization: `Token ${this.apiKey}` };
  }

  async searchCases(query = {}) {
    if (!this.apiKey) throw new Error('Indian Kanoon API key not configured.');
    const q = [query.facts, query.issue, query.keywords, query.act, query.section]
      .filter(Boolean).join(' ');
    const res = await fetch(`${this.base}/search/?formInput=${encodeURIComponent(q)}`, {
      method: 'POST', headers: this.#headers(),
    });
    if (!res.ok) throw new Error(`Indian Kanoon search ${res.status}`);
    const data = await res.json();
    return (data.docs || []).map((d, i) => ({
      id: String(d.tid),
      citation: d.title,
      court: d.docsource,
      date: d.publishdate,
      keywords: [],
      paragraphs: [],
      sourceUrl: `https://indiankanoon.org/doc/${d.tid}/`,
      relevance: Math.max(1, 99 - i * 4),
      rank: i + 1,
      verification: VERIFICATION_STATUS.VERIFIED,
    }));
  }

  async verifyCitation(citation) {
    const results = await this.searchCases({ keywords: citation });
    const found = results[0] || null;
    return {
      status: found ? VERIFICATION_STATUS.VERIFIED : VERIFICATION_STATUS.NOT_FOUND,
      judgment: found,
      checks: {
        judgmentExists: !!found, citationExists: !!found,
        paragraphExists: false, sourceExists: !!found?.sourceUrl,
      },
    };
  }

  async fetchJudgment(id) {
    if (!this.apiKey) throw new Error('Indian Kanoon API key not configured.');
    const res = await fetch(`${this.base}/doc/${id}/`, { method: 'POST', headers: this.#headers() });
    if (!res.ok) throw new Error(`Indian Kanoon doc ${res.status}`);
    return res.json();
  }

  async extractParagraphs(id) {
    const doc = await this.fetchJudgment(id);
    const text = String(doc?.doc || '').replace(/<[^>]+>/g, ' ');
    return text.split(/\n+/).filter(Boolean).map((t, i) => ({ number: i + 1, text: t.trim() }));
  }
}
