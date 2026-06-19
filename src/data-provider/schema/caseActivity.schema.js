// Universal schema — caseActivity (per-case activity feed).
export const CaseActivitySchema = {
  collection: 'caseActivity',
  label: 'Case Activity',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    case_id: 'string',
    action: 'string',
    message: 'string',
    by: 'string',
    at: 'datetime',
  },
  required: ['case_id', 'action'],
  defaults: {},
  relations: [{ field: 'case_id', references: 'cases', on: 'id' }],
  indexes: ['case_id', 'at'],
};

export default CaseActivitySchema;
