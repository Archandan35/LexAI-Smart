// Step 004 — Schema mapping tables (schema_mapping, mapping_history, mapping_versions, provider_capabilities)
export const version = 4;
export const description = 'Create schema mapping tables';
export const sql = `
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

create table if not exists mapping_history (
  id text primary key default gen_random_uuid()::text,
  entity_name text not null,
  old_table text,
  new_table text not null,
  changed_by text,
  change_reason text,
  created_at timestamptz default now()
);

create table if not exists mapping_versions (
  id text primary key default gen_random_uuid()::text,
  version integer not null,
  snapshot jsonb not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists provider_capabilities (
  id text primary key default gen_random_uuid()::text,
  provider text not null,
  feature text not null,
  supported boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  detected_at timestamptz default now()
);
`;
