// SearchProvider — full-text / relevance search contract over indexed records.
export default class SearchProvider {
  // eslint-disable-next-line no-unused-vars
  async index(docs) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async search(queryText, opts = {}) { throw new Error('not implemented'); }
}
