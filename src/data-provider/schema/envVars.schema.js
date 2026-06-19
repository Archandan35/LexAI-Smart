// Universal schema — envVars (managed environment-variable overrides).
export const EnvVarsSchema = {
  collection: 'envVars',
  label: 'Environment Variables',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    name: 'string',
    value: 'string',
    status: 'string',
    category: 'string',
    secret: 'boolean',
    persisted: 'boolean',
    updated_at: 'datetime',
    updated_by: 'string',
  },
  required: ['name'],
  defaults: { status: 'active', secret: false, persisted: true },
  relations: [],
  indexes: ['name', 'category'],
};

export default EnvVarsSchema;
