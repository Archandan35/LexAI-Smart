export const CaseTypesSchema = {
  collection: 'caseTypes',
  label: 'Case Types',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    name: 'string',
    short_code: 'string',
    display_order: 'number',
    status: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['name', 'short_code'],
  defaults: {
    display_order: 0,
    status: 'Active',
  },
  relations: [],
  indexes: ['short_code', 'status', 'display_order'],
};

export default CaseTypesSchema;
