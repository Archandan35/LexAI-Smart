// FileStorageProvider — abstract contract for file storage.
// Every storage backend extends this and implements the four core methods.
// The app never imports this directly — it goes through the registry (index.js).

export default class FileStorageProvider {
  async upload(file, path) { throw new Error('upload not implemented'); }
  async getUrl(ref)        { throw new Error('getUrl not implemented'); }
  async download(ref)      { throw new Error('download not implemented'); }
  async delete(ref)        { throw new Error('delete not implemented'); }
  async move(oldRef, newRef) { throw new Error('move not implemented'); }
}
