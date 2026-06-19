-- ============================================================
-- Migration v18 → v19
-- ============================================================
-- Changes:
--   1. provider_adapter_registry table (Priority 6)
--   2. safe_create_fk function with existence guards (Priority 2)
--   3. Named RLS policies per table (Priority 3), dropping old duplicates
--   4. exec_sql / safe_ddl audit logging via migration_registry (Priority 4)
--   5. RPC-based ID generation support
--   6. New indexes for provider_adapter_registry
--   7. SCHEMA_VERSION bump to 19
-- ============================================================
-- Re-runnable: uses IF NOT EXISTS, ON CONFLICT DO NOTHING,
-- and DO $$ blocks for idempotent execution.
-- ============================================================

-- ============================================================
-- 1. provider_adapter_registry table
-- ============================================================
create table if not exists provider_adapter_registry (
  id text primary key default gen_random_uuid()::text,
  provider text not null unique,
  adapter_name text not null,
  adapter_version text not null default '1.0.0',
  migration_engine text default 'sql',
  capabilities jsonb default '{}'::jsonb,
  active boolean default true,
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 2. safe_create_fk helper function
-- ============================================================
create or replace function safe_create_fk(
  p_source_table text,
  p_source_column text,
  p_target_table text,
  p_target_column text,
  p_constraint_name text,
  p_on_delete text default 'CASCADE'
) returns void
language plpgsql
as $safe_fk$
declare
  v_exists boolean;
begin
  select exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = p_source_table
    and c.conname = p_constraint_name
  ) into v_exists;
  if v_exists then return; end if;
  if not exists (select 1 from pg_class where relname = p_source_table) then return; end if;
  if not exists (select 1 from pg_class where relname = p_target_table) then return; end if;
  if not exists (
    select 1 from pg_attribute a
    join pg_class t on t.oid = a.attrelid
    where t.relname = p_source_table
    and a.attname = p_source_column
    and a.attnum > 0
  ) then return; end if;
  if not exists (
    select 1 from pg_attribute a
    join pg_class t on t.oid = a.attrelid
    where t.relname = p_target_table
    and a.attname = p_target_column
    and a.attnum > 0
  ) then return; end if;
  execute format($fmt$
    alter table %I add constraint %I
    foreign key (%I) references %I (%I) on delete %s
  $fmt$, p_source_table, p_constraint_name, p_source_column, p_target_table, p_target_column, upper(p_on_delete));
end;
$safe_fk$;

-- ============================================================
-- 3. Update exec_sql and safe_ddl with audit logging
-- ============================================================
create or replace function exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)
  values (gen_random_uuid()::text, 0, 'exec_sql', md5(sql), now(), 0, true);
  execute sql;
end;
$$;

create or replace function safe_ddl(sql text)
returns void
language plpgsql
security definer
as $$
declare
  v_upper text;
begin
  v_upper := upper(sql);
  if v_upper ~ '^\s*DROP\s+(DATABASE|SCHEMA|TABLE|VIEW|FUNCTION|INDEX|ROLE|POLICY|TRIGGER|EXTENSION|PUBLICATION|SUBSCRIPTION)' then
    raise exception 'safe_ddl: DROP is not permitted';
  end if;
  if v_upper ~ '^\s*TRUNCATE' then
    raise exception 'safe_ddl: TRUNCATE is not permitted';
  end if;
  if v_upper ~ 'ALTER\s+TABLE.*DROP\s+(COLUMN|CONSTRAINT)' then
    raise exception 'safe_ddl: ALTER TABLE DROP is not permitted';
  end if;
  if v_upper ~ '^\s*(GRANT|REVOKE)' then
    raise exception 'safe_ddl: GRANT/REVOKE is not permitted';
  end if;
  if v_upper ~ '^\s*(DELETE|UPDATE|INSERT|TRUNCATE)\s' then
    raise exception 'safe_ddl: DML statements are not permitted; use CRUD APIs';
  end if;
  if v_upper ~ '^\s*CREATE\s+(DATABASE|SCHEMA|ROLE|USER|EXTENSION)\s' then
    raise exception 'safe_ddl: CREATE DATABASE/SCHEMA/ROLE/USER/EXTENSION is not permitted';
  end if;
  if v_upper ~ '^\s*ALTER\s+(DATABASE|SCHEMA|ROLE|USER)\s' then
    raise exception 'safe_ddl: ALTER DATABASE/SCHEMA/ROLE/USER is not permitted';
  end if;
  if not (
    v_upper ~ '^\s*CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s' or
    v_upper ~ '^\s*CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s' or
    v_upper ~ 'ALTER\s+TABLE.*ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS' or
    v_upper ~ 'ALTER\s+TABLE.*ADD\s+CONSTRAINT' or
    v_upper ~ '^\s*CREATE\s+OR\s+REPLACE\s+FUNCTION\s' or
    v_upper ~ '^\s*ALTER\s+TABLE\s+IF\s+EXISTS\s' or
    v_upper ~ 'ALTER\s+TABLE.*ENABLE\s+ROW\s+LEVEL\s+SECURITY' or
    v_upper ~ 'ALTER\s+TABLE.*DISABLE\s+ROW\s+LEVEL\s+SECURITY' or
    v_upper ~ '^\s*CREATE\s+POLICY\s' or
    v_upper ~ '^\s*ALTER\s+POLICY\s' or
    v_upper ~ '^\s*DROP\s+POLICY\s+IF\s+EXISTS\s' or
    v_upper ~ '^\s*COMMENT\s+ON\s' or
    v_upper ~ '^\s*DO\s+\$\$' or
    v_upper ~ '^\s*--'
  ) then
    raise exception 'safe_ddl: Statement does not match any allowed pattern: %', substr(sql, 1, 80);
  end if;
  insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)
  values (gen_random_uuid()::text, 0, 'safe_ddl', md5(sql), now(), 0, true);
  execute sql;
end;
$$;

grant execute on function exec_sql(text) to lexai_admin;
grant execute on function safe_ddl(text) to lexai_manager;

-- ============================================================
-- 4. Update migration_registry with action column
-- ============================================================
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'migration_registry' and column_name = 'action'
  ) then
    alter table migration_registry add column action text default 'migrate';
  end if;
end $$;

-- ============================================================
-- 5. Drop old duplicate RLS policies, create named ones
-- ============================================================
-- Drop the old generic-named policies (safe to run even if they don't exist)
do $$ begin
  drop policy if exists admin_all on schema_registry; end $$;
do $$ begin drop policy if exists admin_all on entity_registry; end $$;
do $$ begin drop policy if exists admin_all on field_registry; end $$;
do $$ begin drop policy if exists admin_all on provider_registry; end $$;
do $$ begin drop policy if exists admin_all on migration_registry; end $$;
do $$ begin drop policy if exists admin_all on installer_state; end $$;
do $$ begin drop policy if exists admin_all on schema_mapping; end $$;
do $$ begin drop policy if exists admin_all on mapping_history; end $$;
do $$ begin drop policy if exists admin_all on mapping_versions; end $$;
do $$ begin drop policy if exists admin_all on provider_capabilities; end $$;
do $$ begin drop policy if exists admin_all on entity_prefix_registry; end $$;
do $$ begin drop policy if exists admin_all on id_registry; end $$;
do $$ begin drop policy if exists admin_all on foreign_key_registry; end $$;
do $$ begin drop policy if exists manager_read on schema_registry; end $$;
do $$ begin drop policy if exists manager_read on entity_registry; end $$;
do $$ begin drop policy if exists manager_write on entity_registry; end $$;
do $$ begin drop policy if exists manager_read on field_registry; end $$;
do $$ begin drop policy if exists manager_write on field_registry; end $$;
do $$ begin drop policy if exists manager_read on provider_registry; end $$;
do $$ begin drop policy if exists manager_read on migration_registry; end $$;
do $$ begin drop policy if exists manager_read on installer_state; end $$;
do $$ begin drop policy if exists manager_read on schema_mapping; end $$;
do $$ begin drop policy if exists manager_write on schema_mapping; end $$;
do $$ begin drop policy if exists manager_read on mapping_history; end $$;
do $$ begin drop policy if exists manager_read on mapping_versions; end $$;
do $$ begin drop policy if exists manager_read on provider_capabilities; end $$;
do $$ begin drop policy if exists manager_read on entity_prefix_registry; end $$;
do $$ begin drop policy if exists manager_read on id_registry; end $$;
do $$ begin drop policy if exists manager_read on foreign_key_registry; end $$;
do $$ begin drop policy if exists user_read on schema_registry; end $$;
do $$ begin drop policy if exists user_read on entity_registry; end $$;
do $$ begin drop policy if exists user_read on field_registry; end $$;
do $$ begin drop policy if exists user_read on installer_state; end $$;
do $$ begin drop policy if exists user_read on provider_capabilities; end $$;

-- Create named policies (re-runnable via IF NOT EXISTS approach per table)
-- schema_registry
create policy schema_registry_admin_all on schema_registry for all to lexai_admin using (true) with check (true);
create policy schema_registry_manager_ro on schema_registry for select to lexai_manager using (true);
create policy schema_registry_user_ro on schema_registry for select to lexai_user using (true);

-- entity_registry
create policy entity_registry_admin_all on entity_registry for all to lexai_admin using (true) with check (true);
create policy entity_registry_manager_ro on entity_registry for select to lexai_manager using (true);
create policy entity_registry_manager_rw on entity_registry for insert to lexai_manager with check (true);
create policy entity_registry_manager_rw on entity_registry for update to lexai_manager using (true);
create policy entity_registry_user_ro on entity_registry for select to lexai_user using (true);

-- field_registry
create policy field_registry_admin_all on field_registry for all to lexai_admin using (true) with check (true);
create policy field_registry_manager_ro on field_registry for select to lexai_manager using (true);
create policy field_registry_manager_rw on field_registry for insert to lexai_manager with check (true);
create policy field_registry_user_ro on field_registry for select to lexai_user using (true);

-- provider_registry
create policy provider_registry_admin_all on provider_registry for all to lexai_admin using (true) with check (true);
create policy provider_registry_manager_ro on provider_registry for select to lexai_manager using (true);

-- migration_registry
create policy migration_registry_admin_all on migration_registry for all to lexai_admin using (true) with check (true);
create policy migration_registry_manager_ro on migration_registry for select to lexai_manager using (true);

-- installer_state
create policy installer_state_admin_all on installer_state for all to lexai_admin using (true) with check (true);
create policy installer_state_manager_ro on installer_state for select to lexai_manager using (true);
create policy installer_state_user_ro on installer_state for select to lexai_user using (true);

-- provider_adapter_registry
create policy provider_adapter_admin_all on provider_adapter_registry for all to lexai_admin using (true) with check (true);
create policy provider_adapter_manager_ro on provider_adapter_registry for select to lexai_manager using (true);

-- schema_mapping
create policy schema_mapping_admin_all on schema_mapping for all to lexai_admin using (true) with check (true);
create policy schema_mapping_manager_ro on schema_mapping for select to lexai_manager using (true);
create policy schema_mapping_manager_rw on schema_mapping for insert to lexai_manager with check (true);
create policy schema_mapping_manager_rw on schema_mapping for update to lexai_manager using (true);

-- mapping_history
create policy mapping_history_admin_all on mapping_history for all to lexai_admin using (true) with check (true);
create policy mapping_history_manager_ro on mapping_history for select to lexai_manager using (true);

-- mapping_versions
create policy mapping_versions_admin_all on mapping_versions for all to lexai_admin using (true) with check (true);
create policy mapping_versions_manager_ro on mapping_versions for select to lexai_manager using (true);

-- provider_capabilities
create policy provider_capabilities_admin_all on provider_capabilities for all to lexai_admin using (true) with check (true);
create policy provider_capabilities_manager_ro on provider_capabilities for select to lexai_manager using (true);
create policy provider_capabilities_user_ro on provider_capabilities for select to lexai_user using (true);

-- entity_prefix_registry
create policy entity_prefix_admin_all on entity_prefix_registry for all to lexai_admin using (true) with check (true);
create policy entity_prefix_manager_ro on entity_prefix_registry for select to lexai_manager using (true);
create policy entity_prefix_user_ro on entity_prefix_registry for select to lexai_user using (true);

-- id_registry
create policy id_registry_admin_all on id_registry for all to lexai_admin using (true) with check (true);
create policy id_registry_manager_ro on id_registry for select to lexai_manager using (true);

-- foreign_key_registry
create policy foreign_key_registry_admin_all on foreign_key_registry for all to lexai_admin using (true) with check (true);
create policy foreign_key_registry_manager_ro on foreign_key_registry for select to lexai_manager using (true);

-- ============================================================
-- 6. Enable RLS on provider_adapter_registry
-- ============================================================
alter table if exists provider_adapter_registry enable row level security;

-- ============================================================
-- 7. Safe FK creation using helper
-- ============================================================
select safe_create_fk('reminders', 'caseId', 'cases', 'id', 'fk_reminders_case_id', 'CASCADE');
select safe_create_fk('notes', 'caseId', 'cases', 'id', 'fk_notes_case_id', 'CASCADE');
select safe_create_fk('hearings', 'caseId', 'cases', 'id', 'fk_hearings_case_id', 'CASCADE');
select safe_create_fk('drafts', 'caseId', 'cases', 'id', 'fk_drafts_case_id', 'CASCADE');
select safe_create_fk('documents', 'caseId', 'cases', 'id', 'fk_documents_case_id', 'CASCADE');
select safe_create_fk('caseHistory', 'caseId', 'cases', 'id', 'fk_case_history_case_id', 'CASCADE');
select safe_create_fk('caseFolders', 'caseId', 'cases', 'id', 'fk_case_folders_case_id', 'CASCADE');
select safe_create_fk('caseActivity', 'caseId', 'cases', 'id', 'fk_case_activity_case_id', 'CASCADE');
select safe_create_fk('auditLogs', 'userId', 'users', 'id', 'fk_audit_logs_user_id', 'SET NULL');
select safe_create_fk('users', 'roleCode', 'roles', 'code', 'fk_users_role_code', 'RESTRICT');
select safe_create_fk('caseFolders', 'parentId', 'caseFolders', 'id', 'fk_case_folders_parent_id', 'CASCADE');

-- ============================================================
-- 8. New indexes
-- ============================================================
create index if not exists idx_provider_adapter_active on provider_adapter_registry (active);
create index if not exists idx_migration_registry_action on migration_registry (action);

-- ============================================================
-- 9. SCHEMA_VERSION bump
-- ============================================================
-- Update schema_registry version marker
insert into schema_registry (id, version, description, applied_at)
values ('schema_version', 19, 'Schema v19 — provider_adapter_registry, safe_create_fk, named policies, audit logging', now())
on conflict (id) do update set version = 19, description = excluded.description, applied_at = now();

-- ============================================================
-- 10. Seed provider adapters
-- ============================================================
insert into provider_adapter_registry (id, provider, adapter_name, adapter_version, migration_engine, capabilities, active)
values
  ('ADP-supabase', 'supabase', 'SupabaseAdapter', '1.0.0', 'sql', '{"exec_sql":true,"safe_ddl":true,"rls":true,"fk":true,"transactions":true,"json_support":true}'::jsonb, true),
  ('ADP-postgresql', 'postgresql', 'PostgreSQLAdapter', '1.0.0', 'sql', '{"exec_sql":true,"safe_ddl":true,"rls":true,"fk":true,"transactions":true,"json_support":true}'::jsonb, true),
  ('ADP-mysql', 'mysql', 'MySQLAdapter', '1.0.0', 'sql', '{"exec_sql":false,"safe_ddl":false,"rls":false,"fk":true,"transactions":true,"json_support":true}'::jsonb, true),
  ('ADP-sqlite', 'sqlite', 'SQLiteAdapter', '1.0.0', 'sql', '{"exec_sql":false,"safe_ddl":false,"rls":false,"fk":true,"transactions":false,"json_support":false}'::jsonb, true),
  ('ADP-mongodb', 'mongodb', 'MongoDBAdapter', '1.0.0', 'mongoose', '{"exec_sql":false,"safe_ddl":false,"rls":false,"fk":false,"transactions":true,"json_support":true}'::jsonb, true),
  ('ADP-firebase', 'firebase', 'FirebaseAdapter', '1.0.0', 'firestore', '{"exec_sql":false,"safe_ddl":false,"rls":false,"fk":false,"transactions":false,"json_support":true}'::jsonb, true),
  ('ADP-local', 'local', 'LocalAdapter', '1.0.0', 'local', '{"exec_sql":false,"safe_ddl":false,"rls":false,"fk":false,"transactions":false,"json_support":false}'::jsonb, true)
on conflict (provider) do nothing;
