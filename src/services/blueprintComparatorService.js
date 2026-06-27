const BLUEPRINT = {
  schemaVersion: 31,

  tables: {
    migration_registry: {
      type: 'infrastructure',
      columns: { id: 'text', version: 'integer', description: 'text', sql_hash: 'text', applied_at: 'timestamptz', duration_ms: 'integer', success: 'boolean', error: 'text', action: 'text' },
    },
    schema_registry: {
      type: 'infrastructure',
      columns: { id: 'text', version: 'integer', description: 'text', checksum: 'text', applied_at: 'timestamptz', applied_by: 'text' },
    },
    entity_registry: {
      type: 'infrastructure',
      columns: { id: 'text', name: 'text', label: 'text', table_name: 'text', primary_key: 'text', core: 'boolean', fields: 'jsonb', indexes: 'jsonb', created_at: 'timestamptz', updated_at: 'timestamptz' },
    },
    field_registry: {
      type: 'infrastructure',
      columns: { id: 'text', entity: 'text', field_name: 'text', field_type: 'text', required: 'boolean', unique_field: 'boolean', default_value: 'text', created_at: 'timestamptz' },
    },
    provider_registry: {
      type: 'infrastructure',
      columns: { id: 'text', provider_type: 'text', label: 'text', config: 'jsonb', active: 'boolean', connected_at: 'timestamptz', created_at: 'timestamptz', updated_at: 'timestamptz' },
    },
    installer_state: {
      type: 'infrastructure',
      columns: { id: 'text', install_status: 'text', schema_version: 'integer', installer_version: 'integer', provider: 'text', database_type: 'text', verified_at: 'timestamptz', installed_at: 'timestamptz', updated_at: 'timestamptz' },
    },
    schema_mapping: {
      type: 'infrastructure',
      columns: { id: 'text', entity_name: 'text', provider_table: 'text', description: 'text', active: 'boolean', version: 'integer', created_at: 'timestamptz', updated_at: 'timestamptz' },
    },
    mapping_history: {
      type: 'infrastructure',
      columns: { id: 'text', entity_name: 'text', old_table: 'text', new_table: 'text', changed_by: 'text', change_reason: 'text', created_at: 'timestamptz' },
    },
    mapping_versions: {
      type: 'infrastructure',
      columns: { id: 'text', version: 'integer', snapshot: 'jsonb', description: 'text', created_at: 'timestamptz' },
    },
    provider_capabilities: {
      type: 'infrastructure',
      columns: { id: 'text', provider: 'text', feature: 'text', supported: 'boolean', metadata: 'jsonb', detected_at: 'timestamptz' },
    },
    provider_adapter_registry: {
      type: 'infrastructure',
      columns: { id: 'text', provider: 'text', adapter_name: 'text', adapter_version: 'text', migration_engine: 'text', capabilities: 'jsonb', active: 'boolean', config: 'jsonb', created_at: 'timestamptz', updated_at: 'timestamptz' },
    },
    entity_prefix_registry: {
      type: 'infrastructure',
      columns: { entity: 'text', prefix: 'text', label: 'text', padding: 'integer', current_sequence: 'integer', created_at: 'timestamptz', updated_at: 'timestamptz' },
    },
    id_registry: {
      type: 'infrastructure',
      columns: { entity: 'text', prefix: 'text', sequence: 'integer', created_at: 'timestamptz', updated_at: 'timestamptz' },
    },
    foreign_key_registry: {
      type: 'infrastructure',
      columns: { id: 'text', from_entity: 'text', from_field: 'text', to_entity: 'text', to_field: 'text', cascade_delete: 'boolean', enabled: 'boolean', created_at: 'timestamptz' },
    },
    user_role_registry: {
      type: 'infrastructure',
      columns: { user_id: 'text', role_code: 'text', updated_at: 'timestamptz' },
    },
    schema_meta: { type: 'application', core: true },
    roles: { type: 'application', core: true },
    permissions: { type: 'application', core: true },
    users: { type: 'application', core: true },
    cases: { type: 'application', core: true },
    documents: { type: 'application', core: true },
    drafts: { type: 'application' },
    hearings: { type: 'application' },
    notes: { type: 'application' },
    judgments: { type: 'application' },
    cause_list_templates: { type: 'application' },
    case_folders: { type: 'application' },
    case_history: { type: 'application' },
    case_activity: { type: 'application' },
    case_stages: { type: 'application' },
    reminders: { type: 'application' },
    audit_logs: { type: 'application', core: true },
    env_vars: { type: 'application' },
    config_history: { type: 'application' },
    settings: { type: 'application', core: true },
    case_types: { type: 'application' },
    courts: { type: 'application', core: true },
    bench_types: { type: 'application', core: true },
    jurisdictions: { type: 'application', core: true },
    clients: { type: 'application', core: true },
    contacts: { type: 'application', core: true },
    acts: { type: 'application', core: true },
    prompts: { type: 'application', core: true },
    templates: { type: 'application', core: true },
    legal_notices: { type: 'application', core: true },
    precedents: { type: 'application', core: true },
    reports: { type: 'application', core: true },
    case_statuses: { type: 'application', core: true },
    priorities: { type: 'application', core: true },
    hearing_statuses: { type: 'application', core: true },
    contact_types: { type: 'application', core: true },
    folder_templates: { type: 'application' },
    draft_types: { type: 'application' },
    judges: { type: 'application', core: true },
    reminder_types: { type: 'application', core: true },
    party_types: { type: 'application', core: true },
  },

  foreignKeys: [
    { name: 'fk_reminders_case_id', from: 'reminders', from_col: 'case_id', to: 'cases', on_delete: 'CASCADE' },
    { name: 'fk_notes_case_id', from: 'notes', from_col: 'case_id', to: 'cases', on_delete: 'CASCADE' },
    { name: 'fk_hearings_case_id', from: 'hearings', from_col: 'case_id', to: 'cases', on_delete: 'CASCADE' },
    { name: 'fk_drafts_case_id', from: 'drafts', from_col: 'case_id', to: 'cases', on_delete: 'CASCADE' },
    { name: 'fk_documents_case_id', from: 'documents', from_col: 'case_id', to: 'cases', on_delete: 'CASCADE' },
    { name: 'fk_case_history_case_id', from: 'case_history', from_col: 'case_id', to: 'cases', on_delete: 'CASCADE' },
    { name: 'fk_case_folders_case_id', from: 'case_folders', from_col: 'case_id', to: 'cases', on_delete: 'CASCADE' },
    { name: 'fk_case_activity_case_id', from: 'case_activity', from_col: 'case_id', to: 'cases', on_delete: 'CASCADE' },
    { name: 'fk_audit_logs_user_id', from: 'audit_logs', from_col: 'user_id', to: 'users', on_delete: 'SET NULL' },
    { name: 'fk_users_role_code', from: 'users', from_col: 'role_code', to: 'roles', on_delete: 'RESTRICT' },
    { name: 'fk_case_folders_parent_id', from: 'case_folders', from_col: 'parent_id', to: 'case_folders', on_delete: 'CASCADE' },
  ],

  indexes: {
    system: [
      'idx_schema_registry_version', 'idx_field_registry_entity', 'idx_provider_registry_active',
      'idx_provider_adapter_active', 'idx_schema_mapping_active', 'idx_mapping_history_entity',
      'idx_provider_capabilities_provider', 'idx_provider_capabilities_feature',
      'idx_entity_prefix_registry_prefix', 'idx_foreign_key_registry_from', 'idx_foreign_key_registry_to',
      'idx_migration_registry_version', 'idx_migration_registry_applied_at',
    ],
    byTable: {
      users: ['idx_users_email', 'idx_users_username', 'idx_users_role_code', 'idx_users_status'],
      cases: ['idx_cases_case_number_str', 'idx_cases_case_display_number', 'idx_cases_case_type', 'idx_cases_status', 'idx_cases_stage', 'idx_cases_archived', 'idx_cases_priority'],
      documents: ['idx_documents_case_id', 'idx_documents_folder', 'idx_documents_sync_status'],
      hearings: ['idx_hearings_case_id', 'idx_hearings_date', 'idx_hearings_status', 'idx_hearings_next_hearing_date'],
      case_types: ['idx_case_types_short_code', 'idx_case_types_status', 'idx_case_types_display_order'],
      courts: ['idx_courts_name', 'idx_courts_level', 'idx_courts_parent_id', 'idx_courts_status'],
      bench_types: ['idx_bench_types_name', 'idx_bench_types_short_code', 'idx_bench_types_status'],
      jurisdictions: ['idx_jurisdictions_name', 'idx_jurisdictions_short_code', 'idx_jurisdictions_status'],
      clients: ['idx_clients_name', 'idx_clients_email', 'idx_clients_status', 'idx_clients_client_type'],
      contacts: ['idx_contacts_name', 'idx_contacts_type', 'idx_contacts_email', 'idx_contacts_status'],
      acts: ['idx_acts_title', 'idx_acts_short_code', 'idx_acts_act_type', 'idx_acts_status'],
      prompts: ['idx_prompts_name', 'idx_prompts_category', 'idx_prompts_status'],
      templates: ['idx_templates_name', 'idx_templates_category', 'idx_templates_status'],
      legal_notices: ['idx_legal_notices_notice_number', 'idx_legal_notices_recipient', 'idx_legal_notices_status', 'idx_legal_notices_date'],
      precedents: ['idx_precedents_title', 'idx_precedents_citation', 'idx_precedents_court', 'idx_precedents_status', 'idx_precedents_is_favorite'],
      reports: ['idx_reports_name', 'idx_reports_report_type', 'idx_reports_status'],
      case_statuses: ['idx_case_statuses_name', 'idx_case_statuses_status'],
      priorities: ['idx_priorities_name', 'idx_priorities_status'],
      hearing_statuses: ['idx_hearing_statuses_name', 'idx_hearing_statuses_status', 'idx_hearing_statuses_display_order'],
      contact_types: ['idx_contact_types_name', 'idx_contact_types_status'],
      judges: ['idx_judges_name', 'idx_judges_short_code', 'idx_judges_status'],
      reminder_types: ['idx_reminder_types_name', 'idx_reminder_types_status'],
      party_types: ['idx_party_types_type', 'idx_party_types_status', 'idx_party_types_display_order'],
      notes: ['idx_notes_case_id'],
      reminders: ['idx_reminders_case_id', 'idx_reminders_due_at', 'idx_reminders_status'],
      drafts: ['idx_drafts_case_id', 'idx_drafts_type'],
      case_folders: ['idx_case_folders_case_id', 'idx_case_folders_parent_id', 'idx_case_folders_kind'],
      case_history: ['idx_case_history_case_id', 'idx_case_history_date'],
      case_activity: ['idx_case_activity_case_id', 'idx_case_activity_at'],
      case_stages: ['idx_case_stages_order'],
      env_vars: ['idx_env_vars_name', 'idx_env_vars_category'],
      config_history: ['idx_config_history_name', 'idx_config_history_at'],
      schema_meta: ['idx_schema_meta_provider'],
      roles: ['idx_roles_code', 'idx_roles_status'],
      permissions: ['idx_permissions_code', 'idx_permissions_module'],
      folder_templates: ['idx_folder_templates_name', 'idx_folder_templates_kind'],
      draft_types: ['idx_draft_types_name', 'idx_draft_types_group'],
    },
  },

  functions: [
    'exec_sql', 'safe_ddl', 'safe_create_fk', 'resolve_entity_table',
    'current_user_role', 'verify_installation', 'next_lx_id', 'sync_user_role_registry',
  ],

  policies: {
    schema_registry: ['schema_registry_admin_all', 'schema_registry_manager_select', 'schema_registry_user_select'],
    entity_registry: ['entity_registry_admin_all', 'entity_registry_manager_select', 'entity_registry_manager_insert', 'entity_registry_manager_update', 'entity_registry_user_select'],
    field_registry: ['field_registry_admin_all', 'field_registry_manager_select', 'field_registry_manager_insert', 'field_registry_user_select'],
    provider_registry: ['provider_registry_admin_all', 'provider_registry_manager_select'],
    migration_registry: ['migration_registry_admin_all', 'migration_registry_manager_select'],
    installer_state: ['installer_state_admin_all', 'installer_state_manager_select', 'installer_state_user_select'],
    provider_adapter_registry: ['provider_adapter_admin_all', 'provider_adapter_manager_select'],
    schema_mapping: ['schema_mapping_admin_all', 'schema_mapping_manager_select', 'schema_mapping_manager_insert', 'schema_mapping_manager_update'],
    mapping_history: ['mapping_history_admin_all', 'mapping_history_manager_select'],
    mapping_versions: ['mapping_versions_admin_all', 'mapping_versions_manager_select'],
    provider_capabilities: ['provider_capabilities_admin_all', 'provider_capabilities_manager_select', 'provider_capabilities_user_select'],
    entity_prefix_registry: ['entity_prefix_admin_all', 'entity_prefix_manager_select', 'entity_prefix_user_select'],
    id_registry: ['id_registry_admin_all', 'id_registry_manager_select'],
    foreign_key_registry: ['foreign_key_registry_admin_all', 'foreign_key_registry_manager_select'],
    user_role_registry: ['user_role_registry_admin_all'],
    users: ['users_admin_all', 'users_manager_all', 'users_user_select'],
    roles: ['roles_admin_all', 'roles_manager_select', 'roles_user_select'],
    permissions: ['permissions_admin_all', 'permissions_manager_select'],
    cases: ['cases_admin_all', 'cases_manager_all', 'cases_user_select'],
    documents: ['documents_admin_all', 'documents_manager_all', 'documents_user_select'],
    hearings: ['hearings_admin_all', 'hearings_manager_all', 'hearings_user_select'],
    notes: ['notes_admin_all', 'notes_manager_all', 'notes_user_select'],
    reminders: ['reminders_admin_all', 'reminders_manager_all', 'reminders_user_select'],
    drafts: ['drafts_admin_all', 'drafts_manager_all', 'drafts_user_select'],
    case_history: ['case_history_admin_all', 'case_history_manager_all', 'case_history_user_select'],
    case_activity: ['case_activity_admin_all', 'case_activity_manager_all', 'case_activity_user_select'],
    case_folders: ['case_folders_admin_all', 'case_folders_manager_all', 'case_folders_user_select'],
    settings: ['settings_admin_all', 'settings_manager_all'],
    env_vars: ['env_vars_admin_all', 'env_vars_manager_all'],
    audit_logs: ['audit_logs_admin_select'],
    config_history: ['config_history_admin_select'],
    schema_meta: ['schema_meta_admin_all', 'schema_meta_manager_select'],
    courts: ['courts_admin_all', 'courts_manager_all', 'courts_user_select'],
    case_types: ['case_types_admin_all', 'case_types_manager_all', 'case_types_user_select'],
    case_stages: ['case_stages_admin_all', 'case_stages_manager_all', 'case_stages_user_select'],
    judgments: ['judgments_admin_all', 'judgments_manager_all', 'judgments_user_select'],
    cause_list_templates: ['cause_list_templates_admin_all', 'cause_list_templates_manager_all', 'cause_list_templates_user_select'],
  },

  triggers: ['trg_user_role_registry_sync'],

  extensions: ['uuid-ossp', 'pgcrypto'],

  roles: ['role_admin', 'role_manager', 'role_user'],

  storageBuckets: [],

  materializedViews: [],
};

function classify(registry, blueprint) {
  const missing = [];
  const healthy = [];
  const extra = [];
  const broken = [];

  for (const key of blueprint) {
    if (registry.has(key)) {
      healthy.push(key);
    } else {
      missing.push(key);
    }
  }

  for (const key of registry) {
    if (!blueprint.has(key)) {
      extra.push(key);
    }
  }

  return { healthy, missing, extra, broken };
}

export const blueprintComparatorService = {
  compare(scanResult) {
    if (!scanResult || !scanResult.ok) {
      return { ok: false, error: 'Invalid scan result' };
    }

    const details = scanResult.details;
    const dbTableNames = new Set(details.tableNames || []);

    const bpTableNames = Object.keys(BLUEPRINT.tables);
    const bpTableSet = new Set(bpTableNames);

    const tablesResult = classify(dbTableNames, bpTableSet);

    const missingTables = tablesResult.missing.map((name) => ({
      name,
      type: BLUEPRINT.tables[name]?.type || 'unknown',
      severity: BLUEPRINT.tables[name]?.core ? 'critical' : 'warning',
    }));

    const healthyTables = tablesResult.healthy.map((name) => ({
      name,
      type: BLUEPRINT.tables[name]?.type || 'unknown',
      health: 'healthy',
    }));

    const extraTables = tablesResult.extra.map((name) => ({
      name,
      reason: 'exists in database but not in blueprint',
      severity: 'warning',
    }));

    const dbIndexNames = new Set((details.indexes || []).map((i) => i.name));
    const allBpIndexes = [...(BLUEPRINT.indexes.system || [])];
    for (const [, idxList] of Object.entries(BLUEPRINT.indexes.byTable || {})) {
      allBpIndexes.push(...idxList);
    }
    const bpIndexSet = new Set(allBpIndexes);
    const indexesResult = classify(dbIndexNames, bpIndexSet);

    const dbPolicyNames = new Set((details.policies || []).map((p) => p.name));
    const allBpPolicies = [];
    for (const [, polList] of Object.entries(BLUEPRINT.policies)) {
      allBpPolicies.push(...polList);
    }
    const bpPolicySet = new Set(allBpPolicies);
    const policiesResult = classify(dbPolicyNames, bpPolicySet);

    const dbFunctionNames = new Set((details.functions || []).map((f) => f.name));
    const bpFunctionSet = new Set(BLUEPRINT.functions);
    const functionsResult = classify(dbFunctionNames, bpFunctionSet);

    const dbTriggerNames = new Set((details.triggers || []).map((t) => t.trigger_name));
    const bpTriggerSet = new Set(BLUEPRINT.triggers);
    const triggersResult = classify(dbTriggerNames, bpTriggerSet);

    const dbExtNames = new Set((details.extensions || []).map((e) => e.name));
    const bpExtSet = new Set(BLUEPRINT.extensions);
    const extensionsResult = classify(dbExtNames, bpExtSet);

    const dbRoleNames = new Set((details.roles || []).map((r) => r.name));
    const bpRoleSet = new Set(BLUEPRINT.roles);
    const rolesResult = classify(dbRoleNames, bpRoleSet);

    const dbBucketNames = new Set((details.storageBuckets || []).map((b) => b.name));
    const bpBucketSet = new Set(BLUEPRINT.storageBuckets);
    const bucketsResult = classify(dbBucketNames, bpBucketSet);

    const dbFkNames = new Set((details.foreignKeys || []).map((fk) => fk.constraint_name));
    const bpFkSet = new Set(BLUEPRINT.foreignKeys.map((fk) => fk.name));
    const fksResult = classify(dbFkNames, bpFkSet);

    const missingFks = fksResult.missing.map((name) => {
      const def = BLUEPRINT.foreignKeys.find((fk) => fk.name === name);
      return { name, ...def, severity: 'warning' };
    });

    const dbViewNames = new Set((details.views || []).map((v) => v.name));
    const bpViewSet = new Set(BLUEPRINT.views || []);
    const viewsResult = classify(dbViewNames, bpViewSet);

    const dbMatviewNames = new Set((details.materializedViews || []).map((v) => v.name));
    const bpMatviewSet = new Set(BLUEPRINT.materializedViews || []);
    const matviewsResult = classify(dbMatviewNames, bpMatviewSet);

    const relationships = (details.relationshipCardinality || []).map((r) => ({
      table: r.table_name,
      referencedTable: r.referenced_table,
      constraint: r.constraint_name,
      cardinality: r.cardinality,
    }));

    const junctionTables = (details.manyToManyJunction || []).map((r) => ({
      table: r.table_name,
      references: r.referenced_tables,
      fkCount: Number(r.fk_count),
      cardinality: 'many-to-many',
    }));

    const missingPolicies = policiesResult.missing.map((name) => {
      for (const [table, pols] of Object.entries(BLUEPRINT.policies)) {
        if (pols.includes(name)) return { name, table, severity: 'warning' };
      }
      return { name, table: 'unknown', severity: 'warning' };
    });

    const unknownPolicies = policiesResult.extra.map((name) => {
      const pol = (details.policies || []).find((p) => p.name === name);
      return { name, table: pol?.tablename || 'unknown', severity: 'info' };
    });

    const { brokenFks } = detectBroken(details);

    const unusedIndexes = (details.unusedIndexes || []).map((r) => ({
      name: r.index_name,
      table: r.table_name,
      scans: Number(r.scans),
      severity: 'improvement',
    }));

    const circularFks = (details.circularForeignKeys || []).map((r) => ({
      table: r.src,
      references: r.dst,
      severity: 'critical',
    }));

    const duplicateTablesByStructure = (details.duplicateTablesByStructure || []).map((r) => ({
      t1: r.t1,
      t2: r.t2,
      severity: 'warning',
    }));

    const unnecessaryTables = extraTables.filter((t) => {
      const lower = (t.name || '').toLowerCase();
      const patterns = [/^test_/, /^temp_/, /^old_/, /^backup_/, /^legacy_/, /_copy$/, /_old$/, /_backup$/, /_test$/, /_dup$/];
      return patterns.some((p) => p.test(lower));
    });

    const unnecessaryIndexes = (indexesResult.extra || []).filter((name) => {
      const lower = (name || '').toLowerCase();
      return /_copy$|_old$|_backup$|_test$|_dup$/i.test(lower);
    });

    const unnecessaryPolicies = (unknownPolicies || []).filter((p) => {
      const lower = (p.name || '').toLowerCase();
      return /_copy$|_old$|_backup$|_test$|_dup$/i.test(lower);
    });

    const missingColumns = [];
    const columnIssues = [];
    for (const [tableName, bpTable] of Object.entries(BLUEPRINT.tables)) {
      if (bpTable.columns && dbTableNames.has(tableName)) {
        const dbCols = new Set((details.columns || [])
          .filter((c) => c.table_name === tableName)
          .map((c) => c.column_name));
        for (const [colName, colType] of Object.entries(bpTable.columns)) {
          if (!dbCols.has(colName)) {
            missingColumns.push({ table: tableName, column: colName, expectedType: colType });
          }
        }
      }
    }

    const emptyTables = (details.emptyTables || []).map((t) => ({
      name: typeof t === 'string' ? t : t.name,
      severity: 'info',
    }));

    const emptySchemas = (details.emptySchemas || []).map((s) => ({
      name: typeof s === 'string' ? s : s.schema_name,
      severity: 'info',
    }));

    const exclusionConstrains = (details.exclusionConstraints || []).map((c) => ({
      table: c.table_name,
      name: c.constraint_name,
      definition: c.definition,
      severity: 'info',
    }));

    const compositeConstrains = (details.compositeConstraints || []).map((c) => ({
      table: c.table_name,
      name: c.constraint_name,
      type: c.contype,
      definition: c.definition,
      severity: 'info',
    }));

    const largeTables = (details.tableSizes || []).filter((t) => Number(t.bytes) > 104857600).map((t) => ({
      name: t.name,
      size: t.size,
      bytes: Number(t.bytes),
      severity: 'info',
    }));

    return {
      ok: true,
      blueprint: BLUEPRINT,
      summary: {
        healthyObjects: healthyTables.length + indexesResult.healthy.length + policiesResult.healthy.length + fksResult.healthy.length + functionsResult.healthy.length + triggersResult.healthy.length + extensionsResult.healthy.length + rolesResult.healthy.length,
        totalTables: bpTableNames.length,
        healthyTables: healthyTables.length,
        missingTables: missingTables.length,
        extraTables: extraTables.length,
        unnecessaryTables: unnecessaryTables.length,
        healthyIndexes: indexesResult.healthy.length,
        missingIndexes: indexesResult.missing.length,
        extraIndexes: indexesResult.extra.length,
        unnecessaryIndexes: unnecessaryIndexes.length,
        healthyPolicies: policiesResult.healthy.length,
        missingPolicies: policiesResult.missing.length,
        extraPolicies: policiesResult.extra.length,
        unnecessaryPolicies: unnecessaryPolicies.length,
        healthyFunctions: functionsResult.healthy.length,
        missingFunctions: functionsResult.missing.length,
        healthyTriggers: triggersResult.healthy.length,
        missingTriggers: triggersResult.missing.length,
        healthyFks: fksResult.healthy.length,
        missingFks: missingFks.length,
        brokenFks: brokenFks.length,
        healthyExtensions: extensionsResult.healthy.length,
        missingExtensions: extensionsResult.missing.length,
        healthyRoles: rolesResult.healthy.length,
        missingRoles: rolesResult.missing.length,
        totalPolicies: allBpPolicies.length,
        totalIndexes: allBpIndexes.length,
        unusedIndexes: unusedIndexes.length,
        circularFks: circularFks.length,
        missingColumns: missingColumns.length,
        emptyTables: emptyTables.length,
        emptySchemas: emptySchemas.length,
        exclusionConstraints: exclusionConstrains.length,
        compositeConstraints: compositeConstrains.length,
        largeTables: largeTables.length,
        healthyMatviews: matviewsResult.healthy.length,
        relationships: relationships.length,
        junctionTables: junctionTables.length,
        warningCount: missingTables.length + missingPolicies.length + missingFks.length + (extensionsResult.missing || []).length + (triggersResult.missing || []).length + unnecessaryTables.length + unusedIndexes.length + (indexesResult.extra || []).length + (unknownPolicies || []).length + missingColumns.length,
      },
      findings: {
        missingTables,
        extraTables,
        unnecessaryTables,
        healthyTables,
        missingIndexes: indexesResult.missing,
        extraIndexes: indexesResult.extra,
        unnecessaryIndexes,
        missingPolicies,
        extraPolicies: unknownPolicies,
        unnecessaryPolicies,
        missingFunctions: functionsResult.missing,
        missingTriggers: triggersResult.missing,
        missingFks,
        brokenFks,
        missingExtensions: extensionsResult.missing,
        missingRoles: rolesResult.missing,
        duplicateIndexes: (details.duplicateIndexes || []).map((d) => ({
          name: d.indexname,
          table: d.tablename,
          severity: 'warning',
        })),
        unusedIndexes,
        circularFks,
        duplicateTablesByStructure,
        missingColumns,
        columnIssues,
        emptyTables,
        emptySchemas,
        exclusionConstraints: exclusionConstrains,
        compositeConstraints: compositeConstrains,
        largeTables,
        materializedViews: matviewsResult,
        relationships,
        junctionTables,
      },
      dbScan: details,
    };
  },

  getBlueprint() {
    return BLUEPRINT;
  },
};

function detectBroken(details) {
  const broken = [];
  const constraints = details.foreignKeys || [];
  const tableNames = new Set(details.tableNames || []);
  for (const fk of constraints) {
    if (!tableNames.has(String(fk.referenced_table || '').trim())) {
      broken.push({
        name: fk.constraint_name,
        table: fk.table_name,
        referenced_table: fk.referenced_table,
        reason: `referenced table "${fk.referenced_table}" does not exist`,
        severity: 'critical',
      });
    }
  }
  return { brokenFks: broken };
}

export default blueprintComparatorService;
