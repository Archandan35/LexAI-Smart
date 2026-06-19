// Universal schema — notes.
export const NotesSchema = {
  collection: 'notes',
  label: 'Notes',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    case_id: 'string',
    title: 'string',
    body: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['case_id'],
  defaults: { body: '' },
  relations: [{ field: 'case_id', references: 'cases', on: 'id' }],
  indexes: ['case_id'],
};

export default NotesSchema;
