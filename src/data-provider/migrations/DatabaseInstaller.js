import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { SchemaCompiler } from '@/data-provider/schema/SchemaCompiler.js';
import { listSchemas, collectionNames } from '@/data-provider/schema/index.js';
import { schemaVersionManager } from './SchemaVersionManager.js';

export const databaseInstaller = {
  provider() { return config.providers.database || 'local'; },

  async detect() {
    const provider = getDatabaseProvider();
    const providerName = this.provider();

    const version = await schemaVersionManager.getVersion();
    console.log('[LexAI detect] schema version:', version, 'provider:', providerName);

    const present = [];
    const missing = [];
    let coreMissing = false;
    let authError = null;

    for (const s of listSchemas()) {
      let exists = false;
      try {
        exists = await provider.collectionExists(s.collection);
      } catch (e) {
        if (e.message && e.message.includes('auth denied')) {
          authError = authError || e.message;
        }
        exists = false;
      }
      (exists ? present : missing).push(s.collection);
      if (!exists && s.core) coreMissing = true;
    }

    console.log('[LexAI detect] present:', present.length, 'missing:', missing.length, 'coreMissing:', coreMissing, 'authError:', authError);

    if (authError) {
      console.warn('[LexAI detect] Supabase auth denied');
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

    // Tables exist but schema_meta has no version row → partial install
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

  // Install with per-step progress reporting.
  // onProgress({ step, total, label, status })
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

      if (name === 'supabase') {
        // Check current state — are tables already created?
        const current = await this.detect();

        if (current.partialInstall) {
          console.log('[LexAI install] Supabase tables exist — skipping CREATE phase');
          // Tables exist but no schema_meta row → structural install is done
          // Return success so caller proceeds to seed phase
          for (const s of coreSchemas) {
            report(`Create ${s.collection}`, 'done');
          }
          return {
            ok: true,
            success: true,
            provider: 'supabase',
            needsManual: false,
            currentStep: 'Tables ready',
            completedSteps: coreSchemas.length,
            totalSteps,
          };
        }

        if (current.installed) {
          console.log('[LexAI install] Supabase already fully installed');
          return {
            ok: true,
            success: true,
            provider: 'supabase',
            needsManual: false,
          };
        }

        // No tables — surface SQL (now includes GRANTs)
        console.log('[LexAI install] Supabase — returning install SQL');
        const artifact = SchemaCompiler.installArtifact('supabase');
        return {
          ok: false,
          provider: 'supabase',
          needsManual: true,
          sql: artifact.text,
          reason: 'Supabase requires schema installation. Use the SQL below.',
          completedSteps: step,
          totalSteps,
        };
      }

      // local / firebase / mongodb — install each core collection
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
      console.error('[LexAI install] installer error:', e);
      return {
        success: false,
        currentStep: `Create ${name}`,
        completedSteps: step,
        failedStep: name,
        error: e.message || 'Installation failed',
        needsManual: name === 'supabase',
      };
    }
  },

  stampInstalled() { return schemaVersionManager.stamp(schemaVersionManager.targetVersion(), 'install'); },
};

export default databaseInstaller;
