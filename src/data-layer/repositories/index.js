// Repository registry — one uniform data-access object per collection. Services
// import from here; nothing below this layer is touched by services/logic/pages.
import { createRepository } from './baseRepository.js';
import { usersRepository } from './usersRepository.js';
import { rolesRepository } from './rolesRepository.js';
import { permissionsRepository } from './permissionsRepository.js';
import { casesRepository } from './casesRepository.js';
import { documentsRepository } from './documentsRepository.js';
import { settingsRepository } from './settingsRepository.js';
import { auditLogsRepository } from './auditLogsRepository.js';
import { draftsRepository } from './draftsRepository.js';
import { hearingsRepository } from './hearingsRepository.js';
import { notesRepository } from './notesRepository.js';
import { judgmentsRepository } from './judgmentsRepository.js';
import { orderSheetTemplatesRepository } from './orderSheetTemplatesRepository.js';
import { caseFoldersRepository } from './caseFoldersRepository.js';
import { caseHistoryRepository } from './caseHistoryRepository.js';
import { caseActivityRepository } from './caseActivityRepository.js';
import { caseStagesRepository } from './caseStagesRepository.js';
import { remindersRepository } from './remindersRepository.js';
import { envVarsRepository } from './envVarsRepository.js';
import { configHistoryRepository } from './configHistoryRepository.js';
import { schemaMetaRepository } from './schemaMetaRepository.js';
import { caseTypesRepository } from './caseTypesRepository.js';
import { courtsRepository } from './courtsRepository.js';
import { changelogReleasesRepository } from './changelogReleasesRepository.js';
import { changelogEntriesRepository } from './changelogEntriesRepository.js';

export const repositories = {
  changelog_releases: changelogReleasesRepository,
  changelog_entries: changelogEntriesRepository,
  schema_meta: schemaMetaRepository,
  users: usersRepository,
  roles: rolesRepository,
  permissions: permissionsRepository,
  cases: casesRepository,
  documents: documentsRepository,
  settings: settingsRepository,
  audit_logs: auditLogsRepository,
  drafts: draftsRepository,
  hearings: hearingsRepository,
  notes: notesRepository,
  judgments: judgmentsRepository,
  order_sheet_templates: orderSheetTemplatesRepository,
  case_folders: caseFoldersRepository,
  case_history: caseHistoryRepository,
  case_activity: caseActivityRepository,
  case_stages: caseStagesRepository,
  reminders: remindersRepository,
  env_vars: envVarsRepository,
  config_history: configHistoryRepository,
  case_types: caseTypesRepository,
  courts: courtsRepository,
};

// Fallback for any collection without a dedicated module.
export function getRepository(collection) {
  return repositories[collection] || createRepository(collection);
}

export {
  createRepository,
  usersRepository, rolesRepository, permissionsRepository, casesRepository,
  documentsRepository, settingsRepository, auditLogsRepository, draftsRepository,
  hearingsRepository, notesRepository, judgmentsRepository, orderSheetTemplatesRepository,
  caseFoldersRepository, caseHistoryRepository, caseActivityRepository, caseStagesRepository,
  remindersRepository, envVarsRepository, configHistoryRepository, schemaMetaRepository, caseTypesRepository, courtsRepository,
  changelogReleasesRepository, changelogEntriesRepository,
};

export default repositories;
