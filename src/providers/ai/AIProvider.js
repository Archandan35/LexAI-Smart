// AIProvider — the contract every AI backend must satisfy.
// Pages/logic depend on THIS shape, never on a concrete vendor SDK.
//
// Implement a new vendor by extending this class and registering it in
// providers/ai/index.js. Nothing else in the app changes.
export default class AIProvider {
  /** Single-shot completion. @param {string} prompt @returns {Promise<string>} */
  // eslint-disable-next-line no-unused-vars
  async ask(prompt) {
    throw new Error('AIProvider.ask() not implemented');
  }

  /** Multi-turn chat. @param {{role:string,content:string}[]} messages @returns {Promise<string>} */
  // eslint-disable-next-line no-unused-vars
  async chat(messages) {
    throw new Error('AIProvider.chat() not implemented');
  }

  /** Structured analysis of a document. @param {{text:string,meta?:object}} document */
  // eslint-disable-next-line no-unused-vars
  async analyzeDocument(document) {
    throw new Error('AIProvider.analyzeDocument() not implemented');
  }

  /** Produce a draft from structured inputs. @param {object} data @returns {Promise<string>} */
  // eslint-disable-next-line no-unused-vars
  async generateDraft(data) {
    throw new Error('AIProvider.generateDraft() not implemented');
  }
}
