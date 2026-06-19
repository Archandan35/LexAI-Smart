// Step 003 — All registry tables (schema_registry, entity_registry, field_registry, provider_registry, installer_state)
export const version = 3;
export const description = 'Create registry tables';
export const sql = `
create table if not exists schema_registry (
  id text primary key default gen_random_uuid()::text,
  version integer not null default 0,
  description text,
  checksum text,
  applied_at timestamptz default now(),
  applied_by text default current_user
);

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
`;
