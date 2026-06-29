import FileStorageProvider from './FileStorageProvider.js';

// DualStorageWrapper wraps a primary and secondary FileStorageProvider.
// Every write operation goes to both providers. Reads go to the primary only.
// The app never knows this wrapper exists — it just calls the FileStorageProvider
// interface as usual.

export default class DualStorageWrapper extends FileStorageProvider {
  constructor(primary, secondary) {
    super();
    this.primary = primary;
    this.secondary = secondary;
  }

  async upload(file, path) {
    const result = await this.primary.upload(file, path);
    if (this.secondary) {
      await this.secondary.upload(file, path).catch(() => {});
    }
    return result;
  }

  async getUrl(ref) {
    return this.primary.getUrl(ref);
  }

  async download(ref) {
    return this.primary.download(ref);
  }

  async delete(ref) {
    const result = await this.primary.delete(ref);
    if (this.secondary) {
      await this.secondary.delete(ref).catch(() => {});
    }
    return result;
  }

  async move(oldRef, newRef) {
    const result = await this.primary.move(oldRef, newRef);
    if (this.secondary) {
      await this.secondary.move(oldRef, newRef).catch(() => {});
    }
    return result;
  }
}
