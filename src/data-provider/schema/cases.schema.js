// Universal schema — cases (core litigation entity).
export const CasesSchema = {
  collection: 'cases',
  label: 'Cases',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    caseNumber: 'string',
    title: 'string',
    court: 'string',
    stage: 'string',
    parties: 'object',
    description: 'string',
    nextHearing: 'datetime',
    status: 'string',
    tags: 'array',
    archived: 'boolean',
    watch: 'boolean',
    stageHistory: 'array',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['caseNumber'],
  defaults: {
    status: 'Active',
    tags: [],
    archived: false,
    watch: false,
    stageHistory: [],
  },
  relations: [],
  indexes: ['caseNumber', 'status', 'stage', 'archived'],
};

export default CasesSchema;
