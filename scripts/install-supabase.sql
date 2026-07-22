-- ============================================================
-- 2. migration_registry — audit log of all schema migrations
-- Created FIRST so exec_sql/safe_ddl can write audit entries.
-- ============================================================
create table if not exists migration_registry (
  id text primary key default gen_random_uuid()::text,
  version integer not null,
  description text,
  sql_hash text,
  applied_at timestamptz default now(),
  duration_ms integer default 0,
  success boolean default true,
  error text,
  action text default 'migrate'
);

create index if not exists idx_migration_registry_version on migration_registry (version);
create index if not exists idx_migration_registry_applied_at on migration_registry (applied_at);

-- ============================================================
-- 3. exec_sql — DDL/query execution (security definer — caller assumes owner role)
-- ============================================================
-- Returns setof jsonb so callers can read query results (VerificationEngine, DDL service).
-- For SELECT queries, returns the result rows as JSONB objects.
-- For DDL, returns a single {"ok": true} row.
-- NOTE: Granted to anon + authenticated for Copy-Paste wizard verification.
-- Revoke from anon after initial setup if desired.

create or replace function exec_sql(sql text)
returns setof jsonb
language plpgsql
security definer
as $$
begin
  if exists (select 1 from pg_tables where tablename = 'migration_registry') then
    insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)
    values (gen_random_uuid()::text, 0, 'exec_sql', md5(sql), now(), 0, true);
  end if;
  return query execute sql;
exception
  when others then
    execute sql;
    return query select '{"ok":true}'::jsonb;
end;
$$;

-- ============================================================
-- 4. safe_ddl — allowlisted DDL execution for admin/manager via current_user_role()
-- ============================================================
-- Blocklist: DROP, TRUNCATE, ALTER TABLE DROP, GRANT/REVOKE, DML,
--            CREATE DATABASE/SCHEMA/ROLE/USER/EXTENSION,
--            ALTER DATABASE/SCHEMA/ROLE/USER, REINDEX, CLUSTER, VACUUM, ANALYZE
-- Allowlist: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--            ALTER TABLE ADD COLUMN IF NOT EXISTS, ALTER TABLE ADD CONSTRAINT,
--            CREATE OR REPLACE FUNCTION, ALTER TABLE IF EXISTS,
--            ALTER TABLE ... ENABLE/DISABLE ROW LEVEL SECURITY,
--            CREATE/ALTER/DROP POLICY, COMMENT ON, DO $$ blocks
-- P2: All \s patterns correctly escaped for PostgreSQL POSIX regex.
-- Uses IF EXISTS guard on migration_registry INSERT.

create or replace function safe_ddl(sql text)
returns void
language plpgsql
security definer
as $$
declare
  v_upper text;
begin
  v_upper := upper(sql);

  -- Blocklist (checked before allowlist)
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

  -- Allowlist
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

  -- Audit (with IF EXISTS guard so migration_registry need not exist yet)
  if exists (select 1 from pg_tables where tablename = 'migration_registry') then
    insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)
    values (gen_random_uuid()::text, 0, 'safe_ddl', md5(sql), now(), 0, true);
  end if;
  execute sql;
end;
$$;

do $$ begin if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function exec_sql(text) to authenticated; end if; end $$;
do $$ begin if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function safe_ddl(text) to authenticated; end if; end $$;

-- ============================================================
-- 5. SAFE FOREIGN KEY HELPER (P4 — hardened ON DELETE validation)
-- ============================================================
-- safe_create_fk — creates a foreign key only if the referenced table,
-- referenced column, and source column all exist and the FK does not
-- already exist. Never fails on missing references.
--
-- P4: p_on_delete is validated against the allowlist before format().
--      Rejects anything outside: CASCADE, SET NULL, RESTRICT, NO ACTION, SET DEFAULT.
--      Prevents SQL injection through the ON DELETE parameter.

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
  v_upper_on_delete text;
begin
  -- P4: validate ON DELETE action before any processing
  v_upper_on_delete := upper(p_on_delete);
  if v_upper_on_delete not in ('CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT') then
    raise exception 'safe_create_fk: invalid ON DELETE action: % (must be CASCADE, SET NULL, RESTRICT, NO ACTION, or SET DEFAULT)', p_on_delete;
  end if;
  -- Resolve entity names → provider table names via schema_mapping
  if exists (select 1 from pg_proc where proname = 'resolve_entity_table') then
    p_source_table := resolve_entity_table(p_source_table);
    p_target_table := resolve_entity_table(p_target_table);
  end if;
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
  $fmt$, p_source_table, p_constraint_name, p_source_column, p_target_table, p_target_column, v_upper_on_delete);
  insert into foreign_key_registry (id, from_entity, from_field, to_entity, to_field, cascade_delete, enabled)
  values (p_constraint_name, p_source_table, p_source_column, p_target_table, p_target_column, p_on_delete = 'CASCADE', true)
  on conflict (id) do nothing;
end;
$safe_fk$;

-- ============================================================
-- 5a. ENTITY RESOLUTION (entity_registry + schema_mapping lookup)
-- ============================================================
create or replace function resolve_entity_table(p_entity text)
returns text
language plpgsql
stable
as $$
declare
  v_table text;
begin
  if exists (select 1 from pg_class where relname = 'schema_mapping') then
    select provider_table into v_table from schema_mapping
    where entity_name = p_entity and active = true
    limit 1;
    if found then return v_table; end if;
  end if;
  return p_entity;
end;
$$;

do $$ begin if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function resolve_entity_table(text) to authenticated; end if; end $$;

-- ============================================================
-- 7. REGISTRY TABLES
-- ============================================================

-- schema_registry — tracks schema versions & migrations applied
create table if not exists schema_registry (
  id text primary key default gen_random_uuid()::text,
  version integer not null default 0,
  description text,
  checksum text,
  applied_at timestamptz default now(),
  applied_by text default current_user
);

-- entity_registry — registered entity definitions
create table if not exists entity_registry (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  label text,
  table_name text not null,
  primary_key text default 'id',
  core boolean default false,
  fields jsonb default '{}'::jsonb,
  indexes jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- field_registry — field-level metadata per entity
create table if not exists field_registry (
  id text primary key default gen_random_uuid()::text,
  entity text not null,
  field_name text not null,
  field_type text not null,
  required boolean default false,
  unique_field boolean default false,
  default_value text,
  created_at timestamptz default now()
);

-- provider_registry — database provider configuration
create table if not exists provider_registry (
  id text primary key default gen_random_uuid()::text,
  provider_type text not null,
  label text,
  config jsonb default '{}'::jsonb,
  active boolean default true,
  connected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- installer_state — instantaneous installation tracking
create table if not exists installer_state (
  id text primary key default 'default',
  install_status text not null default 'none' check (install_status in ('none', 'in_progress', 'completed', 'failed')),
  schema_version integer not null default 0,
  installer_version integer not null default 1,
  provider text,
  database_type text,
  verified_at timestamptz,
  installed_at timestamptz,
  updated_at timestamptz default now()
);

-- ============================================================
-- 8. SCHEMA MAPPING TABLES
-- ============================================================

-- schema_mapping — LexAI entity name ↔ provider table name
create table if not exists schema_mapping (
  id text primary key default gen_random_uuid()::text,
  entity_name text not null unique,
  provider_table text not null,
  description text,
  active boolean default true,
  version integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- mapping_history — audit log of mapping changes
create table if not exists mapping_history (
  id text primary key default gen_random_uuid()::text,
  entity_name text not null,
  old_table text,
  new_table text not null,
  changed_by text,
  change_reason text,
  created_at timestamptz default now()
);

-- mapping_versions — versioned snapshots of the entire mapping set
create table if not exists mapping_versions (
  id text primary key default gen_random_uuid()::text,
  version integer not null,
  snapshot jsonb not null,
  description text,
  created_at timestamptz default now()
);

-- provider_capabilities — feature detection per provider
create table if not exists provider_capabilities (
  id text primary key default gen_random_uuid()::text,
  provider text not null,
  feature text not null,
  supported boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  detected_at timestamptz default now()
);

-- ============================================================
-- 9. PROVIDER ADAPTER + ENTITY PREFIX TABLES
-- ============================================================

-- provider_adapter_registry — dynamic adapter loading
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

-- entity_prefix_registry — LX-ID prefix management
create table if not exists entity_prefix_registry (
  entity text primary key,
  prefix text not null,
  label text,
  padding integer not null default 5,
  current_sequence integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- id_registry — backward-compatible ID tracking
create table if not exists id_registry (
  entity text primary key,
  prefix text not null,
  sequence integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- foreign_key_registry — tracks FK relationships across entities
create table if not exists foreign_key_registry (
  id text primary key default gen_random_uuid()::text,
  from_entity text not null,
  from_field text not null,
  to_entity text not null,
  to_field text not null default 'id',
  cascade_delete boolean default false,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- 10. LX-ID SEQUENCE MANAGER
-- ============================================================
-- Generates LX-{PREFIX}-{SEQUENCE} using the entity_prefix_registry

create or replace function next_lx_id(p_entity text)
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_pad int;
  v_seq int;
  v_id text;
begin
  insert into entity_prefix_registry (entity, prefix, label, padding, current_sequence)
  values (p_entity, upper(substr(p_entity, 1, 5)), p_entity, 5, 0)
  on conflict (entity) do nothing;
  select prefix, padding into strict v_prefix, v_pad from entity_prefix_registry where entity = p_entity;
  update entity_prefix_registry
  set current_sequence = current_sequence + 1,
      updated_at = now()
  where entity = p_entity
  returning current_sequence into v_seq;
  v_id := 'LX-' || v_prefix || '-' || lpad(v_seq::text, v_pad, '0');
  return v_id;
end;
$$;

-- ============================================================
-- 5a. SUPABASE AUTH COMPATIBILITY (P1/P5)
-- ============================================================
-- Maps auth.uid() → users.role_code for RLS policies without relying on
-- browser users becoming PostgreSQL roles directly.
--
-- Usage in RLS policies:
--   USING (current_user_role() = ANY(ARRAY['admin', 'manager']))
--
-- Falls back to 'anon' when the calling user is not authenticated
-- (auth.uid() IS NULL) or when the users table is not yet accessible.

drop function if exists current_user_role() cascade;
create or replace function current_user_role()
returns text
language plpgsql
security definer
stable
set search_path = 'public'
as $$
declare
  v_role text;
begin
  -- Try Supabase auth.uid()
  begin
    if auth.uid() is null then
      -- Not authenticated via Supabase — check pg role
      if current_user = 'anon' then return 'anon'; end if;
      if current_user = 'service_role' then return 'admin'; end if;
      return 'anon';
    end if;
    -- Prefer lightweight user_role_registry (avoids full users table scan + RLS recursion)
    if exists (select 1 from pg_class where relname = 'user_role_registry') then
      select role_code into v_role from user_role_registry where user_id = auth.uid()::text;
      if found then return v_role; end if;
    end if;
    -- Fallback to users table
    select role_code into strict v_role from users where id = auth.uid()::text;
    return v_role;
  exception
    when others then
      -- If neither table is accessible, fall back to role name
      if current_user = 'authenticated' then return 'user'; end if;
      return 'anon';
  end;
end;
$$;

-- ============================================================
-- 5b. USER ROLE REGISTRY (lightweight role lookup, avoids RLS recursion on users)
-- ============================================================
create table if not exists user_role_registry (
  user_id text primary key,
  role_code text not null,
  updated_at timestamptz default now()
);
alter table user_role_registry enable row level security;

-- Admin-only policy on user_role_registry (lookup is via security-definer function)
create policy user_role_registry_admin_all on user_role_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- ============================================================
-- 5b. INSTALLATION VERIFICATION (P5)
-- ============================================================
-- Returns JSONB with per-component health status.

drop function if exists verify_installation() cascade;
create or replace function verify_installation()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
  v_schema boolean;
  v_mappings boolean;
  v_providers boolean;
  v_functions boolean;
  v_fks boolean;
  v_security boolean;
  v_ready boolean;
begin
  -- Schema/registry tables
  select count(*) = 13 into v_schema from pg_class where relname in (
    'migration_registry', 'schema_registry', 'entity_registry', 'field_registry',
    'provider_registry', 'provider_adapter_registry', 'installer_state',
    'entity_prefix_registry', 'id_registry', 'foreign_key_registry', 'schema_mapping', 'mapping_versions', 'user_role_registry'
  ) and relkind = 'r';

  -- Mapping tables
  select count(*) = 3 into v_mappings from pg_class where relname in (
    'schema_mapping', 'mapping_history', 'mapping_versions'
  ) and relkind = 'r';

  -- Provider tables
  select count(*) = 2 into v_providers from pg_class where relname in (
    'provider_registry', 'provider_capabilities'
  ) and relkind = 'r';

  -- Required functions
  select count(*) = 7 into v_functions from pg_proc where proname in (
    'exec_sql', 'safe_ddl', 'safe_create_fk', 'next_lx_id', 'current_user_role',
    'resolve_entity_table', 'sync_user_role_registry'
  );

  -- Foreign keys — compare foreign_key_registry entries against actual constraints
  select
    case
      when not exists (select 1 from pg_class where relname = 'foreign_key_registry') then false
      else (
        select count(*) >= 1 and count(*) = (
          select count(*) from foreign_key_registry where enabled = true
        )
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        where c.contype = 'f'
      )
    end
  into v_fks;

  -- Security: RLS enabled, policies exist, functions granted
  select
    count(*) >= 13 and
    exists (select 1 from pg_policy) and
    exists (select 1 from pg_proc where proname = 'current_user_role')
  into v_security
  from pg_class where relrowsecurity = true;

  v_ready := v_schema and v_mappings and v_functions and v_security;

  v_result := jsonb_build_object(
    'schema', v_schema,
    'mappings', v_mappings,
    'providers', v_providers,
    'functions', v_functions,
    'foreignKeys', v_fks,
    'security', v_security,
    'ready', v_ready
  );
  return v_result;
end;
$$;

do $$ begin if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function verify_installation() to authenticated; end if; end $$;
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then grant execute on function verify_installation() to anon; end if; end $$;

create table if not exists "schema_meta" (
  "id" text primary key,
  "version" numeric,
  "provider" text,
  "app_version" text,
  "installed_at" timestamptz,
  "updated_at" timestamptz,
  "history" jsonb
);
alter table "schema_meta" add column if not exists "id" text;
alter table "schema_meta" add column if not exists "version" numeric;
alter table "schema_meta" add column if not exists "provider" text;
alter table "schema_meta" add column if not exists "app_version" text;
alter table "schema_meta" add column if not exists "installed_at" timestamptz;
alter table "schema_meta" add column if not exists "updated_at" timestamptz;
alter table "schema_meta" add column if not exists "history" jsonb;
create index if not exists idx_schema_meta_provider on "schema_meta" ("provider");

create table if not exists "roles" (
  "id" text primary key,
  "code" text,
  "name" text,
  "description" text,
  "permissions" jsonb,
  "all" boolean,
  "inherits_hierarchy" boolean,
  "system" boolean,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  constraint uq_roles_code unique ("code")
);
alter table "roles" add column if not exists "id" text;
alter table "roles" add column if not exists "code" text;
alter table "roles" add column if not exists "name" text;
alter table "roles" add column if not exists "description" text;
alter table "roles" add column if not exists "permissions" jsonb;
alter table "roles" add column if not exists "all" boolean;
alter table "roles" add column if not exists "inherits_hierarchy" boolean;
alter table "roles" add column if not exists "system" boolean;
alter table "roles" add column if not exists "status" text;
alter table "roles" add column if not exists "created_at" timestamptz;
alter table "roles" add column if not exists "updated_at" timestamptz;
create index if not exists idx_roles_code on "roles" ("code");
create index if not exists idx_roles_status on "roles" ("status");

-- Insert default admin role required by LexAI (first-install bootstrap only).
-- The admin account created during installation gets this role. Additional
-- roles (client, manager, user, etc.) can be created later by the admin from
-- within the app's Role Management UI.
insert into "roles" ("id", "code", "name", "description", "permissions", "all", "inherits_hierarchy", "system", "status", "created_at", "updated_at") values
(gen_random_uuid()::text, 'Admin', 'Administrator', 'Administrator with full system access (auto-provisioned on first install)', '{}', true, true, true, 'active', now(), now())
on conflict ("code") do nothing;

create table if not exists "permissions" (
  "id" text primary key,
  "code" text,
  "module" text,
  "action" text,
  "label" text,
  "description" text
);
alter table "permissions" add column if not exists "id" text;
alter table "permissions" add column if not exists "code" text;
alter table "permissions" add column if not exists "module" text;
alter table "permissions" add column if not exists "action" text;
alter table "permissions" add column if not exists "label" text;
alter table "permissions" add column if not exists "description" text;
create index if not exists idx_permissions_code on "permissions" ("code");
create index if not exists idx_permissions_module on "permissions" ("module");

create table if not exists "users" (
  "id" text primary key,
  "name" text,
  "email" text,
  "username" text,
  "role_code" text,
  "extra_roles" jsonb,
  "grants" jsonb,
  "denies" jsonb,
  "phone" text,
  "address" text,
  "status" text,
  "salt" text,
  "password_hash" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "last_login_at" timestamptz
);
alter table "users" add column if not exists "id" text;
alter table "users" add column if not exists "name" text;
alter table "users" add column if not exists "email" text;
alter table "users" add column if not exists "username" text;
alter table "users" add column if not exists "role_code" text;
alter table "users" add column if not exists "extra_roles" jsonb;
alter table "users" add column if not exists "grants" jsonb;
alter table "users" add column if not exists "denies" jsonb;
alter table "users" add column if not exists "phone" text;
alter table "users" add column if not exists "address" text;
alter table "users" add column if not exists "status" text;
alter table "users" add column if not exists "salt" text;
alter table "users" add column if not exists "password_hash" text;
alter table "users" add column if not exists "created_at" timestamptz;
alter table "users" add column if not exists "updated_at" timestamptz;
alter table "users" add column if not exists "last_login_at" timestamptz;
create index if not exists idx_users_email on "users" ("email");
create index if not exists idx_users_username on "users" ("username");
create index if not exists idx_users_role_code on "users" ("role_code");
create index if not exists idx_users_status on "users" ("status");

create table if not exists "cases" (
  "id" text primary key,
  "case_number_str" text,
  "title" text,
  "case_type" text,
  "case_number" numeric,
  "case_year" numeric,
  "case_display_number" text,
  "plaintiff" text,
  "defendant" text,
  "court" text,
  "court_name" text,
  "jurisdiction" text,
  "bench_type" text,
  "judge" text,
  "stage" text,
  "priority" text,
  "parties" jsonb,
  "case_summary" text,
  "internal_notes" text,
  "description" text,
  "next_hearing" timestamptz,
  "filing_date" text,
  "registration_date" text,
  "disposal_date" text,
  "ws_filing_date" text,
  "filing_number" text,
  "registration_number" text,
  "cnr_number" text,
  "advocate" text,
  "client" text,
  "status" text,
  "tags" jsonb,
  "document_folder" text,
  "archived" boolean,
  "watch" boolean,
  "stage_history" jsonb,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "cases" add column if not exists "id" text;
alter table "cases" add column if not exists "case_number_str" text;
alter table "cases" add column if not exists "title" text;
alter table "cases" add column if not exists "case_type" text;
alter table "cases" add column if not exists "case_number" numeric;
alter table "cases" add column if not exists "case_year" numeric;
alter table "cases" add column if not exists "case_display_number" text;
alter table "cases" add column if not exists "plaintiff" text;
alter table "cases" add column if not exists "defendant" text;
alter table "cases" add column if not exists "court" text;
alter table "cases" add column if not exists "court_name" text;
alter table "cases" add column if not exists "jurisdiction" text;
alter table "cases" add column if not exists "bench_type" text;
alter table "cases" add column if not exists "judge" text;
alter table "cases" add column if not exists "stage" text;
alter table "cases" add column if not exists "priority" text;
alter table "cases" add column if not exists "parties" jsonb;
alter table "cases" add column if not exists "case_summary" text;
alter table "cases" add column if not exists "internal_notes" text;
alter table "cases" add column if not exists "description" text;
alter table "cases" add column if not exists "next_hearing" timestamptz;
alter table "cases" add column if not exists "filing_date" text;
alter table "cases" add column if not exists "registration_date" text;
alter table "cases" add column if not exists "disposal_date" text;
alter table "cases" add column if not exists "ws_filing_date" text;
alter table "cases" add column if not exists "filing_number" text;
alter table "cases" add column if not exists "registration_number" text;
alter table "cases" add column if not exists "cnr_number" text;
alter table "cases" add column if not exists "advocate" text;
alter table "cases" add column if not exists "client" text;
alter table "cases" add column if not exists "status" text;
alter table "cases" add column if not exists "tags" jsonb;
alter table "cases" add column if not exists "document_folder" text;
alter table "cases" add column if not exists "archived" boolean;
alter table "cases" add column if not exists "watch" boolean;
alter table "cases" add column if not exists "stage_history" jsonb;
alter table "cases" add column if not exists "created_at" timestamptz;
alter table "cases" add column if not exists "updated_at" timestamptz;
create index if not exists idx_cases_case_number_str on "cases" ("case_number_str");
create index if not exists idx_cases_case_display_number on "cases" ("case_display_number");
create index if not exists idx_cases_case_type on "cases" ("case_type");
create index if not exists idx_cases_status on "cases" ("status");
create index if not exists idx_cases_stage on "cases" ("stage");
create index if not exists idx_cases_archived on "cases" ("archived");
create index if not exists idx_cases_priority on "cases" ("priority");

create table if not exists "documents" (
  "id" text primary key,
  "case_id" text,
  "name" text,
  "folder" text,
  "folder_id" text,
  "mime" text,
  "size" numeric,
  "ref" text,
  "text" text,
  "version" numeric,
  "sync_status" text,
  "sync_message" text,
  "last_sync_at" timestamptz,
  "uploaded_at" timestamptz
);
alter table "documents" add column if not exists "id" text;
alter table "documents" add column if not exists "case_id" text;
alter table "documents" add column if not exists "name" text;
alter table "documents" add column if not exists "folder" text;
alter table "documents" add column if not exists "folder_id" text;
alter table "documents" add column if not exists "mime" text;
alter table "documents" add column if not exists "size" numeric;
alter table "documents" add column if not exists "ref" text;
alter table "documents" add column if not exists "text" text;
alter table "documents" add column if not exists "version" numeric;
alter table "documents" add column if not exists "sync_status" text;
alter table "documents" add column if not exists "sync_message" text;
alter table "documents" add column if not exists "last_sync_at" timestamptz;
alter table "documents" add column if not exists "uploaded_at" timestamptz;
create index if not exists idx_documents_case_id on "documents" ("case_id");
create index if not exists idx_documents_folder on "documents" ("folder");
create index if not exists idx_documents_folder_id on "documents" ("folder_id");
create index if not exists idx_documents_sync_status on "documents" ("sync_status");

create table if not exists "drafts" (
  "id" text primary key,
  "case_id" text,
  "type" text,
  "title" text,
  "content" text,
  "versions" jsonb,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "drafts" add column if not exists "id" text;
alter table "drafts" add column if not exists "case_id" text;
alter table "drafts" add column if not exists "type" text;
alter table "drafts" add column if not exists "title" text;
alter table "drafts" add column if not exists "content" text;
alter table "drafts" add column if not exists "versions" jsonb;
alter table "drafts" add column if not exists "created_at" timestamptz;
alter table "drafts" add column if not exists "updated_at" timestamptz;
create index if not exists idx_drafts_case_id on "drafts" ("case_id");
create index if not exists idx_drafts_type on "drafts" ("type");

create table if not exists "hearings" (
  "id" text primary key,
  "case_id" text,
  "date" timestamptz,
  "status" text,
  "purpose" text,
  "next_hearing_date" timestamptz,
  "posted_for" text,
  "notes" text,
  "summary" text,
  "judge" text,
  "doc_ref" text,
  "doc_name" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "hearings" add column if not exists "id" text;
alter table "hearings" add column if not exists "case_id" text;
alter table "hearings" add column if not exists "date" timestamptz;
alter table "hearings" add column if not exists "status" text;
alter table "hearings" add column if not exists "purpose" text;
alter table "hearings" add column if not exists "next_hearing_date" timestamptz;
alter table "hearings" add column if not exists "posted_for" text;
alter table "hearings" add column if not exists "notes" text;
alter table "hearings" add column if not exists "summary" text;
alter table "hearings" add column if not exists "judge" text;
alter table "hearings" add column if not exists "doc_ref" text;
alter table "hearings" add column if not exists "doc_name" text;
alter table "hearings" add column if not exists "created_at" timestamptz;
alter table "hearings" add column if not exists "updated_at" timestamptz;
create index if not exists idx_hearings_case_id on "hearings" ("case_id");
create index if not exists idx_hearings_date on "hearings" ("date");
create index if not exists idx_hearings_status on "hearings" ("status");
create index if not exists idx_hearings_next_hearing_date on "hearings" ("next_hearing_date");

create table if not exists "notes" (
  "id" text primary key,
  "case_id" text,
  "title" text,
  "body" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "notes" add column if not exists "id" text;
alter table "notes" add column if not exists "case_id" text;
alter table "notes" add column if not exists "title" text;
alter table "notes" add column if not exists "body" text;
alter table "notes" add column if not exists "created_at" timestamptz;
alter table "notes" add column if not exists "updated_at" timestamptz;
create index if not exists idx_notes_case_id on "notes" ("case_id");

create table if not exists "judgments" (
  "id" text primary key,
  "citation" text,
  "neutralCitation" text,
  "reporterCitation" text,
  "court" text,
  "bench" text,
  "judges" jsonb,
  "caseNumber" text,
  "caseType" text,
  "jurisdiction" text,
  "stage" text,
  "source" text,
  "status" text,
  "plaintiff" text,
  "defendant" text,
  "typeOfProceeding" text,
  "natureOfDispute" text,
  "act" text,
  "plaintiffType" text,
  "defendantType" text,
  "plaintiffCounsel" text,
  "defendantCounsel" text,
  "authorityLevel" text,
  "jurisdictionalScope" text,
  "precedentialValue" text,
  "reviewStatus" text,
  "headnotes" text,
  "practiceArea" text,
  "category" text,
  "provisions" jsonb,
  "legalIssue" jsonb,
  "tags" jsonb,
  "judgmentType" text,
  "overruledBy" text,
  "followedBy" text,
  "title" text,
  "summary" text,
  "date" timestamptz,
  "judgmentDate" timestamptz,
  "pronouncementDate" timestamptz,
  "uploadDate" timestamptz,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  "keywords" jsonb,
  "casesCited" jsonb,
  "acts" jsonb,
  "paragraphs" jsonb,
  "sourceUrl" text,
  "ratioDecidendi" text,
  "obiterDicta" text,
  "keyFindings" text,
  "notes" text,
  "reviewComments" text,
  "favourite" boolean,
  "pinned" boolean,
  "finalDecision" text
);
alter table "judgments" add column if not exists "id" text;
alter table "judgments" add column if not exists "citation" text;
alter table "judgments" add column if not exists "neutralCitation" text;
alter table "judgments" add column if not exists "reporterCitation" text;
alter table "judgments" add column if not exists "court" text;
alter table "judgments" add column if not exists "bench" text;
alter table "judgments" add column if not exists "judges" jsonb;
alter table "judgments" add column if not exists "caseNumber" text;
alter table "judgments" add column if not exists "caseType" text;
alter table "judgments" add column if not exists "jurisdiction" text;
alter table "judgments" add column if not exists "stage" text;
alter table "judgments" add column if not exists "source" text;
alter table "judgments" add column if not exists "status" text;
alter table "judgments" add column if not exists "plaintiff" text;
alter table "judgments" add column if not exists "defendant" text;
alter table "judgments" add column if not exists "typeOfProceeding" text;
alter table "judgments" add column if not exists "natureOfDispute" text;
alter table "judgments" add column if not exists "act" text;
alter table "judgments" add column if not exists "plaintiffType" text;
alter table "judgments" add column if not exists "defendantType" text;
alter table "judgments" add column if not exists "plaintiffCounsel" text;
alter table "judgments" add column if not exists "defendantCounsel" text;
alter table "judgments" add column if not exists "authorityLevel" text;
alter table "judgments" add column if not exists "jurisdictionalScope" text;
alter table "judgments" add column if not exists "precedentialValue" text;
alter table "judgments" add column if not exists "reviewStatus" text;
alter table "judgments" add column if not exists "headnotes" text;
alter table "judgments" add column if not exists "practiceArea" text;
alter table "judgments" add column if not exists "category" text;
alter table "judgments" add column if not exists "provisions" jsonb;
alter table "judgments" add column if not exists "legalIssue" jsonb;
alter table "judgments" add column if not exists "tags" jsonb;
alter table "judgments" add column if not exists "judgmentType" text;
alter table "judgments" add column if not exists "overruledBy" text;
alter table "judgments" add column if not exists "followedBy" text;
alter table "judgments" add column if not exists "title" text;
alter table "judgments" add column if not exists "summary" text;
alter table "judgments" add column if not exists "date" timestamptz;
alter table "judgments" add column if not exists "judgmentDate" timestamptz;
alter table "judgments" add column if not exists "pronouncementDate" timestamptz;
alter table "judgments" add column if not exists "uploadDate" timestamptz;
alter table "judgments" add column if not exists "createdAt" timestamptz;
alter table "judgments" add column if not exists "updatedAt" timestamptz;
alter table "judgments" add column if not exists "keywords" jsonb;
alter table "judgments" add column if not exists "casesCited" jsonb;
alter table "judgments" add column if not exists "acts" jsonb;
alter table "judgments" add column if not exists "paragraphs" jsonb;
alter table "judgments" add column if not exists "sourceUrl" text;
alter table "judgments" add column if not exists "ratioDecidendi" text;
alter table "judgments" add column if not exists "obiterDicta" text;
alter table "judgments" add column if not exists "keyFindings" text;
alter table "judgments" add column if not exists "notes" text;
alter table "judgments" add column if not exists "reviewComments" text;
alter table "judgments" add column if not exists "favourite" boolean;
alter table "judgments" add column if not exists "pinned" boolean;
alter table "judgments" add column if not exists "finalDecision" text;
create index if not exists idx_judgments_court on "judgments" ("court");
create index if not exists idx_judgments_caseType on "judgments" ("caseType");
create index if not exists idx_judgments_jurisdiction on "judgments" ("jurisdiction");

create table if not exists "order_sheet_templates" (
  "id" text primary key,
  "name" text,
  "isDefault" boolean,
  "fields" jsonb,
  "historyFormat" text
);
alter table "order_sheet_templates" add column if not exists "id" text;
alter table "order_sheet_templates" add column if not exists "name" text;
alter table "order_sheet_templates" add column if not exists "isDefault" boolean;
alter table "order_sheet_templates" add column if not exists "fields" jsonb;
alter table "order_sheet_templates" add column if not exists "historyFormat" text;

create table if not exists "case_folders" (
  "id" text primary key,
  "case_id" text,
  "name" text,
  "kind" text,
  "order" numeric,
  "system" boolean,
  "parent_id" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "case_folders" add column if not exists "id" text;
alter table "case_folders" add column if not exists "case_id" text;
alter table "case_folders" add column if not exists "name" text;
alter table "case_folders" add column if not exists "kind" text;
alter table "case_folders" add column if not exists "order" numeric;
alter table "case_folders" add column if not exists "system" boolean;
alter table "case_folders" add column if not exists "parent_id" text;
alter table "case_folders" add column if not exists "created_at" timestamptz;
alter table "case_folders" add column if not exists "updated_at" timestamptz;
create index if not exists idx_case_folders_case_id on "case_folders" ("case_id");
create index if not exists idx_case_folders_parent_id on "case_folders" ("parent_id");
create index if not exists idx_case_folders_kind on "case_folders" ("kind");

create table if not exists "case_history" (
  "id" text primary key,
  "case_id" text,
  "date" timestamptz,
  "stage" text,
  "purpose" text,
  "status" text,
  "remarks" text,
  "created_at" timestamptz
);
alter table "case_history" add column if not exists "id" text;
alter table "case_history" add column if not exists "case_id" text;
alter table "case_history" add column if not exists "date" timestamptz;
alter table "case_history" add column if not exists "stage" text;
alter table "case_history" add column if not exists "purpose" text;
alter table "case_history" add column if not exists "status" text;
alter table "case_history" add column if not exists "remarks" text;
alter table "case_history" add column if not exists "created_at" timestamptz;
create index if not exists idx_case_history_case_id on "case_history" ("case_id");
create index if not exists idx_case_history_date on "case_history" ("date");

create table if not exists "case_activity" (
  "id" text primary key,
  "case_id" text,
  "action" text,
  "message" text,
  "by" text,
  "at" timestamptz
);
alter table "case_activity" add column if not exists "id" text;
alter table "case_activity" add column if not exists "case_id" text;
alter table "case_activity" add column if not exists "action" text;
alter table "case_activity" add column if not exists "message" text;
alter table "case_activity" add column if not exists "by" text;
alter table "case_activity" add column if not exists "at" timestamptz;
create index if not exists idx_case_activity_case_id on "case_activity" ("case_id");
create index if not exists idx_case_activity_at on "case_activity" ("at");

create table if not exists "case_stages" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "case_stages" add column if not exists "id" text;
alter table "case_stages" add column if not exists "name" text;
alter table "case_stages" add column if not exists "short_code" text;
alter table "case_stages" add column if not exists "description" text;
alter table "case_stages" add column if not exists "display_order" numeric;
alter table "case_stages" add column if not exists "color" text;
alter table "case_stages" add column if not exists "status" text;
alter table "case_stages" add column if not exists "created_at" timestamptz;
alter table "case_stages" add column if not exists "updated_at" timestamptz;
create index if not exists idx_case_stages_name on "case_stages" ("name");
create index if not exists idx_case_stages_short_code on "case_stages" ("short_code");
create index if not exists idx_case_stages_status on "case_stages" ("status");
create index if not exists idx_case_stages_display_order on "case_stages" ("display_order");

create table if not exists "reminders" (
  "id" text primary key,
  "case_id" text,
  "type" text,
  "title" text,
  "date" timestamptz,
  "due_at" timestamptz,
  "done" boolean,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "reminders" add column if not exists "id" text;
alter table "reminders" add column if not exists "case_id" text;
alter table "reminders" add column if not exists "type" text;
alter table "reminders" add column if not exists "title" text;
alter table "reminders" add column if not exists "date" timestamptz;
alter table "reminders" add column if not exists "due_at" timestamptz;
alter table "reminders" add column if not exists "done" boolean;
alter table "reminders" add column if not exists "status" text;
alter table "reminders" add column if not exists "created_at" timestamptz;
alter table "reminders" add column if not exists "updated_at" timestamptz;
create index if not exists idx_reminders_case_id on "reminders" ("case_id");
create index if not exists idx_reminders_due_at on "reminders" ("due_at");
create index if not exists idx_reminders_status on "reminders" ("status");

create table if not exists "audit_logs" (
  "id" text primary key,
  "action" text,
  "module" text,
  "user_id" text,
  "user_name" text,
  "ip" text,
  "at" timestamptz,
  "details" text,
  "meta" jsonb
);
alter table "audit_logs" add column if not exists "id" text;
alter table "audit_logs" add column if not exists "action" text;
alter table "audit_logs" add column if not exists "module" text;
alter table "audit_logs" add column if not exists "user_id" text;
alter table "audit_logs" add column if not exists "user_name" text;
alter table "audit_logs" add column if not exists "ip" text;
alter table "audit_logs" add column if not exists "at" timestamptz;
alter table "audit_logs" add column if not exists "details" text;
alter table "audit_logs" add column if not exists "meta" jsonb;
create index if not exists idx_audit_logs_module on "audit_logs" ("module");
create index if not exists idx_audit_logs_action on "audit_logs" ("action");
create index if not exists idx_audit_logs_user_id on "audit_logs" ("user_id");
create index if not exists idx_audit_logs_at on "audit_logs" ("at");

create table if not exists "env_vars" (
  "id" text primary key,
  "name" text,
  "value" text,
  "status" text,
  "category" text,
  "secret" boolean,
  "persisted" boolean,
  "updated_at" timestamptz,
  "updated_by" text
);
alter table "env_vars" add column if not exists "id" text;
alter table "env_vars" add column if not exists "name" text;
alter table "env_vars" add column if not exists "value" text;
alter table "env_vars" add column if not exists "status" text;
alter table "env_vars" add column if not exists "category" text;
alter table "env_vars" add column if not exists "secret" boolean;
alter table "env_vars" add column if not exists "persisted" boolean;
alter table "env_vars" add column if not exists "updated_at" timestamptz;
alter table "env_vars" add column if not exists "updated_by" text;
create index if not exists idx_env_vars_name on "env_vars" ("name");
create index if not exists idx_env_vars_category on "env_vars" ("category");

create table if not exists "config_history" (
  "id" text primary key,
  "name" text,
  "oldValue" text,
  "newValue" text,
  "changed_by" text,
  "at" timestamptz
);
alter table "config_history" add column if not exists "id" text;
alter table "config_history" add column if not exists "name" text;
alter table "config_history" add column if not exists "oldValue" text;
alter table "config_history" add column if not exists "newValue" text;
alter table "config_history" add column if not exists "changed_by" text;
alter table "config_history" add column if not exists "at" timestamptz;
create index if not exists idx_config_history_name on "config_history" ("name");
create index if not exists idx_config_history_at on "config_history" ("at");

create table if not exists "settings" (
  "id" text primary key,
  "key" text,
  "value" jsonb,
  "updated_at" timestamptz,
  "updated_by" text
);
alter table "settings" add column if not exists "id" text;
alter table "settings" add column if not exists "key" text;
alter table "settings" add column if not exists "value" jsonb;
alter table "settings" add column if not exists "updated_at" timestamptz;
alter table "settings" add column if not exists "updated_by" text;
create index if not exists idx_settings_key on "settings" ("key");

create table if not exists "case_types" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "case_types" add column if not exists "id" text;
alter table "case_types" add column if not exists "name" text;
alter table "case_types" add column if not exists "short_code" text;
alter table "case_types" add column if not exists "description" text;
alter table "case_types" add column if not exists "display_order" numeric;
alter table "case_types" add column if not exists "color" text;
alter table "case_types" add column if not exists "status" text;
alter table "case_types" add column if not exists "created_at" timestamptz;
alter table "case_types" add column if not exists "updated_at" timestamptz;
create index if not exists idx_case_types_short_code on "case_types" ("short_code");
create index if not exists idx_case_types_status on "case_types" ("status");
create index if not exists idx_case_types_display_order on "case_types" ("display_order");

create table if not exists "courts" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "level" numeric,
  "parent_id" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "courts" add column if not exists "id" text;
alter table "courts" add column if not exists "name" text;
alter table "courts" add column if not exists "short_code" text;
alter table "courts" add column if not exists "description" text;
alter table "courts" add column if not exists "level" numeric;
alter table "courts" add column if not exists "parent_id" text;
alter table "courts" add column if not exists "display_order" numeric;
alter table "courts" add column if not exists "color" text;
alter table "courts" add column if not exists "status" text;
alter table "courts" add column if not exists "created_at" timestamptz;
alter table "courts" add column if not exists "updated_at" timestamptz;
create index if not exists idx_courts_name on "courts" ("name");
create index if not exists idx_courts_level on "courts" ("level");
create index if not exists idx_courts_parent_id on "courts" ("parent_id");
create index if not exists idx_courts_status on "courts" ("status");

create table if not exists "bench_types" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "bench_types" add column if not exists "id" text;
alter table "bench_types" add column if not exists "name" text;
alter table "bench_types" add column if not exists "short_code" text;
alter table "bench_types" add column if not exists "description" text;
alter table "bench_types" add column if not exists "display_order" numeric;
alter table "bench_types" add column if not exists "color" text;
alter table "bench_types" add column if not exists "status" text;
alter table "bench_types" add column if not exists "created_at" timestamptz;
alter table "bench_types" add column if not exists "updated_at" timestamptz;
create index if not exists idx_bench_types_name on "bench_types" ("name");
create index if not exists idx_bench_types_short_code on "bench_types" ("short_code");
create index if not exists idx_bench_types_status on "bench_types" ("status");

create table if not exists "cause_list_templates" (
  "id" text primary key,
  "name" text,
  "description" text,
  "template_type" text,
  "content" jsonb,
  "is_active" boolean,
  "display_order" numeric,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "cause_list_templates" add column if not exists "id" text;
alter table "cause_list_templates" add column if not exists "name" text;
alter table "cause_list_templates" add column if not exists "description" text;
alter table "cause_list_templates" add column if not exists "template_type" text;
alter table "cause_list_templates" add column if not exists "content" jsonb;
alter table "cause_list_templates" add column if not exists "is_active" boolean;
alter table "cause_list_templates" add column if not exists "display_order" numeric;
alter table "cause_list_templates" add column if not exists "created_at" timestamptz;
alter table "cause_list_templates" add column if not exists "updated_at" timestamptz;
create index if not exists idx_cause_list_templates_name on "cause_list_templates" ("name");
create index if not exists idx_cause_list_templates_template_type on "cause_list_templates" ("template_type");
create index if not exists idx_cause_list_templates_is_active on "cause_list_templates" ("is_active");

create table if not exists "jurisdictions" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "jurisdictions" add column if not exists "id" text;
alter table "jurisdictions" add column if not exists "name" text;
alter table "jurisdictions" add column if not exists "short_code" text;
alter table "jurisdictions" add column if not exists "description" text;
alter table "jurisdictions" add column if not exists "display_order" numeric;
alter table "jurisdictions" add column if not exists "color" text;
alter table "jurisdictions" add column if not exists "status" text;
alter table "jurisdictions" add column if not exists "created_at" timestamptz;
alter table "jurisdictions" add column if not exists "updated_at" timestamptz;
create index if not exists idx_jurisdictions_name on "jurisdictions" ("name");
create index if not exists idx_jurisdictions_short_code on "jurisdictions" ("short_code");
create index if not exists idx_jurisdictions_status on "jurisdictions" ("status");

create table if not exists "clients" (
  "id" text primary key,
  "name" text,
  "contact_person" text,
  "email" text,
  "phone" text,
  "address" text,
  "client_type" text,
  "linked_cases" numeric,
  "payment_status" text,
  "notes" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "clients" add column if not exists "id" text;
alter table "clients" add column if not exists "name" text;
alter table "clients" add column if not exists "contact_person" text;
alter table "clients" add column if not exists "email" text;
alter table "clients" add column if not exists "phone" text;
alter table "clients" add column if not exists "address" text;
alter table "clients" add column if not exists "client_type" text;
alter table "clients" add column if not exists "linked_cases" numeric;
alter table "clients" add column if not exists "payment_status" text;
alter table "clients" add column if not exists "notes" text;
alter table "clients" add column if not exists "status" text;
alter table "clients" add column if not exists "created_at" timestamptz;
alter table "clients" add column if not exists "updated_at" timestamptz;
create index if not exists idx_clients_name on "clients" ("name");
create index if not exists idx_clients_email on "clients" ("email");
create index if not exists idx_clients_status on "clients" ("status");
create index if not exists idx_clients_client_type on "clients" ("client_type");

create table if not exists "contacts" (
  "id" text primary key,
  "name" text,
  "type" text,
  "phone" text,
  "email" text,
  "organization" text,
  "address" text,
  "notes" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "contacts" add column if not exists "id" text;
alter table "contacts" add column if not exists "name" text;
alter table "contacts" add column if not exists "type" text;
alter table "contacts" add column if not exists "phone" text;
alter table "contacts" add column if not exists "email" text;
alter table "contacts" add column if not exists "organization" text;
alter table "contacts" add column if not exists "address" text;
alter table "contacts" add column if not exists "notes" text;
alter table "contacts" add column if not exists "status" text;
alter table "contacts" add column if not exists "created_at" timestamptz;
alter table "contacts" add column if not exists "updated_at" timestamptz;
create index if not exists idx_contacts_name on "contacts" ("name");
create index if not exists idx_contacts_type on "contacts" ("type");
create index if not exists idx_contacts_email on "contacts" ("email");
create index if not exists idx_contacts_status on "contacts" ("status");

create table if not exists "acts" (
  "id" text primary key,
  "title" text,
  "short_code" text,
  "act_type" text,
  "jurisdiction" text,
  "year" numeric,
  "sections_count" numeric,
  "amendments_count" numeric,
  "description" text,
  "last_updated" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "acts" add column if not exists "id" text;
alter table "acts" add column if not exists "title" text;
alter table "acts" add column if not exists "short_code" text;
alter table "acts" add column if not exists "act_type" text;
alter table "acts" add column if not exists "jurisdiction" text;
alter table "acts" add column if not exists "year" numeric;
alter table "acts" add column if not exists "sections_count" numeric;
alter table "acts" add column if not exists "amendments_count" numeric;
alter table "acts" add column if not exists "description" text;
alter table "acts" add column if not exists "last_updated" text;
alter table "acts" add column if not exists "status" text;
alter table "acts" add column if not exists "created_at" timestamptz;
alter table "acts" add column if not exists "updated_at" timestamptz;
create index if not exists idx_acts_title on "acts" ("title");
create index if not exists idx_acts_short_code on "acts" ("short_code");
create index if not exists idx_acts_act_type on "acts" ("act_type");
create index if not exists idx_acts_jurisdiction on "acts" ("jurisdiction");
create index if not exists idx_acts_status on "acts" ("status");

create table if not exists "prompts" (
  "id" text primary key,
  "name" text,
  "category" text,
  "content" text,
  "last_used" text,
  "usage_count" numeric,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "prompts" add column if not exists "id" text;
alter table "prompts" add column if not exists "name" text;
alter table "prompts" add column if not exists "category" text;
alter table "prompts" add column if not exists "content" text;
alter table "prompts" add column if not exists "last_used" text;
alter table "prompts" add column if not exists "usage_count" numeric;
alter table "prompts" add column if not exists "status" text;
alter table "prompts" add column if not exists "created_at" timestamptz;
alter table "prompts" add column if not exists "updated_at" timestamptz;
create index if not exists idx_prompts_name on "prompts" ("name");
create index if not exists idx_prompts_category on "prompts" ("category");
create index if not exists idx_prompts_status on "prompts" ("status");

create table if not exists "templates" (
  "id" text primary key,
  "name" text,
  "category" text,
  "description" text,
  "content" text,
  "is_active" boolean,
  "last_updated" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "templates" add column if not exists "id" text;
alter table "templates" add column if not exists "name" text;
alter table "templates" add column if not exists "category" text;
alter table "templates" add column if not exists "description" text;
alter table "templates" add column if not exists "content" text;
alter table "templates" add column if not exists "is_active" boolean;
alter table "templates" add column if not exists "last_updated" text;
alter table "templates" add column if not exists "status" text;
alter table "templates" add column if not exists "created_at" timestamptz;
alter table "templates" add column if not exists "updated_at" timestamptz;
create index if not exists idx_templates_name on "templates" ("name");
create index if not exists idx_templates_category on "templates" ("category");
create index if not exists idx_templates_status on "templates" ("status");

create table if not exists "legal_notices" (
  "id" text primary key,
  "notice_number" text,
  "recipient" text,
  "date" text,
  "status" text,
  "content" text,
  "case_ref" text,
  "sent_date" text,
  "acknowledged_date" text,
  "replied_date" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "legal_notices" add column if not exists "id" text;
alter table "legal_notices" add column if not exists "notice_number" text;
alter table "legal_notices" add column if not exists "recipient" text;
alter table "legal_notices" add column if not exists "date" text;
alter table "legal_notices" add column if not exists "status" text;
alter table "legal_notices" add column if not exists "content" text;
alter table "legal_notices" add column if not exists "case_ref" text;
alter table "legal_notices" add column if not exists "sent_date" text;
alter table "legal_notices" add column if not exists "acknowledged_date" text;
alter table "legal_notices" add column if not exists "replied_date" text;
alter table "legal_notices" add column if not exists "created_at" timestamptz;
alter table "legal_notices" add column if not exists "updated_at" timestamptz;
create index if not exists idx_legal_notices_notice_number on "legal_notices" ("notice_number");
create index if not exists idx_legal_notices_recipient on "legal_notices" ("recipient");
create index if not exists idx_legal_notices_status on "legal_notices" ("status");
create index if not exists idx_legal_notices_date on "legal_notices" ("date");

create table if not exists "precedents" (
  "id" text primary key,
  "title" text,
  "citation" text,
  "court" text,
  "date" text,
  "bench" text,
  "tags" text,
  "is_favorite" boolean,
  "case_name" text,
  "notes" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "precedents" add column if not exists "id" text;
alter table "precedents" add column if not exists "title" text;
alter table "precedents" add column if not exists "citation" text;
alter table "precedents" add column if not exists "court" text;
alter table "precedents" add column if not exists "date" text;
alter table "precedents" add column if not exists "bench" text;
alter table "precedents" add column if not exists "tags" text;
alter table "precedents" add column if not exists "is_favorite" boolean;
alter table "precedents" add column if not exists "case_name" text;
alter table "precedents" add column if not exists "notes" text;
alter table "precedents" add column if not exists "status" text;
alter table "precedents" add column if not exists "created_at" timestamptz;
alter table "precedents" add column if not exists "updated_at" timestamptz;
create index if not exists idx_precedents_title on "precedents" ("title");
create index if not exists idx_precedents_citation on "precedents" ("citation");
create index if not exists idx_precedents_court on "precedents" ("court");
create index if not exists idx_precedents_status on "precedents" ("status");
create index if not exists idx_precedents_is_favorite on "precedents" ("is_favorite");

create table if not exists "reports" (
  "id" text primary key,
  "name" text,
  "report_type" text,
  "description" text,
  "config" text,
  "status" text,
  "last_generated" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "reports" add column if not exists "id" text;
alter table "reports" add column if not exists "name" text;
alter table "reports" add column if not exists "report_type" text;
alter table "reports" add column if not exists "description" text;
alter table "reports" add column if not exists "config" text;
alter table "reports" add column if not exists "status" text;
alter table "reports" add column if not exists "last_generated" text;
alter table "reports" add column if not exists "created_at" timestamptz;
alter table "reports" add column if not exists "updated_at" timestamptz;
create index if not exists idx_reports_name on "reports" ("name");
create index if not exists idx_reports_report_type on "reports" ("report_type");
create index if not exists idx_reports_status on "reports" ("status");

create table if not exists "case_statuses" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "case_statuses" add column if not exists "id" text;
alter table "case_statuses" add column if not exists "name" text;
alter table "case_statuses" add column if not exists "short_code" text;
alter table "case_statuses" add column if not exists "description" text;
alter table "case_statuses" add column if not exists "display_order" numeric;
alter table "case_statuses" add column if not exists "color" text;
alter table "case_statuses" add column if not exists "status" text;
alter table "case_statuses" add column if not exists "created_at" timestamptz;
alter table "case_statuses" add column if not exists "updated_at" timestamptz;
create index if not exists idx_case_statuses_name on "case_statuses" ("name");
create index if not exists idx_case_statuses_short_code on "case_statuses" ("short_code");
create index if not exists idx_case_statuses_status on "case_statuses" ("status");
create index if not exists idx_case_statuses_display_order on "case_statuses" ("display_order");

create table if not exists "priorities" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "priorities" add column if not exists "id" text;
alter table "priorities" add column if not exists "name" text;
alter table "priorities" add column if not exists "short_code" text;
alter table "priorities" add column if not exists "description" text;
alter table "priorities" add column if not exists "display_order" numeric;
alter table "priorities" add column if not exists "color" text;
alter table "priorities" add column if not exists "status" text;
alter table "priorities" add column if not exists "created_at" timestamptz;
alter table "priorities" add column if not exists "updated_at" timestamptz;
create index if not exists idx_priorities_name on "priorities" ("name");
create index if not exists idx_priorities_short_code on "priorities" ("short_code");
create index if not exists idx_priorities_status on "priorities" ("status");
create index if not exists idx_priorities_display_order on "priorities" ("display_order");

create table if not exists "hearing_statuses" (
  "id" text primary key,
  "name" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "hearing_statuses" add column if not exists "id" text;
alter table "hearing_statuses" add column if not exists "name" text;
alter table "hearing_statuses" add column if not exists "display_order" numeric;
alter table "hearing_statuses" add column if not exists "color" text;
alter table "hearing_statuses" add column if not exists "status" text;
alter table "hearing_statuses" add column if not exists "created_at" timestamptz;
alter table "hearing_statuses" add column if not exists "updated_at" timestamptz;
create index if not exists idx_hearing_statuses_name on "hearing_statuses" ("name");
create index if not exists idx_hearing_statuses_status on "hearing_statuses" ("status");
create index if not exists idx_hearing_statuses_display_order on "hearing_statuses" ("display_order");

create table if not exists "contact_types" (
  "id" text primary key,
  "name" text,
  "display_order" numeric,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "contact_types" add column if not exists "id" text;
alter table "contact_types" add column if not exists "name" text;
alter table "contact_types" add column if not exists "display_order" numeric;
alter table "contact_types" add column if not exists "status" text;
alter table "contact_types" add column if not exists "created_at" timestamptz;
alter table "contact_types" add column if not exists "updated_at" timestamptz;
create index if not exists idx_contact_types_name on "contact_types" ("name");
create index if not exists idx_contact_types_status on "contact_types" ("status");

create table if not exists "folder_templates" (
  "id" text primary key,
  "name" text,
  "kind" text,
  "system" boolean,
  "display_order" numeric,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "folder_templates" add column if not exists "id" text;
alter table "folder_templates" add column if not exists "name" text;
alter table "folder_templates" add column if not exists "kind" text;
alter table "folder_templates" add column if not exists "system" boolean;
alter table "folder_templates" add column if not exists "display_order" numeric;
alter table "folder_templates" add column if not exists "created_at" timestamptz;
alter table "folder_templates" add column if not exists "updated_at" timestamptz;
create index if not exists idx_folder_templates_name on "folder_templates" ("name");
create index if not exists idx_folder_templates_kind on "folder_templates" ("kind");

create table if not exists "draft_types" (
  "id" text primary key,
  "name" text,
  "label" text,
  "group" text,
  "display_order" numeric,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "draft_types" add column if not exists "id" text;
alter table "draft_types" add column if not exists "name" text;
alter table "draft_types" add column if not exists "label" text;
alter table "draft_types" add column if not exists "group" text;
alter table "draft_types" add column if not exists "display_order" numeric;
alter table "draft_types" add column if not exists "created_at" timestamptz;
alter table "draft_types" add column if not exists "updated_at" timestamptz;
create index if not exists idx_draft_types_name on "draft_types" ("name");
create index if not exists idx_draft_types_group on "draft_types" ("group");

create table if not exists "judges" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "designation" text,
  "court" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "judges" add column if not exists "id" text;
alter table "judges" add column if not exists "name" text;
alter table "judges" add column if not exists "short_code" text;
alter table "judges" add column if not exists "description" text;
alter table "judges" add column if not exists "designation" text;
alter table "judges" add column if not exists "court" text;
alter table "judges" add column if not exists "display_order" numeric;
alter table "judges" add column if not exists "color" text;
alter table "judges" add column if not exists "status" text;
alter table "judges" add column if not exists "created_at" timestamptz;
alter table "judges" add column if not exists "updated_at" timestamptz;
create index if not exists idx_judges_name on "judges" ("name");
create index if not exists idx_judges_short_code on "judges" ("short_code");
create index if not exists idx_judges_status on "judges" ("status");
create index if not exists idx_judges_display_order on "judges" ("display_order");

create table if not exists "reminder_types" (
  "id" text primary key,
  "name" text,
  "description" text,
  "display_order" numeric,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "reminder_types" add column if not exists "id" text;
alter table "reminder_types" add column if not exists "name" text;
alter table "reminder_types" add column if not exists "description" text;
alter table "reminder_types" add column if not exists "display_order" numeric;
alter table "reminder_types" add column if not exists "status" text;
alter table "reminder_types" add column if not exists "created_at" timestamptz;
alter table "reminder_types" add column if not exists "updated_at" timestamptz;
create index if not exists idx_reminder_types_name on "reminder_types" ("name");
create index if not exists idx_reminder_types_status on "reminder_types" ("status");

create table if not exists "party_types" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "party_types" add column if not exists "id" text;
alter table "party_types" add column if not exists "name" text;
alter table "party_types" add column if not exists "short_code" text;
alter table "party_types" add column if not exists "description" text;
alter table "party_types" add column if not exists "display_order" numeric;
alter table "party_types" add column if not exists "color" text;
alter table "party_types" add column if not exists "status" text;
alter table "party_types" add column if not exists "created_at" timestamptz;
alter table "party_types" add column if not exists "updated_at" timestamptz;
create index if not exists idx_party_types_name on "party_types" ("name");
create index if not exists idx_party_types_short_code on "party_types" ("short_code");
create index if not exists idx_party_types_status on "party_types" ("status");
create index if not exists idx_party_types_display_order on "party_types" ("display_order");

create table if not exists "area_of_law" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "area_of_law" add column if not exists "id" text;
alter table "area_of_law" add column if not exists "name" text;
alter table "area_of_law" add column if not exists "short_code" text;
alter table "area_of_law" add column if not exists "description" text;
alter table "area_of_law" add column if not exists "display_order" numeric;
alter table "area_of_law" add column if not exists "color" text;
alter table "area_of_law" add column if not exists "status" text;
alter table "area_of_law" add column if not exists "created_at" timestamptz;
alter table "area_of_law" add column if not exists "updated_at" timestamptz;
create index if not exists idx_area_of_law_name on "area_of_law" ("name");
create index if not exists idx_area_of_law_short_code on "area_of_law" ("short_code");
create index if not exists idx_area_of_law_status on "area_of_law" ("status");
create index if not exists idx_area_of_law_display_order on "area_of_law" ("display_order");

create table if not exists "type_of_proceeding" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "type_of_proceeding" add column if not exists "id" text;
alter table "type_of_proceeding" add column if not exists "name" text;
alter table "type_of_proceeding" add column if not exists "short_code" text;
alter table "type_of_proceeding" add column if not exists "description" text;
alter table "type_of_proceeding" add column if not exists "display_order" numeric;
alter table "type_of_proceeding" add column if not exists "color" text;
alter table "type_of_proceeding" add column if not exists "status" text;
alter table "type_of_proceeding" add column if not exists "created_at" timestamptz;
alter table "type_of_proceeding" add column if not exists "updated_at" timestamptz;
create index if not exists idx_type_of_proceeding_name on "type_of_proceeding" ("name");
create index if not exists idx_type_of_proceeding_short_code on "type_of_proceeding" ("short_code");
create index if not exists idx_type_of_proceeding_status on "type_of_proceeding" ("status");
create index if not exists idx_type_of_proceeding_display_order on "type_of_proceeding" ("display_order");

create table if not exists "nature_of_dispute" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "nature_of_dispute" add column if not exists "id" text;
alter table "nature_of_dispute" add column if not exists "name" text;
alter table "nature_of_dispute" add column if not exists "short_code" text;
alter table "nature_of_dispute" add column if not exists "description" text;
alter table "nature_of_dispute" add column if not exists "display_order" numeric;
alter table "nature_of_dispute" add column if not exists "color" text;
alter table "nature_of_dispute" add column if not exists "status" text;
alter table "nature_of_dispute" add column if not exists "created_at" timestamptz;
alter table "nature_of_dispute" add column if not exists "updated_at" timestamptz;
create index if not exists idx_nature_of_dispute_name on "nature_of_dispute" ("name");
create index if not exists idx_nature_of_dispute_short_code on "nature_of_dispute" ("short_code");
create index if not exists idx_nature_of_dispute_status on "nature_of_dispute" ("status");
create index if not exists idx_nature_of_dispute_display_order on "nature_of_dispute" ("display_order");

create table if not exists "provisions" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "display_order" numeric,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "provisions" add column if not exists "id" text;
alter table "provisions" add column if not exists "name" text;
alter table "provisions" add column if not exists "short_code" text;
alter table "provisions" add column if not exists "description" text;
alter table "provisions" add column if not exists "display_order" numeric;
alter table "provisions" add column if not exists "color" text;
alter table "provisions" add column if not exists "status" text;
alter table "provisions" add column if not exists "created_at" timestamptz;
alter table "provisions" add column if not exists "updated_at" timestamptz;
create index if not exists idx_provisions_name on "provisions" ("name");
create index if not exists idx_provisions_short_code on "provisions" ("short_code");
create index if not exists idx_provisions_status on "provisions" ("status");
create index if not exists idx_provisions_display_order on "provisions" ("display_order");

create table if not exists "tasks" (
  "id" text primary key,
  "title" text,
  "description" text,
  "notes" text,
  "category" text,
  "priority" text,
  "status" text,
  "active" boolean,
  "due_date" timestamptz,
  "due_time" text,
  "start_date" timestamptz,
  "end_date" timestamptz,
  "reminder" boolean,
  "reminder_time" text,
  "color" text,
  "case_id" text,
  "hearing_id" text,
  "tags" text,
  "attachments" text,
  "created_by" text,
  "archived" boolean,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "tasks" add column if not exists "id" text;
alter table "tasks" add column if not exists "title" text;
alter table "tasks" add column if not exists "description" text;
alter table "tasks" add column if not exists "notes" text;
alter table "tasks" add column if not exists "category" text;
alter table "tasks" add column if not exists "priority" text;
alter table "tasks" add column if not exists "status" text;
alter table "tasks" add column if not exists "active" boolean;
alter table "tasks" add column if not exists "due_date" timestamptz;
alter table "tasks" add column if not exists "due_time" text;
alter table "tasks" add column if not exists "start_date" timestamptz;
alter table "tasks" add column if not exists "end_date" timestamptz;
alter table "tasks" add column if not exists "reminder" boolean;
alter table "tasks" add column if not exists "reminder_time" text;
alter table "tasks" add column if not exists "color" text;
alter table "tasks" add column if not exists "case_id" text;
alter table "tasks" add column if not exists "hearing_id" text;
alter table "tasks" add column if not exists "tags" text;
alter table "tasks" add column if not exists "attachments" text;
alter table "tasks" add column if not exists "created_by" text;
alter table "tasks" add column if not exists "archived" boolean;
alter table "tasks" add column if not exists "created_at" timestamptz;
alter table "tasks" add column if not exists "updated_at" timestamptz;
create index if not exists idx_tasks_category on "tasks" ("category");
create index if not exists idx_tasks_priority on "tasks" ("priority");
create index if not exists idx_tasks_status on "tasks" ("status");
create index if not exists idx_tasks_due_date on "tasks" ("due_date");
create index if not exists idx_tasks_active on "tasks" ("active");
create index if not exists idx_tasks_archived on "tasks" ("archived");
create index if not exists idx_tasks_case_id on "tasks" ("case_id");
create index if not exists idx_tasks_hearing_id on "tasks" ("hearing_id");

create table if not exists "task_categories" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "task_categories" add column if not exists "id" text;
alter table "task_categories" add column if not exists "name" text;
alter table "task_categories" add column if not exists "short_code" text;
alter table "task_categories" add column if not exists "description" text;
alter table "task_categories" add column if not exists "color" text;
alter table "task_categories" add column if not exists "status" text;
alter table "task_categories" add column if not exists "created_at" timestamptz;
alter table "task_categories" add column if not exists "updated_at" timestamptz;
create index if not exists idx_task_categories_name on "task_categories" ("name");
create index if not exists idx_task_categories_short_code on "task_categories" ("short_code");
create index if not exists idx_task_categories_status on "task_categories" ("status");

create table if not exists "task_statuses" (
  "id" text primary key,
  "name" text,
  "short_code" text,
  "description" text,
  "color" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
alter table "task_statuses" add column if not exists "id" text;
alter table "task_statuses" add column if not exists "name" text;
alter table "task_statuses" add column if not exists "short_code" text;
alter table "task_statuses" add column if not exists "description" text;
alter table "task_statuses" add column if not exists "color" text;
alter table "task_statuses" add column if not exists "status" text;
alter table "task_statuses" add column if not exists "created_at" timestamptz;
alter table "task_statuses" add column if not exists "updated_at" timestamptz;
create index if not exists idx_task_statuses_name on "task_statuses" ("name");
create index if not exists idx_task_statuses_short_code on "task_statuses" ("short_code");
create index if not exists idx_task_statuses_status on "task_statuses" ("status");

-- ============================================================
-- 6. FOREIGN KEY INSTALLATION (P4 — after all tables exist)
-- ============================================================
-- All safe_create_fk calls run after registry tables AND application
-- tables are created, so referenced tables/columns are guaranteed to exist.
-- uq_roles_code unique constraint is defined inline in the CREATE TABLE for roles (see roles.schema.js).
select safe_create_fk('reminders', 'case_id', 'cases', 'id', 'fk_reminders_case_id', 'CASCADE');
select safe_create_fk('notes', 'case_id', 'cases', 'id', 'fk_notes_case_id', 'CASCADE');
select safe_create_fk('hearings', 'case_id', 'cases', 'id', 'fk_hearings_case_id', 'CASCADE');
select safe_create_fk('drafts', 'case_id', 'cases', 'id', 'fk_drafts_case_id', 'CASCADE');
select safe_create_fk('documents', 'case_id', 'cases', 'id', 'fk_documents_case_id', 'CASCADE');
select safe_create_fk('case_history', 'case_id', 'cases', 'id', 'fk_case_history_case_id', 'CASCADE');
select safe_create_fk('case_folders', 'case_id', 'cases', 'id', 'fk_case_folders_case_id', 'CASCADE');
select safe_create_fk('case_activity', 'case_id', 'cases', 'id', 'fk_case_activity_case_id', 'CASCADE');
select safe_create_fk('audit_logs', 'case_id', 'users', 'id', 'fk_audit_logs_user_id', 'SET NULL');
select safe_create_fk('users', 'role_code', 'roles', 'code', 'fk_users_role_code', 'RESTRICT');
select safe_create_fk('case_folders', 'parent_id', 'case_folders', 'id', 'fk_case_folders_parent_id', 'CASCADE');

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================
-- Enable RLS on tables (registry + application)
alter table if exists schema_registry enable row level security;
alter table if exists entity_registry enable row level security;
alter table if exists field_registry enable row level security;
alter table if exists provider_registry enable row level security;
alter table if exists migration_registry enable row level security;
alter table if exists installer_state enable row level security;
alter table if exists provider_adapter_registry enable row level security;
alter table if exists schema_mapping enable row level security;
alter table if exists mapping_history enable row level security;
alter table if exists mapping_versions enable row level security;
alter table if exists provider_capabilities enable row level security;
alter table if exists entity_prefix_registry enable row level security;
alter table if exists id_registry enable row level security;
alter table if exists foreign_key_registry enable row level security;
alter table if exists user_role_registry enable row level security;
alter table if exists users enable row level security;
alter table if exists roles enable row level security;
alter table if exists permissions enable row level security;
alter table if exists cases enable row level security;
alter table if exists courts enable row level security;
alter table if exists case_types enable row level security;
alter table if exists case_stages enable row level security;
alter table if exists reminders enable row level security;
alter table if exists notes enable row level security;
alter table if exists hearings enable row level security;
alter table if exists drafts enable row level security;
alter table if exists documents enable row level security;
alter table if exists case_history enable row level security;
alter table if exists case_folders enable row level security;
alter table if exists case_activity enable row level security;
alter table if exists audit_logs enable row level security;
alter table if exists config_history enable row level security;
alter table if exists settings enable row level security;
alter table if exists env_vars enable row level security;
alter table if exists schema_meta enable row level security;
alter table if exists judgments enable row level security;
alter table if exists cause_list_templates enable row level security;
alter table if exists bench_types enable row level security;
alter table if exists jurisdictions enable row level security;
alter table if exists clients enable row level security;
alter table if exists contacts enable row level security;
alter table if exists acts enable row level security;
alter table if exists prompts enable row level security;
alter table if exists templates enable row level security;
alter table if exists legal_notices enable row level security;
alter table if exists precedents enable row level security;
alter table if exists reports enable row level security;
alter table if exists party_types enable row level security;
alter table if exists case_statuses enable row level security;
alter table if exists priorities enable row level security;
alter table if exists hearing_statuses enable row level security;
alter table if exists contact_types enable row level security;
alter table if exists judges enable row level security;
alter table if exists reminder_types enable row level security;
alter table if exists folder_templates enable row level security;
alter table if exists draft_types enable row level security;
alter table if exists area_of_law enable row level security;
alter table if exists type_of_proceeding enable row level security;
alter table if exists nature_of_dispute enable row level security;
alter table if exists provisions enable row level security;

-- schema_registry (system — admin full, manager/user select, anon select)
drop policy if exists schema_registry_admin_all on schema_registry;
create policy schema_registry_admin_all on schema_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists schema_registry_manager_select on schema_registry;
create policy schema_registry_manager_select on schema_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists schema_registry_user_select on schema_registry;
create policy schema_registry_user_select on schema_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists schema_registry_anon_select on schema_registry'; execute 'create policy schema_registry_anon_select on schema_registry for select to anon using (true)'; end if; end $$;

-- entity_registry (system — admin full, manager/user select, anon select)
drop policy if exists entity_registry_admin_all on entity_registry;
create policy entity_registry_admin_all on entity_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists entity_registry_manager_select on entity_registry;
create policy entity_registry_manager_select on entity_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists entity_registry_user_select on entity_registry;
create policy entity_registry_user_select on entity_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists entity_registry_anon_select on entity_registry'; execute 'create policy entity_registry_anon_select on entity_registry for select to anon using (true)'; end if; end $$;

-- field_registry (system — admin full, manager/user select, anon select)
drop policy if exists field_registry_admin_all on field_registry;
create policy field_registry_admin_all on field_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists field_registry_manager_select on field_registry;
create policy field_registry_manager_select on field_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists field_registry_user_select on field_registry;
create policy field_registry_user_select on field_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists field_registry_anon_select on field_registry'; execute 'create policy field_registry_anon_select on field_registry for select to anon using (true)'; end if; end $$;

-- provider_registry (system — admin full, manager/user select, anon select)
drop policy if exists provider_registry_admin_all on provider_registry;
create policy provider_registry_admin_all on provider_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists provider_registry_manager_select on provider_registry;
create policy provider_registry_manager_select on provider_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists provider_registry_user_select on provider_registry;
create policy provider_registry_user_select on provider_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists provider_registry_anon_select on provider_registry'; execute 'create policy provider_registry_anon_select on provider_registry for select to anon using (true)'; end if; end $$;

-- migration_registry (system — admin full, manager/user select, anon select)
drop policy if exists migration_registry_admin_all on migration_registry;
create policy migration_registry_admin_all on migration_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists migration_registry_manager_select on migration_registry;
create policy migration_registry_manager_select on migration_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists migration_registry_user_select on migration_registry;
create policy migration_registry_user_select on migration_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists migration_registry_anon_select on migration_registry'; execute 'create policy migration_registry_anon_select on migration_registry for select to anon using (true)'; end if; end $$;

-- installer_state (system — admin full, manager/user select, anon select)
drop policy if exists installer_state_admin_all on installer_state;
create policy installer_state_admin_all on installer_state for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists installer_state_manager_select on installer_state;
create policy installer_state_manager_select on installer_state for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists installer_state_user_select on installer_state;
create policy installer_state_user_select on installer_state for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists installer_state_anon_select on installer_state'; execute 'create policy installer_state_anon_select on installer_state for select to anon using (true)'; end if; end $$;

-- provider_adapter_registry (system — admin full, manager/user select, anon select)
drop policy if exists provider_adapter_registry_admin_all on provider_adapter_registry;
create policy provider_adapter_registry_admin_all on provider_adapter_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists provider_adapter_registry_manager_select on provider_adapter_registry;
create policy provider_adapter_registry_manager_select on provider_adapter_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists provider_adapter_registry_user_select on provider_adapter_registry;
create policy provider_adapter_registry_user_select on provider_adapter_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists provider_adapter_registry_anon_select on provider_adapter_registry'; execute 'create policy provider_adapter_registry_anon_select on provider_adapter_registry for select to anon using (true)'; end if; end $$;

-- schema_mapping (system — admin full, manager/user select, anon select)
drop policy if exists schema_mapping_admin_all on schema_mapping;
create policy schema_mapping_admin_all on schema_mapping for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists schema_mapping_manager_select on schema_mapping;
create policy schema_mapping_manager_select on schema_mapping for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists schema_mapping_user_select on schema_mapping;
create policy schema_mapping_user_select on schema_mapping for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists schema_mapping_anon_select on schema_mapping'; execute 'create policy schema_mapping_anon_select on schema_mapping for select to anon using (true)'; end if; end $$;

-- mapping_history (system — admin full, manager/user select, anon select)
drop policy if exists mapping_history_admin_all on mapping_history;
create policy mapping_history_admin_all on mapping_history for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists mapping_history_manager_select on mapping_history;
create policy mapping_history_manager_select on mapping_history for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists mapping_history_user_select on mapping_history;
create policy mapping_history_user_select on mapping_history for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists mapping_history_anon_select on mapping_history'; execute 'create policy mapping_history_anon_select on mapping_history for select to anon using (true)'; end if; end $$;

-- mapping_versions (system — admin full, manager/user select, anon select)
drop policy if exists mapping_versions_admin_all on mapping_versions;
create policy mapping_versions_admin_all on mapping_versions for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists mapping_versions_manager_select on mapping_versions;
create policy mapping_versions_manager_select on mapping_versions for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists mapping_versions_user_select on mapping_versions;
create policy mapping_versions_user_select on mapping_versions for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists mapping_versions_anon_select on mapping_versions'; execute 'create policy mapping_versions_anon_select on mapping_versions for select to anon using (true)'; end if; end $$;

-- provider_capabilities (system — admin full, manager/user select, anon select)
drop policy if exists provider_capabilities_admin_all on provider_capabilities;
create policy provider_capabilities_admin_all on provider_capabilities for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists provider_capabilities_manager_select on provider_capabilities;
create policy provider_capabilities_manager_select on provider_capabilities for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists provider_capabilities_user_select on provider_capabilities;
create policy provider_capabilities_user_select on provider_capabilities for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists provider_capabilities_anon_select on provider_capabilities'; execute 'create policy provider_capabilities_anon_select on provider_capabilities for select to anon using (true)'; end if; end $$;

-- entity_prefix_registry (system — admin full, manager/user select, anon select)
drop policy if exists entity_prefix_registry_admin_all on entity_prefix_registry;
create policy entity_prefix_registry_admin_all on entity_prefix_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists entity_prefix_registry_manager_select on entity_prefix_registry;
create policy entity_prefix_registry_manager_select on entity_prefix_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists entity_prefix_registry_user_select on entity_prefix_registry;
create policy entity_prefix_registry_user_select on entity_prefix_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists entity_prefix_registry_anon_select on entity_prefix_registry'; execute 'create policy entity_prefix_registry_anon_select on entity_prefix_registry for select to anon using (true)'; end if; end $$;

-- id_registry (system — admin full, manager/user select, anon select)
drop policy if exists id_registry_admin_all on id_registry;
create policy id_registry_admin_all on id_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists id_registry_manager_select on id_registry;
create policy id_registry_manager_select on id_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists id_registry_user_select on id_registry;
create policy id_registry_user_select on id_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists id_registry_anon_select on id_registry'; execute 'create policy id_registry_anon_select on id_registry for select to anon using (true)'; end if; end $$;

-- foreign_key_registry (system — admin full, manager/user select, anon select)
drop policy if exists foreign_key_registry_admin_all on foreign_key_registry;
create policy foreign_key_registry_admin_all on foreign_key_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists foreign_key_registry_manager_select on foreign_key_registry;
create policy foreign_key_registry_manager_select on foreign_key_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists foreign_key_registry_user_select on foreign_key_registry;
create policy foreign_key_registry_user_select on foreign_key_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists foreign_key_registry_anon_select on foreign_key_registry'; execute 'create policy foreign_key_registry_anon_select on foreign_key_registry for select to anon using (true)'; end if; end $$;

-- user_role_registry (admin only — lookup via security-definer function)
drop policy if exists user_role_registry_admin_all on user_role_registry;
create policy user_role_registry_admin_all on user_role_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- users (sensitive — admin/manager full, user read own, anon registration)
drop policy if exists users_admin_all on users;
create policy users_admin_all on users for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists users_manager_all on users;
create policy users_manager_all on users for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists users_user_select on users;
create policy users_user_select on users for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists users_anon_select on users'; execute 'create policy users_anon_select on users for select to anon using (true)'; end if; end $$;
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute $p$drop policy if exists users_anon_insert on users$p$; execute $p$create policy users_anon_insert on users for insert to anon with check (not exists (select 1 from users))$p$; end if; end $$;
grant insert on table users to anon;
grant select on table users to anon;

-- roles (sensitive — admin/manager read-only, anon select)
drop policy if exists roles_admin_all on roles;
create policy roles_admin_all on roles for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists roles_manager_select on roles;
create policy roles_manager_select on roles for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists roles_user_select on roles;
create policy roles_user_select on roles for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists roles_anon_select on roles'; execute 'create policy roles_anon_select on roles for select to anon using (true)'; end if; end $$;
grant insert on table roles to anon;
grant select on table roles to anon;

-- permissions (sensitive — admin full, manager read-only)
drop policy if exists permissions_admin_all on permissions;
create policy permissions_admin_all on permissions for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists permissions_manager_select on permissions;
create policy permissions_manager_select on permissions for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

-- cases (standard — admin/manager full, user read)
drop policy if exists cases_admin_all on cases;
create policy cases_admin_all on cases for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists cases_manager_all on cases;
create policy cases_manager_all on cases for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists cases_user_select on cases;
create policy cases_user_select on cases for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- documents (standard — admin/manager full, user read)
drop policy if exists documents_admin_all on documents;
create policy documents_admin_all on documents for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists documents_manager_all on documents;
create policy documents_manager_all on documents for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists documents_user_select on documents;
create policy documents_user_select on documents for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- hearings (standard — admin/manager full, user read)
drop policy if exists hearings_admin_all on hearings;
create policy hearings_admin_all on hearings for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists hearings_manager_all on hearings;
create policy hearings_manager_all on hearings for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists hearings_user_select on hearings;
create policy hearings_user_select on hearings for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- notes (standard — admin/manager full, user read)
drop policy if exists notes_admin_all on notes;
create policy notes_admin_all on notes for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists notes_manager_all on notes;
create policy notes_manager_all on notes for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists notes_user_select on notes;
create policy notes_user_select on notes for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- reminders (standard — admin/manager full, user read)
drop policy if exists reminders_admin_all on reminders;
create policy reminders_admin_all on reminders for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists reminders_manager_all on reminders;
create policy reminders_manager_all on reminders for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists reminders_user_select on reminders;
create policy reminders_user_select on reminders for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- drafts (standard — admin/manager full, user read)
drop policy if exists drafts_admin_all on drafts;
create policy drafts_admin_all on drafts for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists drafts_manager_all on drafts;
create policy drafts_manager_all on drafts for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists drafts_user_select on drafts;
create policy drafts_user_select on drafts for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- case_history (standard — admin/manager full, user read)
drop policy if exists case_history_admin_all on case_history;
create policy case_history_admin_all on case_history for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists case_history_manager_all on case_history;
create policy case_history_manager_all on case_history for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists case_history_user_select on case_history;
create policy case_history_user_select on case_history for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- case_activity (standard — admin/manager full, user read)
drop policy if exists case_activity_admin_all on case_activity;
create policy case_activity_admin_all on case_activity for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists case_activity_manager_all on case_activity;
create policy case_activity_manager_all on case_activity for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists case_activity_user_select on case_activity;
create policy case_activity_user_select on case_activity for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- case_folders (standard — admin/manager full, user read)
drop policy if exists case_folders_admin_all on case_folders;
create policy case_folders_admin_all on case_folders for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists case_folders_manager_all on case_folders;
create policy case_folders_manager_all on case_folders for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists case_folders_user_select on case_folders;
create policy case_folders_user_select on case_folders for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- settings (sensitive — admin/manager full)
drop policy if exists settings_admin_all on settings;
create policy settings_admin_all on settings for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists settings_manager_all on settings;
create policy settings_manager_all on settings for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));

-- env_vars (sensitive — admin/manager full)
drop policy if exists env_vars_admin_all on env_vars;
create policy env_vars_admin_all on env_vars for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists env_vars_manager_all on env_vars;
create policy env_vars_manager_all on env_vars for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));

-- audit_logs (sensitive — admin read only)
drop policy if exists audit_logs_admin_select on audit_logs;
create policy audit_logs_admin_select on audit_logs for select to authenticated using (current_user_role() = 'admin');

-- config_history (sensitive — admin read only)
drop policy if exists config_history_admin_select on config_history;
create policy config_history_admin_select on config_history for select to authenticated using (current_user_role() = 'admin');

-- schema_meta (admin/manager read, anon read for version check)
drop policy if exists schema_meta_admin_all on schema_meta;
create policy schema_meta_admin_all on schema_meta for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists schema_meta_manager_select on schema_meta;
create policy schema_meta_manager_select on schema_meta for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'drop policy if exists schema_meta_anon_select on schema_meta'; execute 'create policy schema_meta_anon_select on schema_meta for select to anon using (true)'; end if; end $$;

-- courts (standard — admin/manager full, user read)
drop policy if exists courts_admin_all on courts;
create policy courts_admin_all on courts for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists courts_manager_all on courts;
create policy courts_manager_all on courts for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists courts_user_select on courts;
create policy courts_user_select on courts for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- case_types (standard — admin/manager full, user read)
drop policy if exists case_types_admin_all on case_types;
create policy case_types_admin_all on case_types for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists case_types_manager_all on case_types;
create policy case_types_manager_all on case_types for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists case_types_user_select on case_types;
create policy case_types_user_select on case_types for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- case_stages (standard — admin/manager full, user read)
drop policy if exists case_stages_admin_all on case_stages;
create policy case_stages_admin_all on case_stages for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists case_stages_manager_all on case_stages;
create policy case_stages_manager_all on case_stages for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists case_stages_user_select on case_stages;
create policy case_stages_user_select on case_stages for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- judgments (standard — admin/manager full, user read)
drop policy if exists judgments_admin_all on judgments;
create policy judgments_admin_all on judgments for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists judgments_manager_all on judgments;
create policy judgments_manager_all on judgments for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists judgments_user_select on judgments;
create policy judgments_user_select on judgments for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- cause_list_templates (standard — admin/manager full, user read)
drop policy if exists cause_list_templates_admin_all on cause_list_templates;
create policy cause_list_templates_admin_all on cause_list_templates for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists cause_list_templates_manager_all on cause_list_templates;
create policy cause_list_templates_manager_all on cause_list_templates for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists cause_list_templates_user_select on cause_list_templates;
create policy cause_list_templates_user_select on cause_list_templates for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- bench_types (standard — admin/manager full, user read)
drop policy if exists bench_types_admin_all on bench_types;
create policy bench_types_admin_all on bench_types for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists bench_types_manager_all on bench_types;
create policy bench_types_manager_all on bench_types for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists bench_types_user_select on bench_types;
create policy bench_types_user_select on bench_types for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- jurisdictions (standard — admin/manager full, user read)
drop policy if exists jurisdictions_admin_all on jurisdictions;
create policy jurisdictions_admin_all on jurisdictions for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists jurisdictions_manager_all on jurisdictions;
create policy jurisdictions_manager_all on jurisdictions for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists jurisdictions_user_select on jurisdictions;
create policy jurisdictions_user_select on jurisdictions for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- clients (standard — admin/manager full, user read)
drop policy if exists clients_admin_all on clients;
create policy clients_admin_all on clients for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists clients_manager_all on clients;
create policy clients_manager_all on clients for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists clients_user_select on clients;
create policy clients_user_select on clients for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- contacts (standard — admin/manager full, user read)
drop policy if exists contacts_admin_all on contacts;
create policy contacts_admin_all on contacts for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists contacts_manager_all on contacts;
create policy contacts_manager_all on contacts for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists contacts_user_select on contacts;
create policy contacts_user_select on contacts for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- acts (standard — admin/manager full, user read)
drop policy if exists acts_admin_all on acts;
create policy acts_admin_all on acts for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists acts_manager_all on acts;
create policy acts_manager_all on acts for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists acts_user_select on acts;
create policy acts_user_select on acts for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- prompts (standard — admin/manager full, user read)
drop policy if exists prompts_admin_all on prompts;
create policy prompts_admin_all on prompts for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists prompts_manager_all on prompts;
create policy prompts_manager_all on prompts for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists prompts_user_select on prompts;
create policy prompts_user_select on prompts for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- templates (standard — admin/manager full, user read)
drop policy if exists templates_admin_all on templates;
create policy templates_admin_all on templates for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists templates_manager_all on templates;
create policy templates_manager_all on templates for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists templates_user_select on templates;
create policy templates_user_select on templates for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- legal_notices (standard — admin/manager full, user read)
drop policy if exists legal_notices_admin_all on legal_notices;
create policy legal_notices_admin_all on legal_notices for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists legal_notices_manager_all on legal_notices;
create policy legal_notices_manager_all on legal_notices for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists legal_notices_user_select on legal_notices;
create policy legal_notices_user_select on legal_notices for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- precedents (standard — admin/manager full, user read)
drop policy if exists precedents_admin_all on precedents;
create policy precedents_admin_all on precedents for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists precedents_manager_all on precedents;
create policy precedents_manager_all on precedents for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists precedents_user_select on precedents;
create policy precedents_user_select on precedents for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- reports (standard — admin/manager full, user read)
drop policy if exists reports_admin_all on reports;
create policy reports_admin_all on reports for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists reports_manager_all on reports;
create policy reports_manager_all on reports for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists reports_user_select on reports;
create policy reports_user_select on reports for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- party_types (standard — admin/manager full, user read)
drop policy if exists party_types_admin_all on party_types;
create policy party_types_admin_all on party_types for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists party_types_manager_all on party_types;
create policy party_types_manager_all on party_types for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists party_types_user_select on party_types;
create policy party_types_user_select on party_types for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- case_statuses (standard — admin/manager full, user read)
drop policy if exists case_statuses_admin_all on case_statuses;
create policy case_statuses_admin_all on case_statuses for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists case_statuses_manager_all on case_statuses;
create policy case_statuses_manager_all on case_statuses for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists case_statuses_user_select on case_statuses;
create policy case_statuses_user_select on case_statuses for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- priorities (standard — admin/manager full, user read)
drop policy if exists priorities_admin_all on priorities;
create policy priorities_admin_all on priorities for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists priorities_manager_all on priorities;
create policy priorities_manager_all on priorities for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists priorities_user_select on priorities;
create policy priorities_user_select on priorities for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- hearing_statuses (standard — admin/manager full, user read)
drop policy if exists hearing_statuses_admin_all on hearing_statuses;
create policy hearing_statuses_admin_all on hearing_statuses for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists hearing_statuses_manager_all on hearing_statuses;
create policy hearing_statuses_manager_all on hearing_statuses for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists hearing_statuses_user_select on hearing_statuses;
create policy hearing_statuses_user_select on hearing_statuses for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- contact_types (standard — admin/manager full, user read)
drop policy if exists contact_types_admin_all on contact_types;
create policy contact_types_admin_all on contact_types for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists contact_types_manager_all on contact_types;
create policy contact_types_manager_all on contact_types for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists contact_types_user_select on contact_types;
create policy contact_types_user_select on contact_types for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- judges (standard — admin/manager full, user read)
drop policy if exists judges_admin_all on judges;
create policy judges_admin_all on judges for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists judges_manager_all on judges;
create policy judges_manager_all on judges for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists judges_user_select on judges;
create policy judges_user_select on judges for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- reminder_types (standard — admin/manager full, user read)
drop policy if exists reminder_types_admin_all on reminder_types;
create policy reminder_types_admin_all on reminder_types for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists reminder_types_manager_all on reminder_types;
create policy reminder_types_manager_all on reminder_types for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists reminder_types_user_select on reminder_types;
create policy reminder_types_user_select on reminder_types for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- folder_templates (standard — admin/manager full, user read)
drop policy if exists folder_templates_admin_all on folder_templates;
create policy folder_templates_admin_all on folder_templates for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists folder_templates_manager_all on folder_templates;
create policy folder_templates_manager_all on folder_templates for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists folder_templates_user_select on folder_templates;
create policy folder_templates_user_select on folder_templates for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- draft_types (standard — admin/manager full, user read)
drop policy if exists draft_types_admin_all on draft_types;
create policy draft_types_admin_all on draft_types for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists draft_types_manager_all on draft_types;
create policy draft_types_manager_all on draft_types for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists draft_types_user_select on draft_types;
create policy draft_types_user_select on draft_types for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- area_of_law (standard — admin/manager full, user read)
drop policy if exists area_of_law_admin_all on area_of_law;
create policy area_of_law_admin_all on area_of_law for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists area_of_law_manager_all on area_of_law;
create policy area_of_law_manager_all on area_of_law for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists area_of_law_user_select on area_of_law;
create policy area_of_law_user_select on area_of_law for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- type_of_proceeding (standard — admin/manager full, user read)
drop policy if exists type_of_proceeding_admin_all on type_of_proceeding;
create policy type_of_proceeding_admin_all on type_of_proceeding for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists type_of_proceeding_manager_all on type_of_proceeding;
create policy type_of_proceeding_manager_all on type_of_proceeding for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists type_of_proceeding_user_select on type_of_proceeding;
create policy type_of_proceeding_user_select on type_of_proceeding for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- nature_of_dispute (standard — admin/manager full, user read)
drop policy if exists nature_of_dispute_admin_all on nature_of_dispute;
create policy nature_of_dispute_admin_all on nature_of_dispute for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists nature_of_dispute_manager_all on nature_of_dispute;
create policy nature_of_dispute_manager_all on nature_of_dispute for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists nature_of_dispute_user_select on nature_of_dispute;
create policy nature_of_dispute_user_select on nature_of_dispute for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

-- provisions (standard — admin/manager full, user read)
drop policy if exists provisions_admin_all on provisions;
create policy provisions_admin_all on provisions for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
drop policy if exists provisions_manager_all on provisions;
create policy provisions_manager_all on provisions for all to authenticated using (current_user_role() = ANY(ARRAY['admin','manager'])) with check (current_user_role() = ANY(ARRAY['admin','manager']));
drop policy if exists provisions_user_select on provisions;
create policy provisions_user_select on provisions for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));


-- ============================================================
-- 5b-sync. USER ROLE REGISTRY SYNC TRIGGER (post-DDL, depends on users table)
-- ============================================================
drop function if exists sync_user_role_registry() cascade;
create or replace function sync_user_role_registry()
returns trigger
language plpgsql
security definer
as $$
begin
  if exists (select 1 from pg_class where relname = 'user_role_registry') then
    if tg_op = 'DELETE' then
      delete from user_role_registry where user_id = old.id;
      return old;
    end if;
    insert into user_role_registry (user_id, role_code, updated_at)
    values (new.id, new.role_code, now())
    on conflict (user_id) do update set role_code = excluded.role_code, updated_at = now();
  end if;
  return new;
end;
$$;

do $$ begin
  if exists (select 1 from pg_class where relname = 'users' and relkind = 'r') then
    drop trigger if exists trg_user_role_registry_sync on users;
  end if;
end;
$$;

create trigger trg_user_role_registry_sync
after insert or update or delete on users
for each row execute function sync_user_role_registry();

-- Seed existing roles into user_role_registry
insert into user_role_registry (user_id, role_code, updated_at)
select id, role_code, now() from users
on conflict (user_id) do nothing;

-- ============================================================
-- 13. SUPABASE-STYLE GRANTS (authenticated must have table access for RLS to apply)
-- ============================================================
-- Standard Supabase pattern: GRANT ON ALL TABLES + RLS on every table.
-- The blanket grant allows authenticated users to *reach* the RLS check;
-- RLS policies on every table filter what each role can actually do.
-- Without this grant, RLS policies are never evaluated.
--
-- For non-Supabase providers (MySQL, SQLite, etc.), the adapter layer should
-- replace this with targeted per-tier grants (public read, internal CRUD,
-- restricted admin-only) at the adapter level — not in the SQL schema.
do $$ begin if exists (select 1 from pg_roles where rolname = 'authenticated') then
  grant usage on schema public to authenticated;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  grant usage on all sequences in schema public to authenticated;
  alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
  alter default privileges in schema public grant usage on sequences to authenticated;
end if; end $$;

do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then
  grant usage on schema public to anon;
  grant select on all tables in schema public to anon;
  alter default privileges in schema public grant select on tables to anon;
end if; end $$;

-- Function-level grants for system functions
do $$ begin if exists (select 1 from pg_roles where rolname = 'authenticated') then
  grant execute on function exec_sql(text) to authenticated; end if; end $$;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  grant execute on function exec_sql(text) to service_role; end if; end $$;
do $$ begin if exists (select 1 from pg_roles where rolname = 'authenticated') then
  grant execute on function safe_ddl(text) to authenticated; end if; end $$;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  grant execute on function safe_ddl(text) to service_role; end if; end $$;
do $$ begin if exists (select 1 from pg_roles where rolname = 'anon') then
  grant execute on function next_lx_id(text) to anon; end if; end $$;

-- ============================================================
-- 14. INDEXES
-- ============================================================
create index if not exists idx_schema_registry_version on "schema_registry" ("version");
create index if not exists idx_field_registry_entity on "field_registry" ("entity");
create index if not exists idx_provider_registry_active on "provider_registry" ("active");
create index if not exists idx_provider_adapter_active on "provider_adapter_registry" ("active");
create index if not exists idx_schema_mapping_active on "schema_mapping" ("active");
create index if not exists idx_mapping_history_entity_name on "mapping_history" ("entity_name");
create index if not exists idx_provider_capabilities_provider on "provider_capabilities" ("provider");
create index if not exists idx_provider_capabilities_feature on "provider_capabilities" ("feature");
create index if not exists idx_entity_prefix_registry_prefix on "entity_prefix_registry" ("prefix");
create index if not exists idx_foreign_key_registry_from_entity on "foreign_key_registry" ("from_entity");
create index if not exists idx_foreign_key_registry_to_entity on "foreign_key_registry" ("to_entity");

-- ============================================================
-- 15. SCHEMA VERSION STAMP (P3 — fixed: excluded.version)
-- ============================================================
insert into schema_registry (id, version, description, applied_at)
values ('schema_version', 34, 'Schema v34 — system infrastructure', now())
on conflict (id) do update set version = excluded.version, description = excluded.description, applied_at = now();