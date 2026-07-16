// Universal schema — task statuses (master data for the Tasks module).
export const TaskStatusesSchema = {
  collection: 'task_statuses',
  label: 'Task Statuses',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    name: 'string',
    short_code: 'string',
    description: 'string',
    color: 'string',
    status: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['name'],
  defaults: { description: '', color: '#6b7280', status: 'Active', short_code: '' },
  indexes: ['name', 'short_code', 'status'],
};

export default TaskStatusesSchema;
