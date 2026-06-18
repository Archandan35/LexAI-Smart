// Universal schema — schema_meta. One row tracking the installed schema version,
// the provider it was installed on, and an upgrade/rollback history. This is how
// the installer, health engine and version manager know the state of a backend.
export const SchemaMetaSchema = {
  collection: 'schema_meta',
  label: 'Schema Meta',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    version: 'number',
    provider: 'string',
    appVersion: 'string',
    installedAt: 'datetime',
    updatedAt: 'datetime',
    history: 'array', // [{ version, action: 'install'|'upgrade'|'rollback', at }]
  },
  required: ['version'],
  defaults: { history: [] },
  relations: [],
  indexes: ['provider'],
};

export default SchemaMetaSchema;
