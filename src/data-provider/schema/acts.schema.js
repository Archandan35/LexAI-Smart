export const ActsSchema = {
  collection: 'acts',
  label: 'Acts Library',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    title: 'string',
    short_code: 'string',
    act_type: 'string',
    jurisdiction: 'string',
    year: 'number',
    sections_count: 'number',
    amendments_count: 'number',
    color: 'string',
    description: 'text',
    last_updated: 'string',
    status: 'string',
    display_order: 'number',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['title'],
  defaults: { status: 'Active', sections_count: 0, amendments_count: 0, description: '', color: '#6b7280', display_order: 0 },
  relations: [],
  indexes: ['title', 'short_code', 'act_type', 'jurisdiction', 'status'],
};

export default ActsSchema;
