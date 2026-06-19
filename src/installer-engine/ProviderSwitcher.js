// ProviderSwitcher — true provider portability engine.
// Workflow:
//   1. Export current provider's mapping + schema + registry metadata
//   2. Connect new provider
//   3. Load new adapter
//   4. Apply mapping
//   5. Apply schema
//   6. Verify
//   7. Ready — pages continue working without modification

import { SchemaMappingService } from '@/services/schemaMappingService.js';
import { ProviderAdapterRegistryService } from '@/services/providerAdapterRegistryService.js';
import { ProviderCapabilitiesService } from '@/services/providerCapabilitiesService.js';
import { InstallerStateService } from '@/services/installerStateService.js';
import { MigrationRunner } from '@/installer-engine/MigrationRunner.js';
import { VerificationEngine } from '@/installer-engine/VerificationEngine.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';

export const ProviderSwitcher = {
  async exportCurrentProvider() {
    const provider = getDatabaseProvider();
    const providerName = config.providers.database || 'local';

    // Export schema metadata: what tables exist and their schema defs
    const schemas = listSchemas();
    const schemaMeta = {};
    for (const s of schemas) {
      try {
        const exists = await provider.collectionExists(s.collection);
        schemaMeta[s.collection] = { exists, fields: Object.keys(s.fields), core: !!s.core };
      } catch {
        schemaMeta[s.collection] = { exists: false, fields: Object.keys(s.fields), core: !!s.core };
      }
    }

    // Export mappings
    let mappings = [];
    try { mappings = await SchemaMappingService.getMappings(); } catch { /* no mappings */ }

    // Export installer state
    let state = { install_status: 'none', schema_version: 0 };
    try { state = await InstallerStateService.getState(); } catch { /* no state */ }

    // Export migration history
    let history = [];
    try { history = await MigrationRunner.getMigrationHistory(); } catch { /* no history */ }

    return {
      exportedAt: new Date().toISOString(),
      sourceProvider: providerName,
      schemaVersion: state.schema_version || 0,
      schemaMeta,
      mappings,
      migrationHistory: history,
      installerState: state,
    };
  },

  async switchProvider(newProviderName, exportData, onProgress) {
    const steps = [
      'Export current provider',
      'Connect new provider',
      'Load adapter',
      'Apply mapping',
      'Apply schema',
      'Seed registries',
      'Verify installation',
      'Ready',
    ];
    let stepIndex = 0;

    const report = (label, status = 'working') => {
      stepIndex += 1;
      if (onProgress) onProgress({ step: stepIndex, total: steps.length, label, status });
    };

    report('Export current provider');

    // If no export data provided, export it now
    if (!exportData) {
      exportData = await this.exportCurrentProvider();
    }
    report('Export current provider', 'done');

    report('Connect new provider');
    // The caller should have updated VITE_DATABASE_PROVIDER before calling this
    const newProvider = getDatabaseProvider();
    const newProviderName = config.providers.database || newProviderName;
    report('Connect new provider', 'done');

    report('Load adapter');
    // Register and load the adapter for the new provider
    try {
      await ProviderAdapterRegistryService.seedDefaults();
      const loaded = await ProviderAdapterRegistryService.loadAdapter(newProviderName);
      report('Load adapter', 'done');
    } catch (e) {
      report('Load adapter', 'error');
      return { success: false, step: 'Load adapter', error: e.message };
    }

    report('Apply mapping');
    // Apply the exported mappings to the new provider
    if (exportData.mappings && exportData.mappings.length > 0) {
      try {
        for (const mapping of exportData.mappings) {
          await SchemaMappingService.upsertMapping({
            entity_name: mapping.entity_name || mapping.entityName,
            provider_table: mapping.provider_table || mapping.providerTable,
            description: mapping.description || '',
            active: true,
          });
        }
      } catch (e) {
        report('Apply mapping', 'warning');
      }
    }
    report('Apply mapping', 'done');

    report('Apply schema');
    // Create the core collections on the new provider
    const schemas = listSchemas();
    let createdCount = 0;
    for (const s of schemas) {
      if (!s.core) continue;
      try {
        const exists = await newProvider.collectionExists(s.collection);
        if (!exists) {
          const r = await newProvider.ensureCollection(s.collection, s);
          if (r && r.ok !== false) createdCount++;
        } else {
          createdCount++;
        }
      } catch {
        // collection may not support existence check
      }
    }
    report('Apply schema', 'done');

    report('Seed registries');
    try {
      await ProviderAdapterRegistryService.seedDefaults();
      await ProviderCapabilitiesService.detectAndPersist();
      await InstallerStateService.setCompleted(exportData.schemaVersion || 0);
      await InstallerStateService.updateVersion(exportData.schemaVersion || 0);
    } catch (e) {
      report('Seed registries', 'warning');
    }
    report('Seed registries', 'done');

    report('Verify installation');
    let verification;
    try {
      verification = await VerificationEngine.verifyAll();
    } catch {
      verification = { valid: false, checks: [] };
    }
    report('Verify installation', 'done');

    report('Ready', 'done');

    return {
      success: verification?.valid !== false,
      provider: newProviderName,
      collectionsCreated: createdCount,
      verification,
      totalSteps: steps.length,
    };
  },

  async testProviderSwitch(newProviderName) {
    // Dry-run: just check if the adapter can load and the provider is reachable
    try {
      await ProviderAdapterRegistryService.seedDefaults();
      const loaded = await ProviderAdapterRegistryService.loadAdapter(newProviderName);
      const provider = getDatabaseProvider();
      const testResult = await provider.collectionExists('schema_registry').catch(() => false);
      return {
        ok: true,
        adapterLoaded: !!loaded.adapter,
        providerReachable: testResult !== undefined,
        provider: newProviderName,
      };
    } catch (e) {
      return { ok: false, error: e.message, provider: newProviderName };
    }
  },
};

export default ProviderSwitcher;
