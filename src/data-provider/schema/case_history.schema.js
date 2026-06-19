// Universal schema — caseHistory (per-case stage/proceeding timeline).
export const CaseHistorySchema = {
  collection: 'case_history',
  label: 'Case History',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    case_id: 'string',
    date: 'datetime',
    stage: 'string',
    purpose: 'string',
    status: 'string',
    remarks: 'string',
    created_at: 'datetime',
  },
  required: ['case_id'],
  defaults: {},
  relations: [{ field: 'case_id', references: 'cases', on: 'id' }],
  indexes: ['case_id', 'date'],
};

export default CaseHistorySchema;
