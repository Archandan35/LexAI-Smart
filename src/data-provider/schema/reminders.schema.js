// Universal schema — reminders (per-case reminders).
export const RemindersSchema = {
  collection: 'reminders',
  label: 'Reminders',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    caseId: 'string',
    type: 'string',
    title: 'string',
    date: 'datetime',
    dueAt: 'datetime',
    done: 'boolean',
    status: 'string',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['caseId'],
  defaults: { type: 'Hearing Date', done: false, status: 'pending' },
  relations: [{ field: 'caseId', references: 'cases', on: 'id' }],
  indexes: ['caseId', 'dueAt', 'status'],
};

export default RemindersSchema;
