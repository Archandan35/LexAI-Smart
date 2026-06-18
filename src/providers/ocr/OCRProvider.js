// OCRProvider — text extraction from images/PDFs.
export default class OCRProvider {
  /** @param {File|{name:string,text?:string}} file @returns {Promise<{text:string}>} */
  // eslint-disable-next-line no-unused-vars
  async extract(file, opts = {}) { throw new Error('not implemented'); }
}
