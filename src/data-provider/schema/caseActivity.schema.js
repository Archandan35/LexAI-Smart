// Universal schema — caseActivity (per-case activity feed).
export const CaseActivitySchema = {
  collection: 'caseActivity',
  label: 'Case Activity',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    caseId: 'string',
    action: 'string',
    message: 'string',
    by: 'string',
    at: 'datetime',
  },
  required: ['caseId', 'action'],
  defaults: {},
  relations: [{ field: 'caseId', references: 'cases', on: 'id' }],
  indexes: ['caseId', 'at'],
};

export default CaseActivitySchema;
