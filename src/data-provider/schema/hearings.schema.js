// Universal schema — hearings.
export const HearingsSchema = {
  collection: 'hearings',
  label: 'Hearings',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    caseId: 'string',
    date: 'datetime',
    status: 'string',
    purpose: 'string',
    notes: 'string',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['caseId'],
  defaults: { status: 'Scheduled', notes: '' },
  relations: [{ field: 'caseId', references: 'cases', on: 'id' }],
  indexes: ['caseId', 'date', 'status'],
};

export default HearingsSchema;
