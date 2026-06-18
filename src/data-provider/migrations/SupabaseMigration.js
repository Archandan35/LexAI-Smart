import BaseMigration from './BaseMigration.js';
import { SchemaCompiler } from '@/data-provider/schema/SchemaCompiler.js';

// SupabaseMigration — Postgres tables need DDL, and the anon REST key used by
// the browser cannot run DDL directly. The DatabaseInstaller can run it via an
// `exec_sql` RPC when the project exposes one; otherwise we surface the exact
// SQL to run once. All DDL text comes from the SchemaCompiler (single source of
// truth) — no SQL is hand-built here anymore.
export default class SupabaseMigration extends BaseMigration {
  constructor(provider, schemas) {
    super(provider, schemas);
    this.kind = 'supabase';
  }

  // CREATE TABLE + indexes for one schema, via the compiler.
  sqlFor(schema) {
    return SchemaCompiler.compile('supabase', schema).sql;
  }

  // The full install script for the given (default: all) schemas.
  installSql(schemasList = this.all()) {
    return schemasList.map((s) => this.sqlFor(s)).join('\n\n');
  }

  async ensureSchema({ coreOnly = false } = {}) {
    const targets = coreOnly ? this.core() : this.all();
    const ensured = [];
    const missingSchemas = [];
    for (const s of targets) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await this.provider.collectionExists(s.collection);
      if (exists) {
        ensured.push({ collection: s.collection, created: false, ok: true });
      } else {
        missingSchemas.push(s);
        ensured.push({ collection: s.collection, created: false, ok: false, needsManual: true });
      }
    }
    const manual = missingSchemas.map((s) => s.collection);
    return {
      kind: this.kind,
      ok: manual.length === 0,
      ensured,
      manual,
      sql: missingSchemas.length ? this.installSql(missingSchemas) : '',
    };
  }

  async repairSchema() {
    const { missing } = await this.validateSchema();
    const schemasList = missing.map((n) => this.schemas[n]).filter(Boolean);
    return {
      kind: this.kind,
      repaired: [],
      count: 0,
      needsManual: missing,
      sql: schemasList.length ? this.installSql(schemasList) : '',
    };
  }
}
