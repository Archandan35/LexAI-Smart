export const HearingStatusesSchema = {
  collection: 'hearing_statuses',
  label: 'Hearing Statuses',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    name: 'string',
    display_order: 'number',
    color: 'string',
    status: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['name'],
  defaults: { display_order: 0, color: '#6b7280', status: 'Active' },
  relations: [],
  indexes: ['name', 'status', 'display_order'],
};

export default HearingStatusesSchema;
