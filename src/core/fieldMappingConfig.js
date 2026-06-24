import { FieldMapper } from './FieldMapper.js';

const COMMON = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const SCHEMAS = {
  users: { ...COMMON, roleCode: 'role_code', extraRoles: 'extra_roles', passwordHash: 'password_hash', lastLoginAt: 'last_login_at' },
  roles: { ...COMMON, inheritsHierarchy: 'inherits_hierarchy' },
  cases: { ...COMMON, caseNumber: 'case_number_str', courtName: 'court_name', nextHearing: 'next_hearing', filingDate: 'filing_date', wsFilingDate: 'ws_filing_date', stageHistory: 'stage_history' },
  courts: { ...COMMON },
  caseTypes: { ...COMMON },
  caseStages: { createdAt: 'created_at' },
  reminders: { ...COMMON, caseId: 'case_id', dueAt: 'due_at' },
  notes: { ...COMMON, caseId: 'case_id' },
  hearings: { ...COMMON, caseId: 'case_id' },
  drafts: { ...COMMON, caseId: 'case_id' },
  documents: { caseId: 'case_id', syncStatus: 'sync_status', syncMessage: 'sync_message', lastSyncAt: 'last_sync_at', uploadedAt: 'uploaded_at' },
  case_history: { caseId: 'case_id', createdAt: 'created_at' },
  case_folders: { ...COMMON, caseId: 'case_id', parentId: 'parent_id' },
  case_activity: { caseId: 'case_id' },
  audit_logs: { userId: 'user_id', userName: 'user_name' },
  config_history: { changedBy: 'changed_by' },
  case_types: { ...COMMON },
  case_stages: { createdAt: 'created_at' },
  env_vars: { ...COMMON, updatedBy: 'updated_by' },
  cause_list_templates: {},
  settings: { updatedAt: 'updated_at', updatedBy: 'updated_by' },
  envVars: { updatedAt: 'updated_at', updatedBy: 'updated_by' },
  schema_meta: { ...COMMON, appVersion: 'app_version', installedAt: 'installed_at' },
  case_statuses: { ...COMMON },
  priorities: { ...COMMON },
  bench_types: { ...COMMON },
  jurisdictions: { ...COMMON },
  court_hierarchy: { ...COMMON },
};

export function configureFieldMappings() {
  for (const [entity, mappings] of Object.entries(SCHEMAS)) {
    FieldMapper.setFieldMappings(entity, mappings);
  }
}

export default configureFieldMappings;
