// Step 002 — RBAC roles + exec_sql + safe_ddl + safe_create_fk
export const version = 2;
export const description = 'Create RBAC roles, exec_sql, safe_ddl, safe_create_fk functions';
export const sql = `
do $$ begin
  if not exists (select from pg_roles where rolname = 'lexai_admin') then
    create role lexai_admin;
  end if;
  if not exists (select from pg_roles where rolname = 'lexai_manager') then
    create role lexai_manager;
  end if;
  if not exists (select from pg_roles where rolname = 'lexai_user') then
    create role lexai_user;
  end if;
end $$;

create or replace function exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  if exists (select 1 from pg_tables where tablename = 'migration_registry') then
    insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)
    values (gen_random_uuid()::text, 0, 'exec_sql', md5(sql), now(), 0, true);
  end if;
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
  if v_upper ~ '^\\s*DROP\\s+(DATABASE|SCHEMA|TABLE|VIEW|FUNCTION|INDEX|ROLE|POLICY|TRIGGER|EXTENSION|PUBLICATION|SUBSCRIPTION)' then
    raise exception 'safe_ddl: DROP is not permitted';
  end if;
  if v_upper ~ '^\\s*TRUNCATE' then
    raise exception 'safe_ddl: TRUNCATE is not permitted';
  end if;
  if v_upper ~ 'ALTER\\s+TABLE.*DROP\\s+(COLUMN|CONSTRAINT)' then
    raise exception 'safe_ddl: ALTER TABLE DROP is not permitted';
  end if;
  if v_upper ~ '^\\s*(GRANT|REVOKE)' then
    raise exception 'safe_ddl: GRANT/REVOKE is not permitted';
  end if;
  if v_upper ~ '^\\s*(DELETE|UPDATE|INSERT|TRUNCATE)\\s' then
    raise exception 'safe_ddl: DML statements are not permitted; use CRUD APIs';
  end if;
  if v_upper ~ '^\\s*CREATE\\s+(DATABASE|SCHEMA|ROLE|USER|EXTENSION)\\s' then
    raise exception 'safe_ddl: CREATE DATABASE/SCHEMA/ROLE/USER/EXTENSION is not permitted';
  end if;
  if v_upper ~ '^\\s*ALTER\\s+(DATABASE|SCHEMA|ROLE|USER)\\s' then
    raise exception 'safe_ddl: ALTER DATABASE/SCHEMA/ROLE/USER is not permitted';
  end if;
  if not (
    v_upper ~ '^\\s*CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s' or
    v_upper ~ '^\\s*CREATE\\s+INDEX\\s+IF\\s+NOT\\s+EXISTS\\s' or
    v_upper ~ 'ALTER\\s+TABLE.*ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS' or
    v_upper ~ 'ALTER\\s+TABLE.*ADD\\s+CONSTRAINT' or
    v_upper ~ '^\\s*CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s' or
    v_upper ~ '^\\s*ALTER\\s+TABLE\\s+IF\\s+EXISTS\\s' or
    v_upper ~ 'ALTER\\s+TABLE.*ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY' or
    v_upper ~ 'ALTER\\s+TABLE.*DISABLE\\s+ROW\\s+LEVEL\\s+SECURITY' or
    v_upper ~ '^\\s*CREATE\\s+POLICY\\s' or
    v_upper ~ '^\\s*ALTER\\s+POLICY\\s' or
    v_upper ~ '^\\s*DROP\\s+POLICY\\s+IF\\s+EXISTS\\s' or
    v_upper ~ '^\\s*COMMENT\\s+ON\\s' or
    v_upper ~ '^\\s*DO\\s+\\$\\$' or
    v_upper ~ '^\\s*--'
  ) then
    raise exception 'safe_ddl: Statement does not match any allowed pattern: %', substr(sql, 1, 80);
  end if;
  if exists (select 1 from pg_tables where tablename = 'migration_registry') then
    insert into migration_registry (id, version, description, sql_hash, applied_at, duration_ms, success)
    values (gen_random_uuid()::text, 0, 'safe_ddl', md5(sql), now(), 0, true);
  end if;
  execute sql;
end;
$$;

grant execute on function exec_sql(text) to lexai_admin;
grant execute on function safe_ddl(text) to lexai_manager;

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
    where t.relname = p_source_table and c.conname = p_constraint_name
  ) into v_exists;
  if v_exists then return; end if;
  if not exists (select 1 from pg_class where relname = p_source_table) then return; end if;
  if not exists (select 1 from pg_class where relname = p_target_table) then return; end if;
  if not exists (
    select 1 from pg_attribute a join pg_class t on t.oid = a.attrelid
    where t.relname = p_source_table and a.attname = p_source_column and a.attnum > 0
  ) then return; end if;
  if not exists (
    select 1 from pg_attribute a join pg_class t on t.oid = a.attrelid
    where t.relname = p_target_table and a.attname = p_target_column and a.attnum > 0
  ) then return; end if;
  execute format($fmt$
    alter table %I add constraint %I
    foreign key (%I) references %I (%I) on delete %s
  $fmt$, p_source_table, p_constraint_name, p_source_column, p_target_table, p_target_column, upper(p_on_delete));
end;
$safe_fk$;
`;
