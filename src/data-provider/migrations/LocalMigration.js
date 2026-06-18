import BaseMigration from './BaseMigration.js';

// LocalMigration — the LocalDatabaseProvider materialises collections as arrays
// in its localStorage blob, so ensureCollection truly creates them. The base
// behaviour is exactly right here; we only tag the kind.
export default class LocalMigration extends BaseMigration {
  constructor(provider, schemas) {
    super(provider, schemas);
    this.kind = 'local';
  }
}
