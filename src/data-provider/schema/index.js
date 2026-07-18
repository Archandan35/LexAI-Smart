// Universal Schema registry — the single source of truth for every entity.
// Provider-agnostic by design: no SDK, no provider-specific code. The migration
// engine reads this to create/validate tables & collections; the repository
// layer reads it for defaults/validation; the .udb exporter reads it to know
// which collections exist and how they relate.
//
// Every schema is automatically registered in the EntityRegistry at import
// time so the core engine knows about all entities.

import { EntityRegistry } from '@/core/EntityRegistry.js';

import { UsersSchema } from './users.schema.js';
import { RolesSchema } from './roles.schema.js';
import { PermissionsSchema } from './permissions.schema.js';
import { AuditLogsSchema } from './audit_logs.schema.js';
import { CasesSchema } from './cases.schema.js';
import { DocumentsSchema } from './documents.schema.js';
import { SettingsSchema } from './settings.schema.js';
import { DraftsSchema } from './drafts.schema.js';
import { HearingsSchema } from './hearings.schema.js';
import { NotesSchema } from './notes.schema.js';
import { JudgmentsSchema } from './judgments.schema.js';
import { OrderSheetTemplatesSchema } from './order_sheet_templates.schema.js';
import { CaseFoldersSchema } from './case_folders.schema.js';
import { CaseHistorySchema } from './case_history.schema.js';
import { CaseActivitySchema } from './case_activity.schema.js';
import { CaseStagesSchema } from './case_stages.schema.js';
import { RemindersSchema } from './reminders.schema.js';
import { EnvVarsSchema } from './env_vars.schema.js';
import { ConfigHistorySchema } from './config_history.schema.js';
import { SchemaMetaSchema } from './schema_meta.schema.js';
import { CaseTypesSchema } from './case_types.schema.js';
import { CourtsSchema } from './courts.schema.js';
import { BenchTypesSchema } from './bench_types.schema.js';
import { CauseListTemplatesSchema } from './cause_list_templates.schema.js';
import { JurisdictionsSchema } from './jurisdictions.schema.js';
import { ClientsSchema } from './clients.schema.js';
import { ContactsSchema } from './contacts.schema.js';
import { ActsSchema } from './acts.schema.js';
import { PromptsSchema } from './prompts.schema.js';
import { TemplatesSchema } from './templates.schema.js';
import { LegalNoticesSchema } from './legal_notices.schema.js';
import { ReportsSchema } from './reports.schema.js';
import { CaseStatusesSchema } from './case_statuses.schema.js';
import { PrioritiesSchema } from './priorities.schema.js';
import { HearingStatusesSchema } from './hearing_statuses.schema.js';
import { ContactTypesSchema } from './contact_types.schema.js';
import { FolderTemplatesSchema } from './folder_templates.schema.js';
import { DraftTypesSchema } from './draft_types.schema.js';
import { JudgesSchema } from './judges.schema.js';
import { ReminderTypesSchema } from './reminder_types.schema.js';
import { PartyTypesSchema } from './party_types.schema.js';
import { AreaOfLawSchema } from './area_of_law.schema.js';
import { TypeOfProceedingSchema } from './type_of_proceeding.schema.js';
import { NatureOfDisputeSchema } from './nature_of_dispute.schema.js';
import { ProvisionsSchema } from './provisions.schema.js';
import { TasksSchema } from './tasks.schema.js';
import { TaskCategoriesSchema } from './task_categories.schema.js';
import { TaskStatusesSchema } from './task_statuses.schema.js';

// Infrastructure schemas — registers system tables in EntityRegistry for
// schema diff/repair compatibility without making them visible to the installer.
import './infrastructure.schema.js';

// Order matters for installation: parents (referenced collections) first so that
// relations are satisfiable on backends that enforce them.
export const schemas = {
  schema_meta: SchemaMetaSchema,
  roles: RolesSchema,
  permissions: PermissionsSchema,
  users: UsersSchema,
  cases: CasesSchema,
  documents: DocumentsSchema,
  drafts: DraftsSchema,
  hearings: HearingsSchema,
  notes: NotesSchema,
  judgments: JudgmentsSchema,
  order_sheet_templates: OrderSheetTemplatesSchema,
  case_folders: CaseFoldersSchema,
  case_history: CaseHistorySchema,
  case_activity: CaseActivitySchema,
  case_stages: CaseStagesSchema,
  reminders: RemindersSchema,
  audit_logs: AuditLogsSchema,
  env_vars: EnvVarsSchema,
  config_history: ConfigHistorySchema,
  settings: SettingsSchema,
  case_types: CaseTypesSchema,
  courts: CourtsSchema,
  bench_types: BenchTypesSchema,
  cause_list_templates: CauseListTemplatesSchema,
  jurisdictions: JurisdictionsSchema,
  clients: ClientsSchema,
  contacts: ContactsSchema,
  acts: ActsSchema,
  prompts: PromptsSchema,
  templates: TemplatesSchema,
  legal_notices: LegalNoticesSchema,
  reports: ReportsSchema,
  case_statuses: CaseStatusesSchema,
  priorities: PrioritiesSchema,
  hearing_statuses: HearingStatusesSchema,
  contact_types: ContactTypesSchema,
  folder_templates: FolderTemplatesSchema,
  draft_types: DraftTypesSchema,
  judges: JudgesSchema,
  reminder_types: ReminderTypesSchema,
  party_types: PartyTypesSchema,
  area_of_law: AreaOfLawSchema,
  type_of_proceeding: TypeOfProceedingSchema,
  nature_of_dispute: NatureOfDisputeSchema,
  provisions: ProvisionsSchema,
  tasks: TasksSchema,
  task_categories: TaskCategoriesSchema,
  task_statuses: TaskStatusesSchema,
};

// Bumped whenever the universal schema shape changes. Mirrors SCHEMA_VERSION in
// backupLogic so a .udb can be checked against the running app.
export const SCHEMA_VERSION = 34;

// Every collection name known to the application.
export const collectionNames = Object.keys(schemas);

// The minimum install set created on a fresh provider (Phase 2 ensureSchema).
export const coreCollections = Object.values(schemas)
  .filter((s) => s.core)
  .map((s) => s.collection);

export function getSchema(collection) {
  return schemas[collection]
    || Object.values(schemas).find(s => s.collection === collection)
    || null;
}

export function listSchemas() {
  return Object.values(schemas);
}

// All declared relations across the schema (for .udb relationships.json).
export function relationships() {
  const out = [];
  for (const s of Object.values(schemas)) {
    (s.relations || []).forEach((r) => out.push({ from: s.collection, ...r }));
  }
  return out;
}

// Apply schema defaults to a record (used by the repository layer on create).
export function applyDefaults(collection, record = {}) {
  const s = schemas[collection];
  if (!s) return { ...record };
  const merged = { ...s.defaults, ...record };
  if (s.fields) {
    for (const [key, type] of Object.entries(s.fields)) {
      if (type === 'datetime' && merged[key] === '') {
        merged[key] = null;
      }
    }
  }
  return merged;
}

// Lightweight, provider-agnostic validation. Returns { valid, missing[] }.
export function validateRecord(collection, record = {}) {
  const s = schemas[collection];
  if (!s) return { valid: true, missing: [] };
  const missing = (s.required || []).filter((f) => {
    const v = record[f];
    return v === undefined || v === null || v === '';
  });
  return { valid: missing.length === 0, missing };
}

// Auto-register every schema in the EntityRegistry so core engines know
// about all entities without additional imports.
EntityRegistry.registerAll(schemas);

export default schemas;
