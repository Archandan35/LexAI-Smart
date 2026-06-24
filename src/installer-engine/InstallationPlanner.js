import { listSchemas, SCHEMA_VERSION, coreCollections } from '@/data-provider/schema/index.js';
import { SchemaCompiler } from '@/data-provider/schema/SchemaCompiler.js';
import { config } from '@/config/config.js';
import { InstallerStateService } from '@/services/installerStateService.js';
import { ProviderCapabilitiesService } from '@/services/providerCapabilitiesService.js';
import { SchemaMappingService } from '@/services/schemaMappingService.js';

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms)),
]);

export const InstallationPlanner = {
  async plan(detect) {
    const provider = config.providers.database || 'local';
    const allSchemas = listSchemas();
    const steps = [];

    // Best-effort state check with timeout (fresh install may not have tables)
    let state = { install_status: 'none', schema_version: 0, installer_version: 0 };
    try { state = await withTimeout(InstallerStateService.getState(), 5000); } catch { /* ignore */ }

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

    // Registry verification step
    if (detect?.installed) {
      steps.push({
        id: 'registries',
        label: 'Verify registries',
        type: 'registries',
      });
    }

    // Schema mapping verification
    if (detect?.installed) {
      steps.push({
        id: 'mappings',
        label: 'Verify schema mappings',
        type: 'mappings',
      });
    }

    // Security verification
    if (detect?.installed) {
      steps.push({
        id: 'security',
        label: 'Verify security',
        type: 'security',
      });
    }

    if (detect?.partialInstall || detect?.installed === false) {
      steps.push({ id: 'seed', label: 'Finalise install', type: 'seed' });
    }

    if (detect?.version > 0 && detect.version < SCHEMA_VERSION) {
      steps.push({
        id: 'migrate',
        label: `Upgrade schema v${detect.version} → v${SCHEMA_VERSION}`,
        type: 'migrate',
      });
    }

    // Best-effort capabilities and mappings with timeouts (may not exist in fresh install)
    let capabilities = {};
    try { capabilities = await withTimeout(ProviderCapabilitiesService.getCapabilities(), 5000); } catch { /* ignore */ }
    let mappings = [];
    try { mappings = await withTimeout(SchemaMappingService.getMappings(), 5000); } catch { /* ignore */ }

    steps.push({ id: 'verify', label: 'Verify installation', type: 'verify' });

    const onlyCollections = detect?.missing?.length > 0 ? detect.missing : undefined;
    const artifact = SchemaCompiler.installArtifact(provider, {
      onlyCollections,
      present: detect?.present,
      missing: detect?.missing,
    });
    const hasSql = artifact?.text?.length > 0;

    return {
      provider,
      currentVersion: state.schema_version || detect?.version || 0,
      targetVersion: SCHEMA_VERSION,
      steps,
      totalSteps: steps.length,
      needsManual: hasSql && (detect?.needsSetup || !detect?.installed),
      partialInstall: detect?.partialInstall || false,
      sql: hasSql ? artifact.text : null,
      state,
      capabilities,
      mappings,
      present: detect?.present || [],
      missing: detect?.missing || [],
      allPresent: detect?.present?.length === listSchemas().length,
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
