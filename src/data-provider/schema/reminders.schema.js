// Universal schema — reminders (per-case reminders).
export const RemindersSchema = {
  collection: 'reminders',
  label: 'Reminders',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    case_id: 'string',
    type: 'string',
    title: 'string',
    date: 'datetime',
    due_at: 'datetime',
    done: 'boolean',
    status: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['case_id'],
  defaults: { type: 'Hearing Date', done: false, status: 'pending' },
  relations: [{ field: 'case_id', references: 'cases', on: 'id' }],
  indexes: ['case_id', 'due_at', 'status'],
};

export default RemindersSchema;
