import BaseMigration from './BaseMigration.js';

// MongoMigration — MongoDB creates a collection lazily on the first inserted
// document, so there is no DDL step. ensureSchema therefore just verifies the
// Data API is reachable for each collection; the collection itself appears the
// moment the repository/seed engine writes the first record.
export default class MongoMigration extends BaseMigration {
  constructor(provider, schemas) {
    super(provider, schemas);
    this.kind = 'mongodb';
  }

  // Lazy backends are never "missing" in a way repair can fix — repair is a
  // reachability re-check rather than a create.
  async repairSchema() {
    const { missing } = await this.validateSchema();
    return { kind: this.kind, repaired: [], lazy: true, unreachable: missing, count: 0 };
  }
}
