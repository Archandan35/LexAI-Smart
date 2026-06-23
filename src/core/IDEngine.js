// IDEngine — generates human-readable, entity-specific business identifiers.
//
// Format:  LX-{PREFIX}-{SEQUENCE}
// Example: LX-USR-00001, LX-CASE-00042, LX-ROLE-00007
//
// Uses the entity_prefix_registry for prefix lookup, falling back to the in-memory
// prefix map and then to the _sequences collection. The entity_prefix_registry
// is the single source of truth for all prefix definitions.
//
// The provider-level internal ID (UUID, ObjectId, etc.) is stored separately
// and never exposed to pages. The LexAI business ID is the permanent public
// identifier.

import { getDatabaseProvider } from '@/providers/database/index.js';

const PREFIX_REGISTRY_TABLE = 'entity_prefix_registry';
const LEGACY_SEQUENCE_COLLECTION = '_sequences';

// In-memory prefix map kept in sync with the entity_prefix_registry table.
let _prefixMap = {
  users: { prefix: 'USR', padding: 5 },
  roles: { prefix: 'ROLE', padding: 5 },
  permissions: { prefix: 'PERM', padding: 5 },
  cases: { prefix: 'CASE', padding: 5 },
  documents: { prefix: 'DOC', padding: 5 },
  drafts: { prefix: 'DRFT', padding: 5 },
  hearings: { prefix: 'HEAR', padding: 5 },
  notes: { prefix: 'NOTE', padding: 5 },
  judgments: { prefix: 'JDGM', padding: 5 },
  reminders: { prefix: 'RMND', padding: 5 },
  caseStages: { prefix: 'STAGE', padding: 5 },
  caseTypes: { prefix: 'CTYPE', padding: 5 },
  courts: { prefix: 'COURT', padding: 5 },
  caseHistory: { prefix: 'CHIST', padding: 5 },
  caseActivity: { prefix: 'CACT', padding: 5 },
  caseFolders: { prefix: 'CFOLD', padding: 5 },
  causeListTemplates: { prefix: 'CLTMP', padding: 5 },
  auditLogs: { prefix: 'AUDIT', padding: 5 },
  settings: { prefix: 'SET', padding: 5 },
  envVars: { prefix: 'ENV', padding: 5 },
  configHistory: { prefix: 'CFGH', padding: 5 },
  schema_meta: { prefix: 'SMETA', padding: 5 },
};

// Seed entity_prefix_registry from in-memory map on first use
async function ensurePrefixRegistry(provider) {
  try {
    for (const [entity, def] of Object.entries(_prefixMap)) {
      try {
        const existing = await provider.get(PREFIX_REGISTRY_TABLE, entity);
        if (!existing) {
          await provider.create(PREFIX_REGISTRY_TABLE, {
            entity,
            prefix: def.prefix,
            label: entity,
            padding: def.padding,
            current_sequence: 0,
          });
        }
      } catch {
        // Table might not exist yet
      }
    }
  } catch {
    // Ignore
  }
}

function pad(num, len = 5) {
  return String(num).padStart(len, '0');
}

// Client-side fallback counter per entity — used when _sequences is unavailable
let _fallbackSeq = {};

function nextFallback(entityName) {
  _fallbackSeq[entityName] = (_fallbackSeq[entityName] || 0) + 1;
  return _fallbackSeq[entityName];
}

export const IDEngine = {
  // Generate a new LexAI business ID for the given entity.
  // Tries the database next_lx_id RPC first, falls back to client-side.
  async generate(entityName) {
    const provider = getDatabaseProvider();

    // Try database-side next_lx_id if provider supports RPC calls
    if (typeof provider.rpc === 'function') {
      try {
        const res = await provider.rpc('next_lx_id', { p_entity: entityName });
        if (res && res.ok !== false && res.data) return res.data;
      } catch {
        // Fall through to client-side generation
      }
    }

    // Client-side fallback using _sequences collection
    const def = _prefixMap[entityName] || { prefix: entityName.toUpperCase().slice(0, 5), padding: 5 };
    let seq;
    try {
      seq = await provider.get(LEGACY_SEQUENCE_COLLECTION, entityName);
    } catch {
      seq = null;
      await ensurePrefixRegistry(provider);
    }
    const nextVal = seq ? (seq.current || 0) + 1 : nextFallback(entityName);
    try {
      if (seq) {
        await provider.update(LEGACY_SEQUENCE_COLLECTION, entityName, { current: nextVal, updatedAt: new Date().toISOString() });
      } else {
        await provider.create(LEGACY_SEQUENCE_COLLECTION, {
          id: entityName,
          entity: entityName,
          current: nextVal,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Non-fatal — fallback counter keeps session-unique IDs
    }
    return `LX-${def.prefix}-${pad(nextVal)}`;
  },

  // Generate a provider-internal ID (UUID-like string).
  providerId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  },

  // Get the entity prefix definition for a given entity name.
  prefix(entityName) {
    return _prefixMap[entityName]?.prefix || entityName.toUpperCase().slice(0, 5);
  },

  // Get padding length for a given entity.
  padding(entityName) {
    return _prefixMap[entityName]?.padding || 5;
  },

  // Extract entity name from a LexAI business ID.
  entityFromId(lexaiId) {
    if (!lexaiId || !lexaiId.startsWith('LX-')) return null;
    const parts = lexaiId.split('-');
    if (parts.length < 3) return null;
    const p = parts[1];
    const entry = Object.entries(_prefixMap).find(([, v]) => v.prefix === p);
    return entry ? entry[0] : null;
  },

  // Get current sequence value without incrementing (client-side fallback).
  async current(entityName) {
    const provider = getDatabaseProvider();
    try {
      const seq = await provider.get(LEGACY_SEQUENCE_COLLECTION, entityName);
      return seq ? seq.current || 0 : 0;
    } catch {
      return 0;
    }
  },

  // Reset a sequence to a specific value (admin operation).
  async reset(entityName, value = 0) {
    const provider = getDatabaseProvider();
    try {
      const seq = await provider.get(LEGACY_SEQUENCE_COLLECTION, entityName);
      if (seq) {
        await provider.update(LEGACY_SEQUENCE_COLLECTION, entityName, { current: value, updatedAt: new Date().toISOString() });
      } else {
        await provider.create(LEGACY_SEQUENCE_COLLECTION, {
          id: entityName,
          entity: entityName,
          current: value,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Best effort
    }
  },

  // Sync the in-memory prefix map from the entity_prefix_registry table.
  async syncFromRegistry() {
    const provider = getDatabaseProvider();
    try {
      const rows = await provider.list(PREFIX_REGISTRY_TABLE, {});
      for (const r of rows) {
        _prefixMap[r.entity] = {
          prefix: r.prefix,
          padding: r.padding || 5,
        };
      }
      return { ok: true, count: rows.length };
    } catch {
      return { ok: false, count: 0 };
    }
  },

  // List all registered prefixes.
  listPrefixes() {
    return Object.entries(_prefixMap).map(([entity, def]) => ({
      entity,
      prefix: def.prefix,
      padding: def.padding,
    }));
  },
};

export default IDEngine;
