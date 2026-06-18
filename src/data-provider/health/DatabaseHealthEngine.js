// DatabaseHealthEngine — provider-agnostic health checks. Drives the active
// provider through its generic contract + reads the universal schema and
// schema_meta. Imports no SDK. The service-layer DatabaseHealthService is a thin
// façade over this.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { listSchemas, getSchema, SCHEMA_VERSION, relationships } from '@/data-provider/schema/index.js';
import { schemaVersionManager } from '@/data-provider/migrations/SchemaVersionManager.js';

const SAMPLE = 50; // rows sampled per collection for field/relation checks

const issue = (type, severity, collection, detail, repairable = false, extra = {}) =>
  ({ type, severity, collection, detail, repairable, ...extra });

export const databaseHealthEngine = {
  // Full scan → { healthy, score, issues[], summary }.
  async scan() {
    const provider = getDatabaseProvider();
    const issues = [];

    // 1) collection/table existence + cache of existing rows for later checks.
    const rowsByCollection = {};
    for (const s of listSchemas()) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await provider.collectionExists(s.collection).catch(() => false);
      if (!exists) {
        issues.push(issue('missing_collection', 'critical', s.collection, `Collection/table "${s.collection}" is missing.`, true));
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      rowsByCollection[s.collection] = await provider.list(s.collection, {}).catch(() => []);
    }

    // 2) field checks — required fields absent on sampled rows; schema fields
    //    never observed (informational).
    for (const s of listSchemas()) {
      const rows = rowsByCollection[s.collection];
      if (!rows || !rows.length) continue;
      const sample = rows.slice(0, SAMPLE);
      (s.required || []).forEach((f) => {
        const offenders = sample.filter((r) => r[f] === undefined || r[f] === null || r[f] === '').length;
        if (offenders) issues.push(issue('missing_field', 'warn', s.collection, `Required field "${f}" empty on ${offenders}/${sample.length} sampled rows.`, false, { field: f }));
      });
      const seen = new Set();
      sample.forEach((r) => Object.keys(r).forEach((k) => seen.add(k)));
      Object.keys(s.fields).forEach((f) => {
        if (!seen.has(f)) issues.push(issue('unused_field', 'info', s.collection, `Schema field "${f}" not present on any sampled row.`, false, { field: f }));
      });
    }

    // 3) index expectations (browser cannot introspect remote indexes).
    for (const s of listSchemas()) {
      if (!(s.indexes || []).length) continue;
      const status = config.providers.database === 'local' ? 'not_applicable' : 'unverifiable';
      issues.push(issue('index_info', 'info', s.collection, `Expected indexes: ${s.indexes.join(', ')} (${status === 'not_applicable' ? 'not applicable to local store' : 'managed on the backend / unverifiable from the browser'}).`, false));
    }

    // 4) broken relations — orphaned foreign keys.
    for (const rel of relationships()) {
      const childRows = rowsByCollection[rel.from];
      const parentRows = rowsByCollection[rel.references];
      if (!childRows || !parentRows) continue;
      const parentKeys = new Set(parentRows.map((p) => p[rel.on]));
      const orphans = childRows.slice(0, SAMPLE).filter((c) => {
        const v = c[rel.field];
        return v !== undefined && v !== null && v !== '' && !parentKeys.has(v);
      }).length;
      if (orphans) issues.push(issue('broken_relation', 'warn', rel.from, `${orphans} "${rel.from}" rows reference a missing ${rel.references}.${rel.on} via "${rel.field}".`, false, { references: rel.references }));
    }

    // 5) version + provider drift.
    const meta = await schemaVersionManager.getMeta();
    const installedVersion = await schemaVersionManager.getVersion();
    if (installedVersion === 0) {
      issues.push(issue('not_installed', 'critical', '*', 'No schema installed on this backend.', true));
    } else if (installedVersion !== SCHEMA_VERSION) {
      issues.push(issue('version_mismatch', 'warn', '*', `Installed schema v${installedVersion} differs from app schema v${SCHEMA_VERSION}.`, true, { installedVersion, appVersion: SCHEMA_VERSION }));
    }
    if (meta && meta.provider && meta.provider !== config.providers.database) {
      issues.push(issue('provider_mismatch', 'warn', '*', `schema_meta was stamped on "${meta.provider}" but the active provider is "${config.providers.database}".`, true, { metaProvider: meta.provider }));
    }

    const critical = issues.filter((i) => i.severity === 'critical').length;
    const warn = issues.filter((i) => i.severity === 'warn').length;
    const score = Math.max(0, 100 - critical * 25 - warn * 5);
    return {
      healthy: critical === 0 && warn === 0,
      score,
      issues,
      summary: { critical, warnings: warn, info: issues.filter((i) => i.severity === 'info').length, total: issues.length },
      provider: config.providers.database,
      installedVersion,
      appVersion: SCHEMA_VERSION,
    };
  },

  // Non-destructive repairs: create missing collections, align version/provider.
  async repair() {
    const provider = getDatabaseProvider();
    const { issues } = await this.scan();
    const actions = [];
    for (const i of issues.filter((x) => x.repairable)) {
      if (i.type === 'missing_collection' || i.type === 'not_installed') {
        const schema = i.collection === '*' ? null : getSchema(i.collection);
        if (i.type === 'not_installed') {
          // Create every collection, then stamp.
          for (const s of listSchemas()) {
            // eslint-disable-next-line no-await-in-loop
            await provider.ensureCollection(s.collection, s).catch(() => {});
          }
          // eslint-disable-next-line no-await-in-loop
          await schemaVersionManager.stamp(SCHEMA_VERSION, 'install');
          actions.push('Installed all collections + stamped version.');
        } else if (schema) {
          // eslint-disable-next-line no-await-in-loop
          await provider.ensureCollection(schema.collection, schema).catch(() => {});
          actions.push(`Created ${schema.collection}.`);
        }
      } else if (i.type === 'version_mismatch') {
        // eslint-disable-next-line no-await-in-loop
        await schemaVersionManager.upgrade(SCHEMA_VERSION);
        actions.push(`Upgraded schema to v${SCHEMA_VERSION}.`);
      } else if (i.type === 'provider_mismatch') {
        // eslint-disable-next-line no-await-in-loop
        await schemaVersionManager.stamp(SCHEMA_VERSION, 'upgrade');
        actions.push('Re-stamped schema_meta for the active provider.');
      }
    }
    const after = await this.scan();
    return { actions, remaining: after.summary, healthy: after.healthy };
  },

  // Boolean gate used by tooling.
  async validate() {
    const r = await this.scan();
    return { valid: r.summary.critical === 0, score: r.score, summary: r.summary };
  },
};

export default databaseHealthEngine;
