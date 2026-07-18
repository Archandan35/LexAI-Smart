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
    const blocked = [];
    let blockedError = null;
    let coreMissing = false;
    let authError = null;

    const schemas = listSchemas();

    if (onProgress) onProgress({ step: 1, total: 1, label: 'Checking collections...', status: 'working' });

    const results = await Promise.allSettled(
      schemas.map(async (s) => {
        let state = 'missing';
        try {
          state = await provider.checkCollection(s.collection);
        } catch (e) {
          if (e.message && (e.message.includes('auth denied') || e.message.includes('Auth denied'))) {
            authError = authError || e.message;
          }
          state = 'blocked';
        }
        return { collection: s.collection, core: s.core, state };
      })
    );

    if (onProgress) onProgress({ step: 1, total: 1, label: 'Done', status: 'done' });

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { collection, core, state } = r.value;
      if (state === 'present') {
        present.push(collection);
      } else if (state === 'missing') {
        missing.push(collection);
        if (core) coreMissing = true;
      } else {
        // 'blocked' — cannot determine; do NOT count as missing.
        blocked.push(collection);
        blockedError = blockedError || 'Database is reachable but requests are being blocked or throttled (e.g. Supabase egress/rate limit exceeded). Cannot verify tables right now.';
      }
    }

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

    // If NOTHING was found present but some checks were "blocked", this is
    // almost certainly a brand-new/empty project (every table 404s) rather than
    // a throttle — a throttle would still let at least one known table respond.
    // Reclassify blocked→missing so the wizard offers a正常 install instead of
    // a misleading "requests are being blocked / egress exceeded" banner.
    if (present.length === 0 && blocked.length > 0) {
      missing.push(...blocked);
      blocked.length = 0;
      blockedError = null;
    }

    if (blocked.length > 0) {
      // We could not reliably verify the schema. Treat as "indeterminate":
      // surface a clear message instead of falsely reporting tables missing.
      return {
        provider: providerName,
        installed: false,
        version,
        targetVersion: schemaVersionManager.targetVersion(),
        present,
        missing,
        blocked,
        needsSetup: true,
        partialInstall: false,
        blocked: true,
        error: blockedError,
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
      blocked,
      needsSetup: version === 0 || coreMissing,
      partialInstall,
    };
  },

  artifact() { return SchemaCompiler.installArtifact(this.provider()); },

  async installSchema(onProgress) {
    const name = this.provider();
    const provider = getDatabaseProvider();
    const allSchemas = listSchemas();
    const totalSteps = allSchemas.length + 2;
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
          for (const s of allSchemas) {
            report(`Create ${s.collection}`, 'done');
          }
          return {
            ok: true,
            success: true,
            needsManual: false,
            currentStep: 'Tables ready',
            completedSteps: allSchemas.length,
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

      for (const s of allSchemas) {
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
