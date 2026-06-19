// Step 001 — migration_registry table (must exist first for audit logging)
export const version = 1;
export const description = 'Create migration_registry table';
export const sql = `
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
`;
