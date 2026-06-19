import { listSchemas, SCHEMA_VERSION } from '@/data-provider/schema/index.js';

const FORMAT_PATTERNS = [
  { name: 'udb', detect: (text) => { try { const o = JSON.parse(text); return o?.format === 'UDB'; } catch { return false; } } },
  { name: 'json', detect: (text) => { try { const o = JSON.parse(text); return !o?.format || Array.isArray(o); } catch { return false; } } },
  { name: 'pg_dump', detect: (text) => /^--\s*PostgreSQL\s+database\s+dump/m.test(text) || /^CREATE\s+(TABLE|SEQUENCE|INDEX)/mi.test(text) },
  { name: 'sql', detect: (text) => /^CREATE\s+(TABLE|DATABASE)/mi.test(text) || /^INSERT\s+INTO/mi.test(text) },
  { name: 'mysql_dump', detect: (text) => /^--\s*MySQL\s+dump/m.test(text) || /^CREATE\s+TABLE.*ENGINE=/mi.test(text) },
];

export const UploadAnalyzer = {
  detectFormat(text) {
    for (const fmt of FORMAT_PATTERNS) {
      if (fmt.detect(text)) return fmt.name;
    }
    const trimmed = text?.trim() || '';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    return 'unknown';
  },

  analyzeUdb(udb) {
    const currentSchemas = listSchemas();
    const currentNames = currentSchemas.map((s) => s.collection);
    const uploadedNames = Object.keys(udb.data || {});
    const schemaDef = udb.schema || {};

    const collectionsFound = uploadedNames.length;
    const collectionsMatched = uploadedNames.filter((n) => currentNames.includes(n)).length;
    const collectionsUnknown = uploadedNames.filter((n) => !currentNames.includes(n));

    const matchedSchemas = [];
    for (const name of uploadedNames) {
      if (currentNames.includes(name)) {
        const cs = currentSchemas.find((s) => s.collection === name);
        const us = schemaDef[name];
        if (cs && us) {
          matchedSchemas.push({ collection: name, fieldsMatch: this.compareFields(cs.fields, us.fields || {}) });
        }
      }
    }

    const totalRows = Object.values(udb.data || {}).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);

    return {
      format: 'UDB',
      udbVersion: udb.udbVersion || udb.manifest?.udbVersion || 'unknown',
      schemaVersion: udb.version?.schemaVersion || udb.manifest?.schemaVersion || 'unknown',
      sourceProvider: udb.version?.sourceProvider || udb.manifest?.sourceProvider || 'unknown',
      exportedAt: udb.version?.exportedAt || udb.manifest?.exportedAt || null,
      collectionsFound,
      collectionsMatched,
      collectionsUnknown: collectionsUnknown.length,
      unknownNames: collectionsUnknown,
      matchedSchemas,
      totalRows,
      counts: udb.manifest?.counts || {},
      hasAttachments: Object.keys(udb.attachments || {}).length > 0,
      hasLogs: Array.isArray(udb.logs) && udb.logs.length > 0,
      hasSettings: Array.isArray(udb.settings) && udb.settings.length > 0,
      hasPermissions: Array.isArray(udb.permissions) && udb.permissions.length > 0,
    };
  },

  analyzeSql(text) {
    const tables = [];
    const inserts = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const tm = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["`]?(\w+)["`]?/i);
      if (tm) tables.push(tm[1]);
      const im = line.match(/INSERT\s+INTO\s+(?:public\.)?["`]?(\w+)["`]?/i);
      if (im && !inserts.includes(im[1])) inserts.push(im[1]);
    }

    const currentNames = listSchemas().map((s) => s.collection);
    const matched = tables.filter((t) => currentNames.includes(t));
    const unknown = tables.filter((t) => !currentNames.includes(t));
    const missing = currentNames.filter((n) => !tables.includes(n));

    return {
      format: 'SQL',
      tablesFound: tables.length,
      tablesMatched: matched.length,
      tablesUnknown: unknown.length,
      unknownNames: unknown,
      missingTables: missing,
      insertsFound: inserts.length,
      currentSchemaVersion: SCHEMA_VERSION,
    };
  },

  compareFields(currentFields, uploadedFields) {
    const currentKeys = Object.keys(currentFields);
    const uploadedKeys = Object.keys(uploadedFields);
    const matched = currentKeys.filter((k) => uploadedKeys.includes(k));
    const missing = currentKeys.filter((k) => !uploadedKeys.includes(k));
    const extra = uploadedKeys.filter((k) => !currentKeys.includes(k));
    const typeMismatches = [];
    for (const key of matched) {
      if (currentFields[key] !== uploadedFields[key]) {
        typeMismatches.push({ field: key, expected: currentFields[key], got: uploadedFields[key] });
      }
    }
    return { matched: matched.length, missing, extra, typeMismatches };
  },

  async analyze(text) {
    const format = this.detectFormat(text);
    let analysis = { format };

    if (format === 'udb') {
      let udb;
      try { udb = JSON.parse(text); } catch { return { ...analysis, error: 'Invalid JSON' }; }
      analysis = { ...analysis, ...this.analyzeUdb(udb), udb };
    } else if (format === 'json') {
      analysis = { ...analysis, ...this.analyzeUdb({ data: JSON.parse(text) }) };
    } else if (format === 'sql' || format === 'pg_dump' || format === 'mysql_dump') {
      analysis = { ...analysis, ...this.analyzeSql(text) };
    } else {
      analysis.error = 'Unrecognized file format.';
    }

    return analysis;
  },
};

export default UploadAnalyzer;
