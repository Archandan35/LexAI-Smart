// Universal schema — hearings.
export const HearingsSchema = {
  collection: 'hearings',
  label: 'Hearings',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    case_id: 'string',
    date: 'datetime',
    status: 'string',
    purpose: 'string',
    notes: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['case_id'],
  defaults: { status: 'Scheduled', notes: '' },
  relations: [{ field: 'case_id', references: 'cases', on: 'id' }],
  indexes: ['case_id', 'date', 'status'],
};

export default HearingsSchema;
