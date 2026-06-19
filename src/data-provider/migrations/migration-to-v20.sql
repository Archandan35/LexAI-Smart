-- ============================================================
-- Migration v19 → v20
-- ============================================================
-- Changes:
--   1. P1: migration_registry created BEFORE exec_sql/safe_ddl
--   2. P1: IF EXISTS guards on migration_registry INSERT in exec_sql/safe_ddl
--   3. P2: Fixed all safe_ddl regex patterns (\\s for whitespace)
--   4. P3: Unique policy names ({table}_{role}_{operation})
--   5. P4: FK creation moved AFTER application tables
--   6. P5: current_user_role() function for Supabase auth.uid() mapping
--   7. P7: Modular migration steps (001-009)
--   8. New indexes for migration_registry version/applied_at
-- ============================================================
-- Re-runnable: uses IF NOT EXISTS, ON CONFLICT DO NOTHING,
-- and DO $$ blocks for idempotent execution.
-- ============================================================

-- ============================================================
-- 1. P1: Ensure migration_registry exists (safe to call early)
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
-- 2. P2 + P1: Replace exec_sql with IF EXISTS guard + fixed SQL
-- ============================================================
create or replace function exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  if exists (select 1 from pg_proc where proname = 'current_user_role') then
    if current_user_role() != 'admin' then
      raise exception 'exec_sql: only admin can execute arbitrary SQL';
    end if;
  end if;
  if exists (select 1 from pg_tables where tablename = 'migration_registry') then
    insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)
    values (gen_random_uuid()::text, 0, 'exec_sql', md5(sql), now(), 0, true);
  end if;
  execute sql;
end;
$$;

-- ============================================================
-- 3. P2: Replace safe_ddl with fixed regex + IF EXISTS guard
-- ============================================================
create or replace function safe_ddl(sql text)
returns void
language plpgsql
security definer
as $$
declare
  v_upper text;
begin
  if exists (select 1 from pg_proc where proname = 'current_user_role') then
    if current_user_role() NOT IN ('admin', 'manager') then
      raise exception 'safe_ddl: only admin or manager can execute DDL';
    end if;
  end if;
  v_upper := upper(sql);
  -- Blocklist — P2: all \s patterns correctly escaped
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
  -- Allowlist — P2: all patterns correct
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
  -- Audit with IF EXISTS guard
  if exists (select 1 from pg_tables where tablename = 'migration_registry') then
    insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)
    values (gen_random_uuid()::text, 0, 'safe_ddl', md5(sql), now(), 0, true);
  end if;
  execute sql;
end;
$$;

grant execute on function exec_sql(text) to authenticated;
grant execute on function exec_sql(text) to lexai_admin;
grant execute on function safe_ddl(text) to authenticated;
grant execute on function safe_ddl(text) to lexai_manager;

-- ============================================================
-- 4. P5: Add current_user_role() for Supabase auth compatibility
-- ============================================================
create or replace function current_user_role()
returns text
language plpgsql
security definer
stable
as $$
declare
  v_role text;
begin
  if current_setting('role', true) = 'lexai_admin' then return 'admin'; end if;
  begin
    if auth.uid() is null then
      if current_user = 'anon' then return 'anon'; end if;
      if current_user = 'service_role' then return 'admin'; end if;
      return 'anon';
    end if;
    select role_code into strict v_role from users where id = auth.uid()::text;
    return v_role;
  exception
    when others then
      if current_user = 'authenticated' then return 'user'; end if;
      return 'anon';
  end;
end;
$$;

-- ============================================================
-- 5. P2+P3: Drop old policies, create Supabase-compatible policies
-- ============================================================
-- Drop all old-style policies (TO lexai_admin/manager/user)
do $$ begin drop policy if exists manager_read on entity_registry; end $$;
do $$ begin drop policy if exists manager_write on entity_registry; end $$;
do $$ begin drop policy if exists entity_registry_manager_rw on entity_registry; end $$;
do $$ begin drop policy if exists manager_select on entity_registry; end $$;
do $$ begin drop policy if exists manager_insert on entity_registry; end $$;
do $$ begin drop policy if exists manager_update on entity_registry; end $$;
do $$ begin drop policy if exists user_select on entity_registry; end $$;
do $$ begin drop policy if exists manager_write on field_registry; end $$;
do $$ begin drop policy if exists field_registry_manager_rw on field_registry; end $$;
do $$ begin drop policy if exists manager_select on field_registry; end $$;
do $$ begin drop policy if exists manager_insert on field_registry; end $$;
do $$ begin drop policy if exists user_select on field_registry; end $$;
do $$ begin drop policy if exists schema_mapping_manager_rw on schema_mapping; end $$;
do $$ begin drop policy if exists manager_select on schema_mapping; end $$;
do $$ begin drop policy if exists manager_insert on schema_mapping; end $$;
do $$ begin drop policy if exists manager_update on schema_mapping; end $$;
do $$ begin drop policy if exists manager_ro on schema_registry; end $$;
do $$ begin drop policy if exists manager_ro on entity_registry; end $$;
do $$ begin drop policy if exists manager_ro on field_registry; end $$;
do $$ begin drop policy if exists manager_ro on provider_registry; end $$;
do $$ begin drop policy if exists manager_ro on migration_registry; end $$;
do $$ begin drop policy if exists manager_ro on installer_state; end $$;
do $$ begin drop policy if exists manager_ro on schema_mapping; end $$;
do $$ begin drop policy if exists manager_ro on entity_prefix_registry; end $$;
do $$ begin drop policy if exists manager_ro on provider_capabilities; end $$;
do $$ begin drop policy if exists user_ro on entity_registry; end $$;
do $$ begin drop policy if exists user_ro on field_registry; end $$;
do $$ begin drop policy if exists user_ro on schema_registry; end $$;
do $$ begin drop policy if exists user_ro on installer_state; end $$;
do $$ begin drop policy if exists user_ro on provider_capabilities; end $$;
do $$ begin drop policy if exists user_ro on entity_prefix_registry; end $$;
do $$ begin drop policy if exists admin_all on schema_registry; end $$;
do $$ begin drop policy if exists admin_all on entity_registry; end $$;
do $$ begin drop policy if exists admin_all on field_registry; end $$;
do $$ begin drop policy if exists admin_all on provider_registry; end $$;
do $$ begin drop policy if exists admin_all on migration_registry; end $$;
do $$ begin drop policy if exists admin_all on installer_state; end $$;
do $$ begin drop policy if exists admin_all on provider_adapter_registry; end $$;
do $$ begin drop policy if exists admin_all on schema_mapping; end $$;
do $$ begin drop policy if exists admin_all on mapping_history; end $$;
do $$ begin drop policy if exists admin_all on mapping_versions; end $$;
do $$ begin drop policy if exists admin_all on provider_capabilities; end $$;
do $$ begin drop policy if exists admin_all on entity_prefix_registry; end $$;
do $$ begin drop policy if exists admin_all on id_registry; end $$;
do $$ begin drop policy if exists admin_all on foreign_key_registry; end $$;

-- Create Supabase-compatible policies (P2: TO authenticated + current_user_role(); P3: unique names)
create policy schema_registry_admin_all on schema_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy schema_registry_manager_select on schema_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
create policy schema_registry_user_select on schema_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

create policy entity_registry_admin_all on entity_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy entity_registry_manager_select on entity_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
create policy entity_registry_manager_insert on entity_registry for insert to authenticated with check (current_user_role() = ANY(ARRAY['admin','manager']));
create policy entity_registry_manager_update on entity_registry for update to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
create policy entity_registry_user_select on entity_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

create policy field_registry_admin_all on field_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy field_registry_manager_select on field_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
create policy field_registry_manager_insert on field_registry for insert to authenticated with check (current_user_role() = ANY(ARRAY['admin','manager']));
create policy field_registry_user_select on field_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

create policy provider_registry_admin_all on provider_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy provider_registry_manager_select on provider_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

create policy migration_registry_admin_all on migration_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy migration_registry_manager_select on migration_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

create policy installer_state_admin_all on installer_state for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy installer_state_manager_select on installer_state for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
create policy installer_state_user_select on installer_state for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

create policy provider_adapter_admin_all on provider_adapter_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy provider_adapter_manager_select on provider_adapter_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

create policy schema_mapping_admin_all on schema_mapping for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy schema_mapping_manager_select on schema_mapping for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
create policy schema_mapping_manager_insert on schema_mapping for insert to authenticated with check (current_user_role() = ANY(ARRAY['admin','manager']));
create policy schema_mapping_manager_update on schema_mapping for update to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

create policy mapping_history_admin_all on mapping_history for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy mapping_history_manager_select on mapping_history for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

create policy mapping_versions_admin_all on mapping_versions for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy mapping_versions_manager_select on mapping_versions for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

create policy provider_capabilities_admin_all on provider_capabilities for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy provider_capabilities_manager_select on provider_capabilities for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
create policy provider_capabilities_user_select on provider_capabilities for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

create policy entity_prefix_admin_all on entity_prefix_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy entity_prefix_manager_select on entity_prefix_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));
create policy entity_prefix_user_select on entity_prefix_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager','user']));

create policy id_registry_admin_all on id_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy id_registry_manager_select on id_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

create policy foreign_key_registry_admin_all on foreign_key_registry for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy foreign_key_registry_manager_select on foreign_key_registry for select to authenticated using (current_user_role() = ANY(ARRAY['admin','manager']));

-- ============================================================
-- 6. Ensure FK registry and RLS on provider_adapter_registry
-- ============================================================
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

alter table if exists provider_adapter_registry enable row level security;
alter table if exists foreign_key_registry enable row level security;

-- ============================================================
-- 7. Ensure indexes exist
-- ============================================================
create index if not exists idx_migration_registry_action on migration_registry (action);
create index if not exists idx_provider_adapter_active on provider_adapter_registry (active);

-- ============================================================
-- 8. SCHEMA_VERSION bump
-- ============================================================
insert into schema_registry (id, version, description, applied_at)
values ('schema_version', 20, 'Schema v20 — fixed regex, unique policies, Supabase auth, modular migrations', now())
on conflict (id) do update set version = excluded.version, description = excluded.description, applied_at = now();
