// schemaService — the ONLY way pages and components access schema metadata.
// Pages must NEVER import from @/data-provider/schema/ or @/data-provider/health/
// directly. This service wraps all schema engines behind a stable API.

import { listSchemas, SCHEMA_VERSION, collectionNames, coreCollections } from '@/data-provider/schema/index.js';
import { SchemaDiffEngine } from '@/data-provider/schema/SchemaDiffEngine.js';
import { databaseHealthEngine } from '@/data-provider/health/DatabaseHealthEngine.js';

export const schemaService = {
  // Schema metadata
  listSchemas: () => listSchemas(),
  schemaVersion: () => SCHEMA_VERSION,
  collectionNames: () => [...collectionNames],
  coreCollections: () => [...coreCollections],

  // Schema diff
  diffSchema: async () => SchemaDiffEngine.diff(),
  toSQL: (diffReport) => SchemaDiffEngine.toSQL(diffReport),

  // Health
  scanHealth: async () => databaseHealthEngine.scan(),
  repairHealth: async () => databaseHealthEngine.repair(),
  validateHealth: async () => databaseHealthEngine.validate(),
};

export default schemaService;
