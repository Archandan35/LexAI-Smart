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

  // Pre-validate SQL by checking for existing objects that would conflict.
  // Parses all DDL statements from the SQL text and queries catalog tables
  // (pg_tables, pg_indexes, pg_policies, pg_constraint, pg_proc) to detect
  // existing objects before execution.
  async preValidateSql(sql) {
    const provider = getDatabaseProvider();
    if (typeof provider.execSql !== 'function') {
      return { ok: true, conflicts: [], error: null };
    }

    const conflicts = [];

    // Tables — match both CREATE TABLE name and CREATE TABLE IF NOT EXISTS name
    const tableNames = [...new Set(
      [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?["']?(\w+)["']?\s*/ig)]
        .map((m) => m[1].toLowerCase())
    )];
    if (tableNames.length > 0) {
      const checks = tableNames.map((n) =>
        `select tablename as name from pg_tables where tablename = '${n}' and schemaname = 'public'`
      ).join('\nunion all\n');
      const res = await provider.execSql(checks);
      if (res.ok && Array.isArray(res.data)) {
        for (const row of res.data) {
          conflicts.push({ type: 'table', name: row.name });
        }
      }
    }

    // Indexes — match both CREATE INDEX name and CREATE INDEX IF NOT EXISTS name
    const indexNames = [...new Set(
      [...sql.matchAll(/create\s+index\s+(?:if\s+not\s+exists\s+)?["']?(\w+)["']?\s+on/ig)]
        .map((m) => m[1].toLowerCase())
    )];
    if (indexNames.length > 0) {
      const checks = indexNames.map((n) =>
        `select indexname as name from pg_indexes where indexname = '${n}' and schemaname = 'public'`
      ).join('\nunion all\n');
      const res = await provider.execSql(checks);
      if (res.ok && Array.isArray(res.data)) {
        for (const row of res.data) {
          conflicts.push({ type: 'index', name: row.name });
        }
      }
    }

    // Functions — match CREATE OR REPLACE FUNCTION name / CREATE FUNCTION name
    const funcNames = [...new Set(
      [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(\w+)\s*/ig)]
        .map((m) => m[1].toLowerCase())
    )];
    if (funcNames.length > 0) {
      const checks = funcNames.map((n) =>
        `select proname as name from pg_proc where proname = '${n}' and pronamespace = (select oid from pg_namespace where nspname = 'public')`
      ).join('\nunion all\n');
      const res = await provider.execSql(checks);
      if (res.ok && Array.isArray(res.data)) {
        for (const row of res.data) {
          conflicts.push({ type: 'function', name: row.name });
        }
      }
    }

    // Policies
    const policyNames = [...sql.matchAll(/create\s+policy\s+(\w+)\s+on\s+(\w+)\s+for/ig)]
      .map((m) => ({ name: m[1], table: m[2] }));
    if (policyNames.length > 0) {
      const checks = policyNames.map((p) =>
        `select policyname as name, tablename from pg_policies where policyname = '${p.name}' and tablename = '${p.table}'`
      ).join('\nunion all\n');
      const res = await provider.execSql(checks);
      if (res.ok && Array.isArray(res.data)) {
        for (const row of res.data) {
          conflicts.push({ type: 'policy', name: row.name, table: row.tablename });
        }
      }
    }

    // Constraints
    const constraintNames = [...sql.matchAll(/add\s+constraint\s+(\w+)/ig)]
      .map((m) => m[1]);
    if (constraintNames.length > 0) {
      const checks = constraintNames.map((n) =>
        `select c.conname as name, t.relname from pg_constraint c join pg_class t on t.oid = c.conrelid where c.conname = '${n}'`
      ).join('\nunion all\n');
      const res = await provider.execSql(checks);
      if (res.ok && Array.isArray(res.data)) {
        for (const row of res.data) {
          conflicts.push({ type: 'constraint', name: row.name, table: row.relname });
        }
      }
    }

    return { ok: true, conflicts };
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
