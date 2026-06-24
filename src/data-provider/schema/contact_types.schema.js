export const ContactTypesSchema = {
  collection: 'contact_types',
  label: 'Contact Types',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    name: 'string',
    display_order: 'number',
    status: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['name'],
  defaults: { display_order: 0, status: 'Active' },
  relations: [],
  indexes: ['name', 'status'],
};

export default ContactTypesSchema;
