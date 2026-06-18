// CitationProvider — contract for retrieving REAL judgments and verifying them.
// This is the safety-critical interface: the app must only ever display
// authorities that a citation provider actually returned. The AI layer never
// produces citations directly.
export default class CitationProvider {
  /** @param {object} query {facts,issue,keywords,act,section,court}
   *  @returns {Promise<Array>} ranked judgments */
  // eslint-disable-next-line no-unused-vars
  async searchCases(query) { throw new Error('not implemented'); }

  /** @param {string} citation -> {status, judgment|null} */
  // eslint-disable-next-line no-unused-vars
  async verifyCitation(citation) { throw new Error('not implemented'); }

  /** @param {string} id -> full judgment or null */
  // eslint-disable-next-line no-unused-vars
  async fetchJudgment(id) { throw new Error('not implemented'); }

  /** @param {string} id -> paragraph[] */
  // eslint-disable-next-line no-unused-vars
  async extractParagraphs(id) { throw new Error('not implemented'); }
}
