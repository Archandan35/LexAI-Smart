// Universal schema — judgments (local citation corpus; never fabricated).
export const JudgmentsSchema = {
  collection: 'judgments',
  label: 'Judgments',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    citation: 'string',
    court: 'string',
    date: 'datetime',
    keywords: 'array',
    acts: 'array',
    paragraphs: 'array',
    sourceUrl: 'string',
  },
  required: ['citation'],
  defaults: { keywords: [], acts: [], paragraphs: [] },
  relations: [],
  indexes: ['court'],
};

export default JudgmentsSchema;
