// Universal schema — causeListTemplates (cause-list rendering definitions).
export const CauseListTemplatesSchema = {
  collection: 'cause_list_templates',
  label: 'Cause List Templates',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    name: 'string',
    isDefault: 'boolean',
    fields: 'array',
    historyFormat: 'string',
  },
  required: ['name'],
  defaults: { isDefault: false, fields: [] },
  relations: [],
  indexes: [],
};

export default CauseListTemplatesSchema;
