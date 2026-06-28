export const CauseListTemplatesSchema = {
  collection: 'cause_list_templates',
  label: 'Cause List Templates',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    name: 'string',
    description: 'string',
    template_type: 'string',
    content: 'json',
    is_active: 'boolean',
    display_order: 'number',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['name'],
  defaults: { template_type: 'daily', is_active: true, display_order: 0, description: '' },
  indexes: ['name', 'template_type', 'is_active'],
  relations: [],
};

export default CauseListTemplatesSchema;
