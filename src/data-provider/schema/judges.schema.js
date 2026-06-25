export const JudgesSchema = {
  collection: 'judges',
  label: 'Judges',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    name: 'string',
    short_code: 'string',
    designation: 'string',
    court: 'string',
    status: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['name'],
  defaults: { status: 'Active' },
  relations: [],
  indexes: ['name', 'short_code', 'status'],
};

export default JudgesSchema;
