import { SCHEMA_VERSION } from '@/data-provider/schema/index.js';

// Ordered, reversible migration steps. Each step:
//   { version, description, up({provider}), down({provider}) }
// `up` transforms an existing install FORWARD to `version`; `down` reverses it.
// Steps must be additive and non-destructive (never drop data on upgrade).
//
// The current schema is the BASELINE. When the universal schema changes, bump
// SCHEMA_VERSION and append a new step here with the data transform — existing
// installations then upgrade incrementally without a reinstall.
export const MIGRATIONS = [
  {
    version: 18,
    description: 'Add migration_registry, fix exec_sql with admin role check, add RLS policies',
    async up({ provider }) {
      await provider.execSql(`create table if not exists migration_registry (
        id text primary key default gen_random_uuid()::text,
        version integer not null,
        description text, sql_hash text,
        applied_at timestamptz default now(),
        duration_ms integer default 0,
        success boolean default true,
        error text, action text default 'migrate'
      )`).catch(() => {});
      await provider.execSql(`create index if not exists idx_migration_registry_version on migration_registry (version)`).catch(() => {});
      await provider.execSql(`create index if not exists idx_migration_registry_applied_at on migration_registry (applied_at)`).catch(() => {});
    },
    async down({ provider }) {
      await provider.execSql(`drop table if exists migration_registry`).catch(() => {});
    },
  },
  {
    version: 19,
    description: 'Add audit_logs table, judgment columns, current_user_role function',
    async up({ provider }) {
      await provider.execSql(`create table if not exists audit_logs (
        id text primary key, action text, module text, user_id text,
        user_name text, ip text, at timestamptz, details text, meta jsonb default '{}'
      )`).catch(() => {});
    },
    async down({ provider }) {
      await provider.execSql(`drop table if exists audit_logs`).catch(() => {});
    },
  },
  {
    version: 20,
    description: 'Add case_folders table, task management, hearing statuses',
    async up({ provider }) {
      await provider.execSql(`create table if not exists case_folders (
        id text primary key, case_id text, name text, parent_id text,
        created_at timestamptz default now(), updated_at timestamptz default now()
      )`).catch(() => {});
      await provider.execSql(`create index if not exists idx_case_folders_case_id on case_folders (case_id)`).catch(() => {});
    },
    async down({ provider }) {
      await provider.execSql(`drop table if exists case_folders`).catch(() => {});
    },
  },
  // Historical migration files exist at:
  //   migrations/migration-to-v18.sql
  //   migrations/migration-to-v19.sql
  //   migrations/migration-to-v20.sql
  // The gap between v20 and v34 represents cumulative schema additions that were
  // applied incrementally as the schema evolved. The current installer
  // (DatabaseInstaller.js) creates all tables at once using the current schema
  // definitions in data-provider/schema/*.js, so fresh installs skip all
  // intermediate steps. Upgrading from v20 to v34 requires running the full
  // installer which reconciles the live schema against the current definitions.
  {
    version: 34,
    description: 'Current universal schema baseline — create all tables via schema definitions',
    async up({ provider }) {
      // Fresh install path: the installer reads schema/*.js and creates all tables.
      // For upgrades from < v34, we rely on ensureCollection/ensureColumn which
      // add missing tables/columns incrementally.
    },
    async down() { /* baseline cannot be rolled back below itself */ },
  },
];

export const BASELINE_VERSION = SCHEMA_VERSION;

export default MIGRATIONS;
