// Universal schema — notes.
export const NotesSchema = {
  collection: 'notes',
  label: 'Notes',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    caseId: 'string',
    title: 'string',
    body: 'string',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['caseId'],
  defaults: { body: '' },
  relations: [{ field: 'caseId', references: 'cases', on: 'id' }],
  indexes: ['caseId'],
};

export default NotesSchema;
