// Universal schema — reminders (per-case reminders).
export const RemindersSchema = {
  collection: 'reminders',
  label: 'Reminders',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    caseId: 'string',
    title: 'string',
    dueAt: 'datetime',
    status: 'string',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['caseId'],
  defaults: { status: 'pending' },
  relations: [{ field: 'caseId', references: 'cases', on: 'id' }],
  indexes: ['caseId', 'dueAt', 'status'],
};

export default RemindersSchema;
