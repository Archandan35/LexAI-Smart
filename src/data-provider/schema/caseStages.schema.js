// Universal schema — caseStages (stage definitions / ordering).
export const CaseStagesSchema = {
  collection: 'caseStages',
  label: 'Case Stages',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    name: 'string',
    order: 'number',
    category: 'string',
    created_at: 'datetime',
  },
  required: ['name'],
  defaults: { order: 0 },
  relations: [],
  indexes: ['order'],
};

export default CaseStagesSchema;
