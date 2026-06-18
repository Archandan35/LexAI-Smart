// StorageProvider — binary/file storage contract.
export default class StorageProvider {
  // eslint-disable-next-line no-unused-vars
  async upload(file, opts = {}) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async download(ref) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async delete(ref) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async getUrl(ref) { throw new Error('not implemented'); }
}
