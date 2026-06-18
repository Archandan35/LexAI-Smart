// Universal schema — caseHistory (per-case stage/proceeding timeline).
export const CaseHistorySchema = {
  collection: 'caseHistory',
  label: 'Case History',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    caseId: 'string',
    date: 'datetime',
    stage: 'string',
    purpose: 'string',
    status: 'string',
    remarks: 'string',
    createdAt: 'datetime',
  },
  required: ['caseId'],
  defaults: {},
  relations: [{ field: 'caseId', references: 'cases', on: 'id' }],
  indexes: ['caseId', 'date'],
};

export default CaseHistorySchema;
