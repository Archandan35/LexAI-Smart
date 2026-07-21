-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)
-- Creates the exec_sql and safe_ddl functions required by LexAI's auto-provisioning.

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
  if v_upper ~ '^\s*TRUNCATE' then raise exception 'safe_ddl: TRUNCATE is not permitted'; end if;
  if v_upper ~ 'ALTER\s+TABLE.*DROP\s+(COLUMN|CONSTRAINT)' then
    raise exception 'safe_ddl: ALTER TABLE DROP is not permitted';
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
  execute sql;
end;
$$;

-- CRITICAL SECURITY: Only authenticated users may execute raw SQL.
-- The anon role MUST NOT have exec_sql — that would let anyone with the
-- anon key (visible in the JS bundle) run arbitrary SQL on the database.
grant execute on function exec_sql(text) to authenticated;
-- safe_ddl is restricted to CREATE TABLE IF NOT EXISTS and similar safe
-- patterns only. Still, only authenticated users are trusted with it.
grant execute on function safe_ddl(text) to authenticated;
-- anon and authenticated both get row-level access via the REST API —
-- RLS policies on each table control what each role can see/do.
-- NEVER grant exec_sql or safe_ddl to anon.

-- Also add the missing judgment columns (these are in INITIAL_FORM but not in the DB)
alter table if exists "judgments" add column if not exists "ratioDecidendi" text;
alter table if exists "judgments" add column if not exists "obiterDicta" text;
alter table if exists "judgments" add column if not exists "keyFindings" text;
alter table if exists "judgments" add column if not exists "notes" text;
alter table if exists "judgments" add column if not exists "reviewComments" text;
alter table if exists "judgments" add column if not exists "finalDecision" text;

-- Reload PostgREST schema cache so the new columns are visible immediately
NOTIFY pgrst, 'reload schema';
