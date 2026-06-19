// Universal schema — configHistory (masked configuration-change log).
export const ConfigHistorySchema = {
  collection: 'config_history',
  label: 'Config History',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    name: 'string',
    oldValue: 'string', // masked
    newValue: 'string', // masked
    changed_by: 'string',
    at: 'datetime',
  },
  required: ['name'],
  defaults: {},
  relations: [],
  indexes: ['name', 'at'],
};

export default ConfigHistorySchema;
