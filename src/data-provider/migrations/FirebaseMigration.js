import BaseMigration from './BaseMigration.js';

// FirebaseMigration — Cloud Firestore, like MongoDB, creates collections lazily
// on first write. No schema DDL exists in Firestore (documents are schemaless),
// so ensureSchema verifies reachability and the collection materialises on the
// first document the repository/seed engine writes.
export default class FirebaseMigration extends BaseMigration {
  constructor(provider, schemas) {
    super(provider, schemas);
    this.kind = 'firebase';
  }

  async repairSchema() {
    const { missing } = await this.validateSchema();
    return { kind: this.kind, repaired: [], lazy: true, unreachable: missing, count: 0 };
  }
}
