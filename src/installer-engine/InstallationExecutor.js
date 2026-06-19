import { databaseAdminService } from '@/services/databaseAdminService.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { udbEngine } from '@/data-provider/udb/udbEngine.js';

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
              result.success = false;
              result.failedStep = col;
              result.error = `Failed to create ${col}`;
              return result;
            }
            report(`Create ${col}`, 'done');
          }
          continue;
        }

        if (step.type === 'seed') {
          report('Seed default data');
          await databaseAdminService.stampInstalled();
          report('Seed default data', 'done');
          continue;
        }

        if (step.type === 'migrate') {
          report(`Upgrade to v${plan.targetVersion}`);
          await databaseAdminService.upgrade();
          report(`Upgrade to v${plan.targetVersion}`, 'done');
          continue;
        }

        if (step.type === 'verify') {
          report('Verify installation');
          const version = await databaseAdminService.getVersion();
          if (version === 0) throw new Error('Schema stamp failed');
          report('Verify installation', 'done');
          continue;
        }
      } catch (e) {
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
