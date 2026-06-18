// Universal schema — settings. A provider-agnostic key/value store for
// application + module settings (e.g. backup retention/schedule), so settings
// no longer have to live in a provider-specific localStorage key.
export const SettingsSchema = {
  collection: 'settings',
  label: 'Settings',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    key: 'string', // e.g. "backup", "ui", "sync"
    value: 'object',
    updatedAt: 'datetime',
    updatedBy: 'string',
  },
  required: ['key'],
  defaults: { value: {} },
  relations: [],
  indexes: ['key'],
};

export default SettingsSchema;
