// Step 005 — Provider adapter + entity prefix + ID + FK registry tables
export const version = 5;
export const description = 'Create provider adapter, entity prefix, id_registry, foreign_key_registry';
export const sql = `
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

create table if not exists entity_prefix_registry (
  entity text primary key,
  prefix text not null,
  label text,
  padding integer not null default 5,
  current_sequence integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists id_registry (
  entity text primary key,
  prefix text not null,
  sequence integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
`;
