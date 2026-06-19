// Step 009 — RLS enable + policies + grants + indexes + version stamp
export const version = 9;
export const description = 'Enable RLS, create named policies, grants, indexes, schema version stamp';
export const sql = `
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

-- Named RLS policies (P2: TO authenticated + current_user_role(); P3: {table}_{role}_{operation})
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

-- Grants (P2: TO authenticated)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant usage on schema public to anon;
grant select on all tables in schema public to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage on sequences to authenticated;

-- Indexes
create index if not exists idx_schema_registry_version on schema_registry (version);
create index if not exists idx_field_registry_entity on field_registry (entity);
create index if not exists idx_provider_registry_active on provider_registry (active);
create index if not exists idx_provider_adapter_active on provider_adapter_registry (active);
create index if not exists idx_schema_mapping_active on schema_mapping (active);
create index if not exists idx_mapping_history_entity on mapping_history (entity_name);
create index if not exists idx_provider_capabilities_provider on provider_capabilities (provider);
create index if not exists idx_provider_capabilities_feature on provider_capabilities (feature);
create index if not exists idx_entity_prefix_registry_prefix on entity_prefix_registry (prefix);
create index if not exists idx_foreign_key_registry_from on foreign_key_registry (from_entity);
create index if not exists idx_foreign_key_registry_to on foreign_key_registry (to_entity);

-- Schema version stamp
insert into schema_registry (id, version, description, applied_at)
values ('schema_version', 20, 'Schema v20 — modular migrations, fixed regex, unique policies, Supabase auth', now())
on conflict (id) do update set version = 20, description = excluded.description, applied_at = now();
`;
