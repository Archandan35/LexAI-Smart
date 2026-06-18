// BaseMigration — provider-agnostic schema lifecycle. Drives the active
// DatabaseProvider purely through its public contract (ensureCollection /
// collectionExists). It imports NO SDK and NO provider class; the engine injects
// the provider instance. Per-provider strategies extend this and override only
// what differs (e.g. Supabase needs DDL it cannot run from the browser).
export default class BaseMigration {
  constructor(provider, schemas) {
    this.provider = provider;
    this.schemas = schemas; // { name: schema } map from data-provider/schema
    this.kind = 'base';
  }

  all() { return Object.values(this.schemas); }
  core() { return this.all().filter((s) => s.core); }

  // Create every required collection. coreOnly=true → just the minimum install
  // set (users, roles, permissions, auditLogs, cases, documents, settings).
  async ensureSchema({ coreOnly = false } = {}) {
    const targets = coreOnly ? this.core() : this.all();
    const ensured = [];
    for (const s of targets) {
      // eslint-disable-next-line no-await-in-loop
      const r = await this.provider.ensureCollection(s.collection, s);
      ensured.push({ collection: s.collection, ...r });
    }
    const manual = ensured.filter((r) => r.needsManual).map((r) => r.collection);
    return { kind: this.kind, ok: manual.length === 0, ensured, manual };
  }

  // Report which collections exist vs. are missing on the active backend.
  async validateSchema({ coreOnly = false } = {}) {
    const targets = coreOnly ? this.core() : this.all();
    const present = [];
    const missing = [];
    for (const s of targets) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await this.provider.collectionExists(s.collection);
      (exists ? present : missing).push(s.collection);
    }
    return { kind: this.kind, valid: missing.length === 0, present, missing };
  }

  // Create whatever validateSchema reported missing.
  async repairSchema() {
    const { missing } = await this.validateSchema();
    const repaired = [];
    for (const name of missing) {
      // eslint-disable-next-line no-await-in-loop
      const r = await this.provider.ensureCollection(name, this.schemas[name]);
      repaired.push({ collection: name, ...r });
    }
    return { kind: this.kind, repaired, count: repaired.length };
  }
}
