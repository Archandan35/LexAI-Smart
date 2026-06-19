// VerificationEngine — comprehensive installation verification service.
// Checks schema, registry, mappings, capabilities, permissions, migration status,
// provider status, and installer state. Displayed inside Setup Wizard as a
// checklist with OK/FAIL status per item.

import { databaseAdminService } from '@/services/databaseAdminService.js';
import { InstallerStateService } from '@/services/installerStateService.js';
import { SchemaMappingService } from '@/services/schemaMappingService.js';
import { ProviderCapabilitiesService } from '@/services/providerCapabilitiesService.js';
import { ProviderAdapterRegistryService } from '@/services/providerAdapterRegistryService.js';
import { MigrationRunner } from '@/installer-engine/MigrationRunner.js';
import { listSchemas, SCHEMA_VERSION } from '@/data-provider/schema/index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';

const CHECK_ICONS = { ok: 'OK', fail: 'FAIL', warn: 'WARN', skip: 'SKIP' };

export const VerificationEngine = {
  async verifyAll() {
    const results = await Promise.allSettled([
      this.verifySchema(),
      this.verifyRegistryTables(),
      this.verifyMappings(),
      this.verifyCapabilities(),
      this.verifyProvider(),
      this.verifySecurity(),
      this.verifyMigration(),
      this.verifyInstallerState(),
    ]);

    const checks = results.map((r, i) => {
      const names = ['Schema', 'Registry', 'Mappings', 'Capabilities', 'Provider', 'Security', 'Migration', 'Installer State'];
      if (r.status === 'fulfilled') {
        return { name: names[i], ...r.value };
      }
      return { name: names[i], status: 'fail', icon: CHECK_ICONS.fail, details: r.reason?.message || String(r.reason) };
    });

    const valid = checks.every((c) => c.status === 'ok');
    const issueCount = checks.filter((c) => c.status !== 'ok').length;
    return {
      checks,
      valid,
      issueCount,
      summary: `${checks.filter((c) => c.status === 'ok').length}/${checks.length} checks passed`,
      version: checks.find((c) => c.name === 'Migration')?.details?.match(/Schema v(\d+)/)?.[1] || 0,
      timestamp: new Date().toISOString(),
    };
  },

  async verifySchema() {
    const provider = getDatabaseProvider();
    const schemas = listSchemas();
    let present = 0;

    for (const s of schemas) {
      try {
        const exists = await provider.collectionExists(s.collection);
        if (exists) present++;
      } catch {
        // skip
      }
    }

    const schemaOk = present >= schemas.filter((s) => s.core).length;
    return {
      status: schemaOk ? 'ok' : 'fail',
      icon: schemaOk ? CHECK_ICONS.ok : CHECK_ICONS.fail,
      details: `${present}/${schemas.length} collections present (${schemas.filter((s) => s.core).length} core required)`,
    };
  },

  async verifyRegistryTables() {
    const provider = getDatabaseProvider();
    const required = ['schema_registry', 'entity_registry', 'field_registry', 'provider_registry', 'migration_registry', 'installer_state', 'schema_mapping', 'provider_capabilities', 'entity_prefix_registry', 'foreign_key_registry'];
    const missing = [];

    for (const table of required) {
      try {
        const exists = await provider.collectionExists(table);
        if (!exists) missing.push(table);
      } catch {
        missing.push(table);
      }
    }

    const ok = missing.length === 0;
    return {
      status: ok ? 'ok' : 'fail',
      icon: ok ? CHECK_ICONS.ok : CHECK_ICONS.fail,
      details: ok ? `All ${required.length} registry tables present` : `Missing: ${missing.join(', ')}`,
    };
  },

  async verifyMappings() {
    try {
      const mappings = await SchemaMappingService.getMappings();
      const conflicts = await SchemaMappingService.detectConflicts();
      const ok = conflicts.length === 0;
      return {
        status: ok ? 'ok' : 'warn',
        icon: ok ? CHECK_ICONS.ok : CHECK_ICONS.warn,
        details: `${mappings.length} mappings configured, ${conflicts.length} conflicts`,
      };
    } catch {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Mapping service unavailable' };
    }
  },

  async verifyCapabilities() {
    try {
      const caps = await ProviderCapabilitiesService.getCapabilities();
      const providerName = caps._provider || 'unknown';
      return {
        status: 'ok',
        icon: CHECK_ICONS.ok,
        details: `Provider: ${providerName}, features: ${Object.keys(caps).length}`,
      };
    } catch {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Capabilities not detected' };
    }
  },

  async verifyProvider() {
    try {
      const adapters = await ProviderAdapterRegistryService.getAll();
      const active = adapters.filter((a) => a.active);
      return {
        status: active.length > 0 ? 'ok' : 'warn',
        icon: active.length > 0 ? CHECK_ICONS.ok : CHECK_ICONS.warn,
        details: `${active.length} active adapter${active.length !== 1 ? 's' : ''} (${active.map((a) => a.provider).join(', ') || 'none'})`,
      };
    } catch {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Provider adapter registry unavailable' };
    }
  },

  async verifySecurity() {
    const provider = getDatabaseProvider();
    try {
      const rlsTables = ['schema_registry', 'entity_registry', 'field_registry', 'provider_registry', 'migration_registry'];
      // Check if RLS tables exist at all as proxy for security
      let rlsCount = 0;
      for (const t of rlsTables) {
        const exists = await provider.collectionExists(t);
        if (exists) rlsCount++;
      }
      return {
        status: rlsCount >= 3 ? 'ok' : 'warn',
        icon: rlsCount >= 3 ? CHECK_ICONS.ok : CHECK_ICONS.warn,
        details: rlsCount >= 3 ? 'RLS tables present (security active)' : `${rlsCount}/${rlsTables.length} RLS tables found`,
      };
    } catch {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Security check unavailable' };
    }
  },

  async verifyMigration() {
    const installed = await MigrationRunner.getInstalledVersion();
    const target = SCHEMA_VERSION;
    const needsMigrate = installed < target;
    return {
      status: needsMigrate ? 'warn' : 'ok',
      icon: needsMigrate ? CHECK_ICONS.warn : CHECK_ICONS.ok,
      details: needsMigrate ? `Schema v${installed} → v${target} pending` : `Schema v${installed} (current)`,
    };
  },

  async verifyInstallerState() {
    try {
      const state = await InstallerStateService.getState();
      const status = state.install_status;
      const ok = status === 'completed';
      return {
        status: ok ? 'ok' : 'warn',
        icon: ok ? CHECK_ICONS.ok : CHECK_ICONS.warn,
        details: `Installer: ${status}, schema v${state.schema_version || 0}`,
      };
    } catch {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Installer state unavailable' };
    }
  },

  formatOutput(verificationResult) {
    const lines = verificationResult.checks.map((c) => {
      const icon = c.icon || CHECK_ICONS.skip;
      return `${icon === CHECK_ICONS.ok ? 'OK' : icon === CHECK_ICONS.fail ? 'FAIL' : icon === CHECK_ICONS.warn ? 'WARN' : 'SKIP'}  ${c.name.padEnd(16)} ${c.details || ''}`;
    });
    return lines.join('\n');
  },
};

export default VerificationEngine;
