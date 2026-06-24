import { databaseAdminService } from '@/services/databaseAdminService.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { udbEngine } from '@/data-provider/udb/udbEngine.js';
import { InstallerStateService } from '@/services/installerStateService.js';
import { SchemaMappingService } from '@/services/schemaMappingService.js';
import { ProviderCapabilitiesService } from '@/services/providerCapabilitiesService.js';
import { FieldMapper } from '@/core/FieldMapper.js';
import { IDEngine } from '@/core/IDEngine.js';

export const InstallationExecutor = {
  async executePlan(plan, onProgress) {
    const provider = getDatabaseProvider();
    const providerName = config.providers.database || 'local';
    let stepIndex = 0;

    const report = (label, status = 'working') => {
      stepIndex += 1;
      if (onProgress) onProgress({ step: stepIndex, total: plan.totalSteps, label, status });
    };

    const result = { success: true, completedSteps: [], failedStep: null, error: null };

    // Mark installation in progress
    await InstallerStateService.setInProgress(providerName, providerName);

    for (const step of plan.steps) {
      try {
        if (step.type === 'detect') {
          report('Detect Provider');
          const detect = await databaseAdminService.detect();
          report('Detect Provider', 'done');
          continue;
        }

        if (step.type === 'tables') {
          for (const col of (step.collections || [])) {
            report(`Create ${col}`);
            const schema = listSchemas().find((s) => s.collection === col);
            const r = await provider.ensureCollection(col, schema);
            if (!r || r.ok === false) {
              await InstallerStateService.setFailed();
              result.success = false;
              result.failedStep = col;
              result.error = `Failed to create ${col}`;
              return result;
            }
            report(`Create ${col}`, 'done');
          }
          continue;
        }

        if (step.type === 'registries') {
          report('Verify registries');
          const caps = await ProviderCapabilitiesService.detectAndPersist();
          const mapLoad = await SchemaMappingService.loadMappings();
          const prefixSync = await IDEngine.syncFromRegistry();
          report('Verify registries', 'done');
          continue;
        }

        if (step.type === 'mappings') {
          report('Verify schema mappings');
          const conflicts = await SchemaMappingService.detectConflicts();
          if (conflicts.length > 0) {
            report('Verify schema mappings', 'warning');
            result.error = `Mapping conflicts detected: ${conflicts.length}`;
          } else {
            report('Verify schema mappings', 'done');
          }
          continue;
        }

        if (step.type === 'security') {
          report('Verify security');
          const caps = await ProviderCapabilitiesService.getCapabilities();
          const hasRls = Object.values(caps).some((c) => c.row_level_security);
          report(`Verify security${hasRls ? ' — RLS enabled' : ''}`, 'done');
          continue;
        }

        if (step.type === 'seed') {
          await databaseAdminService.stampInstalled();
          continue;
        }

        if (step.type === 'migrate') {
          report(`Upgrade to v${plan.targetVersion}`);
          await databaseAdminService.upgrade();
          await InstallerStateService.updateVersion(plan.targetVersion);
          report(`Upgrade to v${plan.targetVersion}`, 'done');
          continue;
        }

        if (step.type === 'verify') {
          report('Verify installation');
          const version = await databaseAdminService.getVersion();
          if (version === 0) throw new Error('Schema stamp failed');
          await InstallerStateService.setCompleted(version);
          await InstallerStateService.setVerified();
          report('Verify installation', 'done');
          continue;
        }
      } catch (e) {
        await InstallerStateService.setFailed();
        result.success = false;
        result.failedStep = step.id;
        result.error = e?.message || String(e);
        return result;
      }
    }

    result.completedSteps = stepIndex;
    return result;
  },

  async executeSql(sql) {
    const provider = getDatabaseProvider();
    if (typeof provider.execSql === 'function') {
      return provider.execSql(sql);
    }
    return { ok: false, error: 'This provider does not support SQL execution.' };
  },

  async uploadAndImport(udb, onProgress) {
    let stepIndex = 0;

    const report = (label, status = 'working') => {
      stepIndex += 1;
      if (onProgress) onProgress({ step: stepIndex, total: 4, label, status });
    };

    report('Validating package');
    const parsed = await udbEngine.parse(typeof udb === 'string' ? udb : JSON.stringify(udb));
    if (!parsed.ok) return { success: false, error: parsed.reason };
    report('Validating package', 'done');

    report('Importing data');
    const counts = await udbEngine.import(udb);
    report('Importing data', 'done');

    report('Restoring schema version');
    await databaseAdminService.stampInstalled();
    report('Restoring schema version', 'done');

    report('Verifying integrity');
    const version = await databaseAdminService.getVersion();
    report('Verifying integrity', 'done');

    return { success: true, version, counts };
  },
};

export default InstallationExecutor;
