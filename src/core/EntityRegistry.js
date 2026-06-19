// EntityRegistry — maps LexAI entity names ↔ provider table/collection names.
// Every entity in the application must be registered here. Pages, services,
// hooks, and logic code use ONLY LexAI entity names; the registry translates
// to provider-specific names at the adapter boundary.
//
// The registry is populated from the universal schema at startup. Providers
// may override table names via the ProviderMappingStore (e.g. "users" →
// "app_users" on a legacy MySQL schema).

const PG_TYPE_MAP = { string: 'text', number: 'numeric', boolean: 'boolean', datetime: 'timestamptz', array: 'jsonb', object: 'jsonb' };

let _entities = {};
let _mappings = {};

export const EntityRegistry = {
  // Register a schema as an entity. Called by schema/index.js on startup.
  register(schema) {
    const name = schema.collection;
    _entities[name] = {
      name,
      label: schema.label || name,
      primaryKey: schema.primaryKey || 'id',
      core: !!schema.core,
      fields: { ...(schema.fields || {}) },
      required: [...(schema.required || [])],
      defaults: { ...(schema.defaults || {}) },
      indexes: [...(schema.indexes || [])],
      relations: [...(schema.relations || [])],
    };
  },

  // Register many schemas at once.
  registerAll(schemas) {
    Object.values(schemas).forEach((s) => this.register(s));
  },

  // Set provider-specific table name mapping for an entity.
  setTableMapping(entityName, providerName) {
    _mappings[entityName] = providerName;
  },

  // Get the provider table/collection name for a LexAI entity name.
  providerTable(entityName) {
    return _mappings[entityName] || entityName;
  },

  // Get the LexAI entity name from a provider table name.
  lexaiEntity(providerTableName) {
    const entry = Object.entries(_mappings).find(([, v]) => v === providerTableName);
    return entry ? entry[0] : providerTableName;
  },

  // Get entity metadata.
  get(entityName) {
    return _entities[entityName] || null;
  },

  // List all registered entities.
  list() {
    return Object.values(_entities);
  },

  // Get primary key field name for an entity.
  primaryKey(entityName) {
    return _entities[entityName]?.primaryKey || 'id';
  },

  // Returns the PG type for a given schema type.
  pgType(schemaType) {
    return PG_TYPE_MAP[schemaType] || 'text';
  },

  // Get all field names for an entity.
  fields(entityName) {
    return _entities[entityName] ? Object.keys(_entities[entityName].fields) : [];
  },

  // Clear all registrations (for testing).
  reset() {
    _entities = {};
    _mappings = {};
  },
};

export default EntityRegistry;
