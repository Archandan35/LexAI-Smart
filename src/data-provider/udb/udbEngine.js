// Universal Database (.udb) engine — provider-INDEPENDENT export/import.
//
// A .udb is a single self-describing JSON package whose top-level keys mirror the
// canonical archive layout:
//   manifest.json      → udb.manifest      (app, versions, counts, checksums)
//   schema.json        → udb.schema        (universal schema)
//   permissions.json   → udb.permissions
//   relationships.json → udb.relationships
//   settings.json      → udb.settings
//   version.json       → udb.version       (udb/schema/app versions, source provider)
//   data/              → udb.data          (business collections)
//   attachments/       → udb.attachments   (file payloads; storage-provider bound)
//   logs/              → udb.logs          (auditLogs)
//
// Export/import both go through the active provider's generic snapshot()/restore(),
// so ANY provider can export a .udb and ANY provider can import it without loss.
// `schema_meta` is intentionally EXCLUDED from the data payload — version state is
// captured in `version` and re-stamped for the importing provider by the caller.
import { getDatabaseProvider } from '@/providers/database/index.js';
import { schemas, collectionNames, relationships, SCHEMA_VERSION } from '@/data-provider/schema/index.js';
import { config } from '@/config/config.js';
import { sha256Hex } from '@/utils/crypto.js';

export const UDB_VERSION = '3.0';

// Collections surfaced as their own top-level sections (not under `data`).
const SECTIONED = { auditLogs: 'logs', settings: 'settings', permissions: 'permissions' };
const META = 'schema_meta';
// Business data carried by a .udb (everything except the version-tracking row).
const DATA_COLLECTIONS = collectionNames.filter((n) => n !== META);

// Canonical {collection: rows} in a FIXED key order → stable checksum.
function canonical(full = {}) {
  const out = {};
  DATA_COLLECTIONS.forEach((name) => { out[name] = Array.isArray(full[name]) ? full[name] : []; });
  return out;
}

// Reassemble the flat {collection: rows} map from a parsed .udb's sections.
function flatten(udb = {}) {
  return {
    ...(udb.data || {}),
    auditLogs: udb.logs || [],
    settings: udb.settings || [],
    permissions: udb.permissions || [],
  };
}

export const udbEngine = {
  UDB_VERSION,

  // Produce a complete .udb object from the live database.
  async build() {
    const provider = getDatabaseProvider();
    const all = await provider.snapshot(DATA_COLLECTIONS); // { name: rows[] }

    const data = {};
    DATA_COLLECTIONS.forEach((n) => { if (!SECTIONED[n]) data[n] = all[n] || []; });

    const counts = {};
    DATA_COLLECTIONS.forEach((n) => { counts[n] = (all[n] || []).length; });

    const checksum = await sha256Hex(JSON.stringify(canonical(all)));
    const checksums = {
      data: await sha256Hex(JSON.stringify(data)),
      logs: await sha256Hex(JSON.stringify(all.auditLogs || [])),
      settings: await sha256Hex(JSON.stringify(all.settings || [])),
      permissions: await sha256Hex(JSON.stringify(all.permissions || [])),
    };

    const version = {
      udbVersion: UDB_VERSION,
      schemaVersion: SCHEMA_VERSION,
      appVersion: config.app.version,
      sourceProvider: config.providers.database,
      exportedAt: new Date().toISOString(),
    };

    return {
      format: 'UDB',
      udbVersion: UDB_VERSION,
      manifest: {
        app: config.app.name,
        ...version,
        collections: DATA_COLLECTIONS,
        counts,
        checksum,
        checksums,
      },
      version,
      schema: schemas,
      permissions: all.permissions || [],
      relationships: relationships(),
      settings: all.settings || [],
      data,
      attachments: {}, // binaries live in the storage provider; metadata is in `documents`
      logs: all.auditLogs || [],
      checksum,
    };
  },

  // Structural validation → { valid, errors[] }.
  validateUDB(udb) {
    const errors = [];
    if (!udb || typeof udb !== 'object') return { valid: false, errors: ['Not a UDB object.'] };
    if (udb.format !== 'UDB') errors.push('format is not "UDB".');
    if (!udb.manifest) errors.push('Missing section: manifest.');
    if (!udb.data || typeof udb.data !== 'object') errors.push('Missing/invalid section: data.');
    if (!udb.schema) errors.push('Missing section: schema.');
    ['permissions', 'settings', 'logs'].forEach((k) => {
      if (udb[k] !== undefined && !Array.isArray(udb[k])) errors.push(`Section "${k}" must be an array.`);
    });
    return { valid: errors.length === 0, errors };
  },

  // Best-effort repair of a malformed/old .udb → { udb, repaired, changes[] }.
  repairUDB(input) {
    const udb = { ...input };
    const changes = [];
    const fix = (k, val, cond) => { if (cond) { udb[k] = val; changes.push(k); } };
    fix('format', 'UDB', udb.format !== 'UDB');
    fix('udbVersion', UDB_VERSION, !udb.udbVersion);
    fix('data', (udb.data && typeof udb.data === 'object') ? udb.data : {}, !udb.data || typeof udb.data !== 'object');
    fix('logs', Array.isArray(udb.logs) ? udb.logs : [], !Array.isArray(udb.logs));
    fix('settings', Array.isArray(udb.settings) ? udb.settings : [], !Array.isArray(udb.settings));
    fix('permissions', Array.isArray(udb.permissions) ? udb.permissions : [], !Array.isArray(udb.permissions));
    fix('relationships', Array.isArray(udb.relationships) ? udb.relationships : relationships(), !Array.isArray(udb.relationships));
    fix('schema', udb.schema || schemas, !udb.schema);
    fix('version', udb.version || { udbVersion: udb.udbVersion || UDB_VERSION, schemaVersion: udb.manifest?.schemaVersion || SCHEMA_VERSION }, !udb.version);
    // Ensure every business data key exists as an array.
    DATA_COLLECTIONS.forEach((n) => {
      if (SECTIONED[n]) return;
      if (!Array.isArray(udb.data[n])) { udb.data[n] = Array.isArray(udb.data[n]) ? udb.data[n] : []; }
    });
    return { udb, repaired: changes.length > 0, changes };
  },

  // Recompute global + per-section checksums → { globalOk, sections{}, ... }.
  async verifyChecksums(udb) {
    const globalRecomputed = await sha256Hex(JSON.stringify(canonical(flatten(udb))));
    const globalOk = !udb.checksum || globalRecomputed === udb.checksum;
    const expected = udb.manifest?.checksums || {};
    const sections = {};
    if (expected.data) sections.data = (await sha256Hex(JSON.stringify(udb.data || {}))) === expected.data;
    if (expected.logs) sections.logs = (await sha256Hex(JSON.stringify(udb.logs || []))) === expected.logs;
    if (expected.settings) sections.settings = (await sha256Hex(JSON.stringify(udb.settings || []))) === expected.settings;
    if (expected.permissions) sections.permissions = (await sha256Hex(JSON.stringify(udb.permissions || []))) === expected.permissions;
    return { globalOk, globalRecomputed, expected: udb.checksum, sections };
  },

  // Validate + describe an imported .udb's text content.
  async parse(text) {
    let udb;
    try { udb = JSON.parse(text); } catch { return { ok: false, reason: 'File is not valid UDB JSON.' }; }

    let structure = this.validateUDB(udb);
    let repaired = false;
    if (!structure.valid) {
      const r = this.repairUDB(udb);
      udb = r.udb; repaired = true;
      structure = this.validateUDB(udb);
      if (!structure.valid) return { ok: false, reason: `Invalid UDB: ${structure.errors.join('; ')}` };
    }

    const cs = await this.verifyChecksums(udb);
    const ver = udb.version?.schemaVersion ?? udb.manifest?.schemaVersion ?? udb.schemaVersion;
    const versionOk = !ver || ver <= SCHEMA_VERSION;
    return {
      ok: true,
      udb,
      repaired,
      checksumOk: cs.globalOk,
      sectionChecksums: cs.sections,
      versionOk,
      counts: udb.manifest?.counts || {},
      reason: !cs.globalOk ? 'Checksum mismatch (possible corruption)'
        : (!versionOk ? 'Newer schema than this app supports'
          : (repaired ? 'Valid after auto-repair' : 'Valid UDB package')),
    };
  },

  // Restore a parsed .udb into the active provider (replace semantics).
  // schema_meta is NOT restored — the caller re-stamps the version afterwards.
  async import(udb) {
    const provider = getDatabaseProvider();
    return provider.restore(flatten(udb));
  },
};

export default udbEngine;
