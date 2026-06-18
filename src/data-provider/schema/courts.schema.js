export const CourtsSchema = {
  collection: 'courts',
  label: 'Courts',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    name: 'string',
    display_order: 'number',
    status: 'string',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['name'],
  defaults: {
    display_order: 0,
    status: 'Active',
  },
  relations: [],
  indexes: ['status', 'display_order'],
};

export default CourtsSchema;
