// VerificationEngine — comprehensive installation verification service.
// P6: Enhanced with FK, function, index, and policy existence checks.

import { databaseAdminService } from '@/services/databaseAdminService.js';
import { InstallerStateService } from '@/services/installerStateService.js';
import { SchemaMappingService } from '@/services/schemaMappingService.js';
import { ProviderCapabilitiesService } from '@/services/providerCapabilitiesService.js';
import { ProviderAdapterRegistryService } from '@/services/providerAdapterRegistryService.js';
import { MigrationRunner } from '@/installer-engine/MigrationRunner.js';
import { listSchemas, SCHEMA_VERSION } from '@/data-provider/schema/index.js';
import { getDatabaseProvider } from '@/providers/database/index.js';

const CHECK_ICONS = { ok: 'OK', fail: 'FAIL', warn: 'WARN', skip: 'SKIP' };

const REQUIRED_REGISTRY_TABLES = [
  'schema_registry', 'entity_registry', 'field_registry', 'provider_registry',
  'migration_registry', 'installer_state', 'schema_mapping', 'mapping_history',
  'mapping_versions', 'provider_capabilities', 'entity_prefix_registry',
  'id_registry', 'foreign_key_registry', 'provider_adapter_registry',
];

const REQUIRED_FUNCTIONS = ['exec_sql', 'safe_ddl', 'safe_create_fk', 'next_lx_id', 'current_user_role'];

const REQUIRED_FKS = [
  'fk_reminders_case_id', 'fk_notes_case_id', 'fk_hearings_case_id',
  'fk_drafts_case_id', 'fk_documents_case_id', 'fk_case_history_case_id',
  'fk_case_folders_case_id', 'fk_case_activity_case_id', 'fk_audit_logs_user_id',
  'fk_users_role_code', 'fk_case_folders_parent_id',
];

const REQUIRED_INDEXES = [
  'idx_migration_registry_version', 'idx_field_registry_entity',
  'idx_schema_registry_version', 'idx_provider_registry_active',
  'idx_provider_adapter_active', 'idx_schema_mapping_active',
  'idx_mapping_history_entity', 'idx_provider_capabilities_provider',
  'idx_provider_capabilities_feature', 'idx_entity_prefix_registry_prefix',
  'idx_foreign_key_registry_from', 'idx_foreign_key_registry_to',
];

export const VerificationEngine = {
  async verifyAll() {
    const results = await Promise.allSettled([
      this.verifySchema(),
      this.verifyRegistryTables(),
      this.verifyMappings(),
      this.verifyFunctions(),
      this.verifyForeignKeys(),
      this.verifyIndexes(),
      this.verifyPolicies(),
      this.verifyProvider(),
      this.verifyMigration(),
      this.verifyInstallerState(),
    ]);

    const names = [
      'Schema', 'Registry', 'Mappings', 'Functions', 'Foreign Keys',
      'Indexes', 'Policies', 'Provider', 'Migration', 'Installer State',
    ];

    const checks = results.map((r, i) => {
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
      version: SCHEMA_VERSION,
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
      } catch { /* skip */ }
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
    const missing = [];
    for (const table of REQUIRED_REGISTRY_TABLES) {
      try {
        const exists = await provider.collectionExists(table);
        if (!exists) missing.push(table);
      } catch { missing.push(table); }
    }
    const ok = missing.length === 0;
    return {
      status: ok ? 'ok' : 'fail',
      icon: ok ? CHECK_ICONS.ok : CHECK_ICONS.fail,
      details: ok ? `All ${REQUIRED_REGISTRY_TABLES.length} registry tables present` : `Missing: ${missing.join(', ')}`,
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

  async verifyFunctions() {
    const provider = getDatabaseProvider();
    if (typeof provider.execSql !== 'function') {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Provider does not support SQL introspection' };
    }
    const missing = [];
    for (const fn of REQUIRED_FUNCTIONS) {
      try {
        const res = await provider.execSql(
          `select exists(select 1 from pg_proc where proname = '${fn.replace(/'/g, "''")}') as exists_flag;`
        );
        if (!res || !res.ok) { missing.push(fn); }
      } catch { missing.push(fn); }
    }
    const ok = missing.length === 0;
    return {
      status: ok ? 'ok' : 'warn',
      icon: ok ? CHECK_ICONS.ok : CHECK_ICONS.warn,
      details: ok ? `All ${REQUIRED_FUNCTIONS.length} functions exist` : `Missing functions: ${missing.join(', ')}`,
    };
  },

  async verifyForeignKeys() {
    const provider = getDatabaseProvider();
    if (typeof provider.execSql !== 'function') {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Provider does not support FK introspection' };
    }
    const missing = [];
    for (const fk of REQUIRED_FKS) {
      try {
        const res = await provider.execSql(
          `select exists(select 1 from pg_constraint where conname = '${fk.replace(/'/g, "''")}') as exists_flag;`
        );
        if (!res || !res.ok) { missing.push(fk); }
      } catch { missing.push(fk); }
    }
    const ok = missing.length === 0;
    return {
      status: ok ? 'ok' : 'warn',
      icon: ok ? CHECK_ICONS.ok : CHECK_ICONS.warn,
      details: ok ? `All ${REQUIRED_FKS.length} foreign keys exist` : `Missing FKs: ${missing.join(', ')}`,
    };
  },

  async verifyIndexes() {
    const provider = getDatabaseProvider();
    if (typeof provider.execSql !== 'function') {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Provider does not support index introspection' };
    }
    const missing = [];
    for (const idx of REQUIRED_INDEXES) {
      try {
        const res = await provider.execSql(
          `select exists(select 1 from pg_indexes where indexname = '${idx.replace(/'/g, "''")}') as exists_flag;`
        );
        if (!res || !res.ok) { missing.push(idx); }
      } catch { missing.push(idx); }
    }
    const ok = missing.length === 0;
    return {
      status: ok ? 'ok' : 'warn',
      icon: ok ? CHECK_ICONS.ok : CHECK_ICONS.warn,
      details: ok ? `All ${REQUIRED_INDEXES.length} indexes exist` : `Missing indexes: ${missing.join(', ')}`,
    };
  },

  async verifyPolicies() {
    const provider = getDatabaseProvider();
    if (typeof provider.execSql !== 'function') {
      return { status: 'skip', icon: CHECK_ICONS.skip, details: 'Provider does not support policy introspection' };
    }
    const expected = [
      'schema_registry_admin_all', 'entity_registry_admin_all', 'field_registry_admin_all',
      'migration_registry_admin_all', 'installer_state_admin_all',
    ];
    const missing = [];
    for (const pol of expected) {
      try {
        const res = await provider.execSql(
          `select exists(select 1 from pg_policies where policyname = '${pol.replace(/'/g, "''")}') as exists_flag;`
        );
        if (!res || !res.ok) { missing.push(pol); }
      } catch { missing.push(pol); }
    }
    const ok = missing.length === 0;
    return {
      status: ok ? 'ok' : 'warn',
      icon: ok ? CHECK_ICONS.ok : CHECK_ICONS.warn,
      details: ok ? `RLS policies active` : `Missing policies: ${missing.join(', ')}`,
    };
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

  async verifyMigration() {
    const installed = await MigrationRunner.getInstalledVersion();
    const target = MigrationRunner.listMigrationSteps().length;
    const needsMigrate = installed < target;
    return {
      status: needsMigrate ? 'warn' : 'ok',
      icon: needsMigrate ? CHECK_ICONS.warn : CHECK_ICONS.ok,
      details: needsMigrate ? `Step ${installed}/${target} — ${target - installed} step(s) pending` : `Step ${installed}/${target} (current)`,
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
      const label = icon === CHECK_ICONS.ok ? 'OK' : icon === CHECK_ICONS.fail ? 'FAIL' : icon === CHECK_ICONS.warn ? 'WARN' : 'SKIP';
      return `${label.padEnd(6)} ${c.name.padEnd(16)} ${c.details || ''}`;
    });
    return lines.join('\n');
  },
};

export default VerificationEngine;
