// IDEngine — generates human-readable, entity-specific business identifiers.
//
// Format:  LX-{ENTITY}-{SEQUENCE}
// Example: LX-CASE-00001, LX-USER-00042, LX-ROLE-00007
//
// Each entity maintains its own independent auto-increment sequence stored in
// the `_sequences` collection. The sequence is persisted so IDs are stable
// across sessions and providers.
//
// The provider-level internal ID (UUID, ObjectId, etc.) is stored separately
// and never exposed to pages. The LexAI business ID is the permanent public
// identifier.

import { getDatabaseProvider } from '@/providers/database/index.js';

const ENTITY_PREFIXES = {
  users: 'USER',
  roles: 'ROLE',
  cases: 'CASE',
  documents: 'DOC',
  drafts: 'DRFT',
  hearings: 'HEAR',
  notes: 'NOTE',
  judgments: 'JDGM',
  reminders: 'RMND',
  caseStages: 'STAGE',
  caseTypes: 'CTYPE',
  courts: 'COURT',
  caseHistory: 'CHIST',
  caseActivity: 'CACT',
  caseFolders: 'CFOLD',
  causeListTemplates: 'CLTMP',
  permissions: 'PERM',
  auditLogs: 'AUDIT',
  settings: 'SET',
  envVars: 'ENV',
  configHistory: 'CFGH',
  schema_meta: 'SMETA',
};

const SEQUENCE_COLLECTION = '_sequences';

// ISO-formatted timestamp for creation dates.
function nowISO() {
  return new Date().toISOString();
}

function pad(num, len = 5) {
  return String(num).padStart(len, '0');
}

export const IDEngine = {
  // Generate a new LexAI business ID for the given entity.
  // Persists the sequence counter atomically.
  async generate(entityName) {
    const prefix = ENTITY_PREFIXES[entityName] || entityName.toUpperCase().slice(0, 5);
    const provider = getDatabaseProvider();
    let seq;
    try {
      seq = await provider.get(SEQUENCE_COLLECTION, entityName);
    } catch {
      seq = null;
    }
    const nextVal = seq ? (seq.current || 0) + 1 : 1;
    try {
      if (seq) {
        await provider.update(SEQUENCE_COLLECTION, entityName, { current: nextVal, updatedAt: nowISO() });
      } else {
        await provider.create(SEQUENCE_COLLECTION, {
          id: entityName,
          entity: entityName,
          current: nextVal,
          createdAt: nowISO(),
        });
      }
    } catch {
      // Sequence persistence failure is non-fatal — ID is still unique
    }
    return `LX-${prefix}-${pad(nextVal)}`;
  },

  // Generate a provider-internal ID (UUID-like string).
  // This is the opaque internal ID stored in the provider's primary key column.
  providerId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  },

  // Get the entity prefix for a given entity name.
  prefix(entityName) {
    return ENTITY_PREFIXES[entityName] || entityName.toUpperCase().slice(0, 5);
  },

  // Extract entity name from a LexAI business ID.
  entityFromId(lexaiId) {
    if (!lexaiId || !lexaiId.startsWith('LX-')) return null;
    const parts = lexaiId.split('-');
    if (parts.length < 3) return null;
    const prefix = parts[1];
    const entry = Object.entries(ENTITY_PREFIXES).find(([, v]) => v === prefix);
    return entry ? entry[0] : null;
  },

  // Get current sequence value without incrementing.
  async current(entityName) {
    const provider = getDatabaseProvider();
    try {
      const seq = await provider.get(SEQUENCE_COLLECTION, entityName);
      return seq ? seq.current || 0 : 0;
    } catch {
      return 0;
    }
  },

  // Reset a sequence to a specific value (admin operation).
  async reset(entityName, value = 0) {
    const provider = getDatabaseProvider();
    try {
      const seq = await provider.get(SEQUENCE_COLLECTION, entityName);
      if (seq) {
        await provider.update(SEQUENCE_COLLECTION, entityName, { current: value, updatedAt: nowISO() });
      } else {
        await provider.create(SEQUENCE_COLLECTION, {
          id: entityName,
          entity: entityName,
          current: value,
          createdAt: nowISO(),
        });
      }
    } catch {
      // Best effort
    }
  },

  // List all sequences (for admin).
  async listSequences() {
    const provider = getDatabaseProvider();
    try {
      return await provider.list(SEQUENCE_COLLECTION, {});
    } catch {
      return [];
    }
  },
};

export default IDEngine;
