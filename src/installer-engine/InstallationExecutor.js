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

  // Pre-validate SQL by checking for existing objects in the database.
  // Returns:
  //   conflicts — objects that exist in BOTH source SQL and database (remove from source)
  //   extras   — objects that exist in database but are NOT in source (unnecessary, alert to drop)
  //   filteredSql — source SQL with statements for existing objects removed
  async preValidateSql(sql) {
    const provider = getDatabaseProvider();
    if (typeof provider.execSql !== 'function') {
      return { ok: true, conflicts: [], extras: [], filteredSql: sql, error: null };
    }

    // 1. Parse all expected object names from the source SQL
    const sourceTables = [...new Set(
      [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?["']?(\w+)["']?\s*/ig)]
        .map((m) => m[1].toLowerCase())
    )];
    const sourceIndexes = [...new Set(
      [...sql.matchAll(/create\s+index\s+(?:if\s+not\s+exists\s+)?["']?(\w+)["']?\s+on/ig)]
        .map((m) => m[1].toLowerCase())
    )];
    const sourceFunctions = [...new Set(
      [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(\w+)\s*/ig)]
        .map((m) => m[1].toLowerCase())
    )];
    const sourcePolicies = [...sql.matchAll(/create\s+policy\s+(\w+)\s+on\s+(\w+)\s+for/ig)]
      .map((m) => ({ name: m[1], table: m[2] }));
    const sourceConstraints = [...sql.matchAll(/add\s+constraint\s+(\w+)/ig)]
      .map((m) => m[1]);

    const conflicts = [];
    const extras = [];
    const existingNames = { tables: [], indexes: [], functions: [], policies: [], constraints: [] };

    // 2. Query DB catalog for ALL objects matching these categories,
    //    then classify into conflicts (in both) and extras (in DB only)

    // -- Tables --
    const allTableRes = await provider.execSql(
      `select tablename as name from pg_tables where schemaname = 'public'`
    );
    if (allTableRes.ok && Array.isArray(allTableRes.data)) {
      for (const row of allTableRes.data) {
        const n = (row.name || '').toLowerCase();
        if (sourceTables.includes(n)) {
          conflicts.push({ type: 'table', name: row.name });
          existingNames.tables.push(n);
        } else {
          extras.push({ type: 'table', name: row.name });
        }
      }
    }

    // -- Indexes --
    const allIdxRes = await provider.execSql(
      `select indexname as name from pg_indexes where schemaname = 'public'`
    );
    if (allIdxRes.ok && Array.isArray(allIdxRes.data)) {
      for (const row of allIdxRes.data) {
        const n = (row.name || '').toLowerCase();
        if (sourceIndexes.includes(n)) {
          conflicts.push({ type: 'index', name: row.name });
          existingNames.indexes.push(n);
        } else {
          extras.push({ type: 'index', name: row.name });
        }
      }
    }

    // -- Functions --
    const allFuncRes = await provider.execSql(
      `select proname as name from pg_proc where pronamespace = (select oid from pg_namespace where nspname = 'public')`
    );
    if (allFuncRes.ok && Array.isArray(allFuncRes.data)) {
      for (const row of allFuncRes.data) {
        const n = (row.name || '').toLowerCase();
        if (sourceFunctions.includes(n)) {
          conflicts.push({ type: 'function', name: row.name });
          existingNames.functions.push(n);
        } else {
          extras.push({ type: 'function', name: row.name });
        }
      }
    }

    // -- Policies --
    const allPolRes = await provider.execSql(
      `select policyname as name, tablename from pg_policies`
    );
    if (allPolRes.ok && Array.isArray(allPolRes.data)) {
      for (const row of allPolRes.data) {
        const rowName = (row.name || '').toLowerCase();
        const rowTable = (row.tablename || '').toLowerCase();
        const match = sourcePolicies.find((p) => (p.name || '').toLowerCase() === rowName && (p.table || '').toLowerCase() === rowTable);
        if (match) {
          conflicts.push({ type: 'policy', name: row.name, table: row.tablename });
          existingNames.policies.push(rowName);
        } else {
          extras.push({ type: 'policy', name: row.name, table: row.tablename });
        }
      }
    }

    // -- Constraints --
    const allConRes = await provider.execSql(
      `select c.conname as name, t.relname from pg_constraint c join pg_class t on t.oid = c.conrelid`
    );
    if (allConRes.ok && Array.isArray(allConRes.data)) {
      for (const row of allConRes.data) {
        const n = (row.name || '').toLowerCase();
        if (sourceConstraints.includes(n)) {
          conflicts.push({ type: 'constraint', name: row.name, table: row.relname });
          existingNames.constraints.push(n);
        } else {
          extras.push({ type: 'constraint', name: row.name, table: row.relname });
        }
      }
    }

    // 3. Build filtered SQL with statements for existing objects removed
    let filteredSql = sql;
    for (const c of conflicts) {
      if (c.type === 'table') {
        filteredSql = filteredSql.replace(
          new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?["']?${c.name}["']?\\s*\\([^;]+;`, 'is'), ''
        );
      } else if (c.type === 'policy') {
        filteredSql = filteredSql.replace(
          new RegExp(`create\\s+policy\\s+${c.name}\\s+on\\s+${c.table}\\s+for[^;]+;`, 'is'), ''
        );
      } else if (c.type === 'constraint') {
        filteredSql = filteredSql.replace(
          new RegExp(`add\\s+constraint\\s+${c.name}[^;]+;`, 'is'), ''
        );
      } else if (c.type === 'index') {
        filteredSql = filteredSql.replace(
          new RegExp(`create\\s+index\\s+(?:if\\s+not\\s+exists\\s+)?${c.name}\\s+on[^;]+;`, 'is'), ''
        );
      } else if (c.type === 'function') {
        filteredSql = filteredSql.replace(
          new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+${c.name}[^$]+?(?:\\$\\$|language)`, 'is'), ''
        );
      }
    }
    // Clean up extra blank lines left by removals
    filteredSql = filteredSql.replace(/\n{3,}/g, '\n\n').trim();

    const allExist = conflicts.length > 0 && filteredSql.length === 0;

    return { ok: true, conflicts, extras, filteredSql, allExist };
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
