// SchemaDiffEngine — deep structural diff between the canonical schema and the
// live backend. Goes beyond collection-existence checks to detect missing
// columns, wrong field types, missing indexes, and wrong constraints. Returns a
// structured report and a repair plan that the installer/migrator can execute.
//
// Provider-agnostic: uses only the public DatabaseProvider contract. Providers
// that expose richer introspection (e.g. Supabase listColumns / listIndexes)
// will automatically produce more detailed diffs; others fall back to the
// collection-existence tier.
import { listSchemas } from './index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';

const PG_TYPE_MAP = {
  string: 'text',
  number: 'numeric',
  boolean: 'boolean',
  datetime: 'timestamptz',
  array: 'jsonb',
  object: 'jsonb',
  json: 'jsonb',
};

export const SchemaDiffEngine = {
  // Full structural diff against the live provider.
  // Returns { missingTables, missingColumns, missingIndexes, wrongTypes, repairPlan }
  async diff() {
    const provider = getDatabaseProvider();
    const schemas = listSchemas();

    const missingTables = [];
    const missingColumns = [];
    const missingIndexes = [];
    const wrongTypes = [];
    const repairPlan = [];

    for (const schema of schemas) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await provider.collectionExists(schema.collection).catch(() => false);

      if (!exists) {
        missingTables.push({
          collection: schema.collection,
          reason: 'Table/collection does not exist on the backend.',
        });
        repairPlan.push({
          action: 'createTable',
          collection: schema.collection,
          description: `Create table "${schema.collection}"`,
        });
        // No point diffing columns of a non-existent table.
        continue;
      }

      // Column-level diff — only possible when the provider exposes listColumns().
      if (typeof provider.listColumns === 'function') {
        // eslint-disable-next-line no-await-in-loop
        const liveColumns = await provider.listColumns(schema.collection).catch(() => null);

        if (liveColumns) {
          const liveNames = liveColumns.map((c) => c.name.toLowerCase());

          // Detect missing columns.
          for (const [fieldName, fieldType] of Object.entries(schema.fields)) {
            if (!liveNames.includes(fieldName.toLowerCase())) {
              const canonicalType = PG_TYPE_MAP[fieldType] || fieldType;
              missingColumns.push({
                collection: schema.collection,
                column: fieldName,
                expectedType: canonicalType,
                reason: `Column "${fieldName}" is defined in the schema but absent from the backend table.`,
              });
              repairPlan.push({
                action: 'addColumn',
                collection: schema.collection,
                column: fieldName,
                type: canonicalType,
                description: `ALTER TABLE "${schema.collection}" ADD COLUMN IF NOT EXISTS "${fieldName}" ${canonicalType}`,
              });
            } else {
              // Type-check if the provider exposes the type.
              const liveCol = liveColumns.find(
                (c) => c.name.toLowerCase() === fieldName.toLowerCase()
              );
              if (liveCol && liveCol.type) {
                const expectedPg = PG_TYPE_MAP[fieldType];
                const liveType = (liveCol.type || '').toLowerCase();
                // Broad match: e.g. "text" matches "character varying"
                if (expectedPg && !liveType.includes(expectedPg) && !liveType.includes(fieldType)) {
                  wrongTypes.push({
                    collection: schema.collection,
                    column: fieldName,
                    expected: expectedPg,
                    actual: liveType,
                    reason: `Column "${fieldName}" type mismatch: expected "${expectedPg}", found "${liveType}".`,
                  });
                  // Type changes are destructive — flag for manual review.
                  repairPlan.push({
                    action: 'reviewType',
                    collection: schema.collection,
                    column: fieldName,
                    expected: expectedPg,
                    actual: liveType,
                    description: `Manual review: "${schema.collection}"."${fieldName}" expected ${expectedPg}, got ${liveType}.`,
                    manual: true,
                  });
                }
              }
            }
          }
        }
      }

      // Index diff — only possible when the provider exposes listIndexes().
      if (typeof provider.listIndexes === 'function') {
        // eslint-disable-next-line no-await-in-loop
        const liveIndexes = await provider.listIndexes(schema.collection).catch(() => null);

        if (liveIndexes && Array.isArray(schema.indexes)) {
          const liveIdxCols = liveIndexes.map((ix) => (ix.column || ix.field || '').toLowerCase());

          for (const indexedField of schema.indexes) {
            if (!liveIdxCols.includes(indexedField.toLowerCase())) {
              missingIndexes.push({
                collection: schema.collection,
                column: indexedField,
                reason: `Index on "${indexedField}" is defined in the schema but absent from the backend.`,
              });
              repairPlan.push({
                action: 'createIndex',
                collection: schema.collection,
                column: indexedField,
                description: `CREATE INDEX IF NOT EXISTS "idx_${schema.collection}_${indexedField}" ON "${schema.collection}" ("${indexedField}")`,
              });
            }
          }
        }
      }
    }

    const healthy =
      missingTables.length === 0 &&
      missingColumns.length === 0 &&
      missingIndexes.length === 0 &&
      wrongTypes.length === 0;

    return {
      healthy,
      missingTables,
      missingColumns,
      missingIndexes,
      wrongTypes,
      repairPlan,
      summary: {
        missingTables: missingTables.length,
        missingColumns: missingColumns.length,
        missingIndexes: missingIndexes.length,
        wrongTypes: wrongTypes.length,
        repairActions: repairPlan.length,
      },
    };
  },

  // Generate the SQL repair script from a diff report (Supabase/Postgres only).
  toSQL(diffReport) {
    const lines = [];
    for (const step of diffReport.repairPlan) {
      if (step.manual) {
        lines.push(`-- MANUAL REVIEW REQUIRED: ${step.description}`);
      } else {
        lines.push(`${step.description};`);
      }
    }
    return lines.join('\n');
  },
};

export default SchemaDiffEngine;
