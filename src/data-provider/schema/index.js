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
import { AuditLogsSchema } from './auditLogs.schema.js';
import { CasesSchema } from './cases.schema.js';
import { DocumentsSchema } from './documents.schema.js';
import { SettingsSchema } from './settings.schema.js';
import { DraftsSchema } from './drafts.schema.js';
import { HearingsSchema } from './hearings.schema.js';
import { NotesSchema } from './notes.schema.js';
import { JudgmentsSchema } from './judgments.schema.js';
import { CauseListTemplatesSchema } from './causeListTemplates.schema.js';
import { CaseFoldersSchema } from './caseFolders.schema.js';
import { CaseHistorySchema } from './caseHistory.schema.js';
import { CaseActivitySchema } from './caseActivity.schema.js';
import { CaseStagesSchema } from './caseStages.schema.js';
import { RemindersSchema } from './reminders.schema.js';
import { EnvVarsSchema } from './envVars.schema.js';
import { ConfigHistorySchema } from './configHistory.schema.js';
import { SchemaMetaSchema } from './schemaMeta.schema.js';
import { CaseTypesSchema } from './caseTypes.schema.js';
import { CourtsSchema } from './courts.schema.js';

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
  causeListTemplates: CauseListTemplatesSchema,
  caseFolders: CaseFoldersSchema,
  caseHistory: CaseHistorySchema,
  caseActivity: CaseActivitySchema,
  caseStages: CaseStagesSchema,
  reminders: RemindersSchema,
  auditLogs: AuditLogsSchema,
  envVars: EnvVarsSchema,
  configHistory: ConfigHistorySchema,
  settings: SettingsSchema,
  caseTypes: CaseTypesSchema,
  courts: CourtsSchema,
};

// Bumped whenever the universal schema shape changes. Mirrors SCHEMA_VERSION in
// backupLogic so a .udb can be checked against the running app.
export const SCHEMA_VERSION = 17;

// Every collection name known to the application.
export const collectionNames = Object.keys(schemas);

// The minimum install set created on a fresh provider (Phase 2 ensureSchema).
export const coreCollections = Object.values(schemas)
  .filter((s) => s.core)
  .map((s) => s.collection);

export function getSchema(collection) {
  return schemas[collection] || null;
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
  return { ...s.defaults, ...record };
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
