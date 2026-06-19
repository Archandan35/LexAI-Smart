import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { SchemaCompiler } from '@/data-provider/schema/SchemaCompiler.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import { schemaVersionManager } from './SchemaVersionManager.js';

export const databaseInstaller = {
  provider() { return config.providers.database || 'local'; },

  async _needsManualDDL() {
    const artifact = this.artifact();
    return artifact?.text?.length > 0;
  },

  async detect(onProgress) {
    const provider = getDatabaseProvider();
    const providerName = this.provider();

    const version = await schemaVersionManager.getVersion();

    const present = [];
    const missing = [];
    let coreMissing = false;
    let authError = null;
    let timeout = false;

    const schemas = listSchemas();
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); timeout = true; }, 30000);

    for (const [i, s] of schemas.entries()) {
      if (timeout) break;
      if (onProgress) onProgress({ step: i + 1, total: schemas.length, label: `Checking ${s.collection}...`, status: 'working' });
      let exists = false;
      try {
        exists = await provider.collectionExists(s.collection);
      } catch (e) {
        if (e.message && (e.message.includes('auth denied') || e.message.includes('Auth denied'))) {
          authError = authError || e.message;
        }
        exists = false;
      }
      (exists ? present : missing).push(s.collection);
      if (!exists && s.core) coreMissing = true;
    }
    clearTimeout(timer);

    if (authError) {
      return {
        provider: providerName,
        installed: false,
        version,
        targetVersion: schemaVersionManager.targetVersion(),
        present,
        missing,
        needsSetup: true,
        partialInstall: false,
        authError,
      };
    }

    if (timeout) {
      return {
        provider: providerName,
        installed: present.length > 0 && !coreMissing,
        version,
        targetVersion: schemaVersionManager.targetVersion(),
        present,
        missing,
        needsSetup: true,
        partialInstall: present.length > 0 && !coreMissing && version === 0,
        timeout: true,
        error: `Detection timed out after 30s. ${present.length} of ${schemas.length} collections checked.`,
      };
    }

    const partialInstall = present.length > 0 && !coreMissing && version === 0;

    return {
      provider: providerName,
      installed: version > 0 && !coreMissing,
      version,
      targetVersion: schemaVersionManager.targetVersion(),
      present,
      missing,
      needsSetup: version === 0 || coreMissing,
      partialInstall,
    };
  },

  artifact() { return SchemaCompiler.installArtifact(this.provider()); },

  async installSchema(onProgress) {
    const name = this.provider();
    const provider = getDatabaseProvider();
    const coreSchemas = listSchemas().filter((s) => s.core);
    const totalSteps = coreSchemas.length + 2;
    let step = 0;

    const report = (label, status = 'working') => {
      if (onProgress) onProgress({ step: ++step, total: totalSteps, label, status });
    };

    try {
      report('Detect Provider');

      const needsDDL = await this._needsManualDDL();

      if (needsDDL) {
        const current = await this.detect();

        if (current.partialInstall) {
          for (const s of coreSchemas) {
            report(`Create ${s.collection}`, 'done');
          }
          return {
            ok: true,
            success: true,
            needsManual: false,
            currentStep: 'Tables ready',
            completedSteps: coreSchemas.length,
            totalSteps,
          };
        }

        if (current.installed) {
          return {
            ok: true,
            success: true,
            needsManual: false,
          };
        }

        const artifact = SchemaCompiler.installArtifact(name);
        return {
          ok: false,
          needsManual: true,
          sql: artifact.text,
          reason: `Schema installation required for ${name}. Use the SQL below.`,
          completedSteps: step,
          totalSteps,
        };
      }

      for (const s of coreSchemas) {
        report(`Create ${s.collection}`);
        const r = await provider.ensureCollection(s.collection, s);
        if (!r || r.ok === false) {
          return {
            success: false,
            currentStep: `Create ${s.collection}`,
            completedSteps: step,
            failedStep: s.collection,
            error: `Failed to create ${s.collection}`,
            needsManual: false,
          };
        }
        report(`Create ${s.collection}`, 'done');
      }

      await schemaVersionManager.stamp(schemaVersionManager.targetVersion(), 'install');

      return {
        success: true,
        currentStep: 'Done',
        completedSteps: totalSteps,
        failedStep: null,
        error: null,
        needsManual: false,
      };
    } catch (e) {
      return {
        success: false,
        currentStep: `Create ${name}`,
        completedSteps: step,
        failedStep: name,
        error: e.message || 'Installation failed',
        needsManual: false,
      };
    }
  },

  stampInstalled() { return schemaVersionManager.stamp(schemaVersionManager.targetVersion(), 'install'); },
};

export default databaseInstaller;
