// Infrastructure schema registrations — registers all system tables in the
// EntityRegistry so the migration engine and schema service know about them.
// These are NOT user-facing schemas; they are the provider-side counterpart
// to the systemSql() block in SchemaCompiler.js.
//
// Each infra table is registered as a non-core schema so it participates in
// schema diff/repair/export without being part of the core install set.

import { EntityRegistry } from '@/core/EntityRegistry.js';

const INFRA_TABLES = [
  {
    collection: 'schema_registry',
    label: 'Schema Registry',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', version: 'number', description: 'string', checksum: 'string', applied_at: 'datetime', applied_by: 'string' },
    indexes: ['version'],
  },
  {
    collection: 'entity_registry',
    label: 'Entity Registry',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', name: 'string', label: 'string', table_name: 'string', primary_key: 'string', core: 'boolean', fields: 'json', indexes: 'json', created_at: 'datetime', updated_at: 'datetime' },
    indexes: ['name'],
  },
  {
    collection: 'field_registry',
    label: 'Field Registry',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', entity: 'string', field_name: 'string', field_type: 'string', required: 'boolean', unique_field: 'boolean', default_value: 'string', created_at: 'datetime' },
    indexes: ['entity'],
  },
  {
    collection: 'provider_registry',
    label: 'Provider Registry',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', provider_type: 'string', label: 'string', config: 'json', active: 'boolean', connected_at: 'datetime', created_at: 'datetime', updated_at: 'datetime' },
    indexes: ['active'],
  },
  {
    collection: 'migration_registry',
    label: 'Migration Registry',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', version: 'number', description: 'string', sql_hash: 'string', applied_at: 'datetime', duration_ms: 'number', success: 'boolean', error: 'string' },
    indexes: ['version', 'applied_at'],
  },
  {
    collection: 'installer_state',
    label: 'Installer State',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', install_status: 'string', schema_version: 'number', installer_version: 'number', provider: 'string', database_type: 'string', verified_at: 'datetime', installed_at: 'datetime', updated_at: 'datetime' },
  },
  {
    collection: 'schema_mapping',
    label: 'Schema Mapping',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', entity_name: 'string', provider_table: 'string', description: 'string', active: 'boolean', version: 'number', created_at: 'datetime', updated_at: 'datetime' },
    indexes: ['active'],
  },
  {
    collection: 'mapping_history',
    label: 'Mapping History',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', entity_name: 'string', old_table: 'string', new_table: 'string', changed_by: 'string', change_reason: 'string', created_at: 'datetime' },
    indexes: ['entity_name'],
  },
  {
    collection: 'mapping_versions',
    label: 'Mapping Versions',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', version: 'number', snapshot: 'json', description: 'string', created_at: 'datetime' },
  },
  {
    collection: 'provider_capabilities',
    label: 'Provider Capabilities',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', provider: 'string', feature: 'string', supported: 'boolean', metadata: 'json', detected_at: 'datetime' },
    indexes: ['provider', 'feature'],
  },
  {
    collection: 'entity_prefix_registry',
    label: 'Entity Prefix Registry',
    primaryKey: 'entity',
    core: false,
    fields: { entity: 'string', prefix: 'string', label: 'string', padding: 'number', current_sequence: 'number', created_at: 'datetime', updated_at: 'datetime' },
    indexes: ['prefix'],
  },
  {
    collection: 'id_registry',
    label: 'ID Registry',
    primaryKey: 'entity',
    core: false,
    fields: { entity: 'string', prefix: 'string', sequence: 'number', created_at: 'datetime', updated_at: 'datetime' },
  },
  {
    collection: 'foreign_key_registry',
    label: 'Foreign Key Registry',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', from_entity: 'string', from_field: 'string', to_entity: 'string', to_field: 'string', cascade_delete: 'boolean', enabled: 'boolean', created_at: 'datetime' },
    indexes: ['from_entity', 'to_entity'],
  },
  {
    collection: 'provider_adapter_registry',
    label: 'Provider Adapter Registry',
    primaryKey: 'id',
    core: false,
    fields: { id: 'string', provider: 'string', adapter_name: 'string', adapter_version: 'string', migration_engine: 'string', capabilities: 'json', active: 'boolean', config: 'json', created_at: 'datetime', updated_at: 'datetime' },
    indexes: ['active'],
  },
];

INFRA_TABLES.forEach((t) => EntityRegistry.register(t));

export const infraSchemas = INFRA_TABLES;
export default infraSchemas;
