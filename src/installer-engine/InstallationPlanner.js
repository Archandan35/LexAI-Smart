import { listSchemas, SCHEMA_VERSION, coreCollections } from '@/data-provider/schema/index.js';
import { SchemaCompiler } from '@/data-provider/schema/SchemaCompiler.js';
import { config } from '@/config/config.js';

export const InstallationPlanner = {
  plan(detect) {
    const provider = config.providers.database || 'local';
    const allSchemas = listSchemas();
    const steps = [];

    if (!detect || detect.needsSetup) {
      steps.push({ id: 'detect', label: 'Detect Provider', type: 'detect' });
    }

    const coreMissing = detect?.missing
      ? allSchemas.filter((s) => s.core && detect.missing.includes(s.collection))
      : allSchemas.filter((s) => s.core);

    if (coreMissing.length > 0) {
      steps.push({
        id: 'tables',
        label: `Create ${coreMissing.length} table${coreMissing.length !== 1 ? 's' : ''}`,
        type: 'tables',
        collections: coreMissing.map((s) => s.collection),
      });
    }

    const allMissing = detect?.missing
      ? allSchemas.filter((s) => !s.core && detect.missing.includes(s.collection))
      : [];

    if (allMissing.length > 0) {
      steps.push({
        id: 'extras',
        label: `Create ${allMissing.length} additional collection${allMissing.length !== 1 ? 's' : ''}`,
        type: 'tables',
        collections: allMissing.map((s) => s.collection),
      });
    }

    if (detect?.partialInstall || detect?.installed === false) {
      steps.push({ id: 'seed', label: 'Seed default data', type: 'seed' });
    }

    if (detect?.version > 0 && detect.version < SCHEMA_VERSION) {
      steps.push({
        id: 'migrate',
        label: `Upgrade schema v${detect.version} → v${SCHEMA_VERSION}`,
        type: 'migrate',
      });
    }

    steps.push({ id: 'verify', label: 'Verify installation', type: 'verify' });

    const sql = provider === 'supabase' ? SchemaCompiler.installArtifact('supabase') : null;

    return {
      provider,
      currentVersion: detect?.version || 0,
      targetVersion: SCHEMA_VERSION,
      steps,
      totalSteps: steps.length,
      needsManual: provider === 'supabase' && (detect?.needsSetup || !detect?.installed),
      partialInstall: detect?.partialInstall || false,
      sql: sql?.text || null,
    };
  },

  planUpload(analysis) {
    const steps = [];
    const schema = analysis?.schema;

    steps.push({ id: 'validate', label: 'Validate package', type: 'validate' });

    if (schema) {
      const schemaDiff = this.diffSchemas(schema);
      if (schemaDiff.missingTables.length > 0) {
        steps.push({
          id: 'create-missing',
          label: `Create ${schemaDiff.missingTables.length} missing table${schemaDiff.missingTables.length !== 1 ? 's' : ''}`,
          type: 'tables',
          collections: schemaDiff.missingTables,
        });
      }
    }

    steps.push({ id: 'import', label: 'Import data', type: 'import' });
    steps.push({ id: 'restore', label: 'Restore relationships', type: 'restore' });
    steps.push({ id: 'verify', label: 'Verify integrity', type: 'verify' });

    return { steps, totalSteps: steps.length, schemaDiff: schema ? this.diffSchemas(schema) : null };
  },

  diffSchemas(uploadedSchema) {
    const current = listSchemas();
    const currentNames = current.map((s) => s.collection);
    const uploadedNames = Object.keys(uploadedSchema);
    const missingTables = currentNames.filter((n) => !uploadedNames.includes(n));
    const extraTables = uploadedNames.filter((n) => !currentNames.includes(n));
    const matchedTables = currentNames.filter((n) => uploadedNames.includes(n));
    const fieldDiffs = [];
    for (const name of matchedTables) {
      const curr = current.find((s) => s.collection === name);
      const upld = uploadedSchema[name];
      if (curr && upld) {
        const currFields = Object.keys(curr.fields);
        const upldFields = Object.keys(upld.fields || {});
        const missing = currFields.filter((f) => !upldFields.includes(f));
        const extra = upldFields.filter((f) => !currFields.includes(f));
        if (missing.length > 0 || extra.length > 0) {
          fieldDiffs.push({ collection: name, missing, extra });
        }
      }
    }
    return { missingTables, extraTables, matchedTables, fieldDiffs };
  },
};

export default InstallationPlanner;
