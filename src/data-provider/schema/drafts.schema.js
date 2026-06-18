// Universal schema — drafts (generated legal documents, versioned).
export const DraftsSchema = {
  collection: 'drafts',
  label: 'Drafts',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    caseId: 'string',
    type: 'string',
    title: 'string',
    content: 'string',
    versions: 'array',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['title'],
  defaults: { versions: [] },
  relations: [{ field: 'caseId', references: 'cases', on: 'id' }],
  indexes: ['caseId', 'type'],
};

export default DraftsSchema;
