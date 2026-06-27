// Universal schema — hearings.
export const HearingsSchema = {
  collection: 'hearings',
  label: 'Order Sheets',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    case_id: 'string',
    date: 'datetime',
    status: 'string',
    purpose: 'string',
    next_hearing_date: 'datetime',
    posted_for: 'string',
    notes: 'string',
    summary: 'string',
    judge: 'string',
    doc_ref: 'string',
    doc_name: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['case_id'],
  defaults: { status: 'Scheduled', notes: '', posted_for: '' },
  relations: [{ field: 'case_id', references: 'cases', on: 'id' }],
  indexes: ['case_id', 'date', 'status', 'next_hearing_date'],
};

export default HearingsSchema;
