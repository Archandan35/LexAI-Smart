// Universal schema — drafts (generated legal documents, versioned).
export const DraftsSchema = {
  collection: 'drafts',
  label: 'Drafts',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    case_id: 'string',
    type: 'string',
    title: 'string',
    content: 'string',
    versions: 'array',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['title'],
  defaults: { versions: [] },
  relations: [{ field: 'case_id', references: 'cases', on: 'id' }],
  indexes: ['case_id', 'type'],
};

export default DraftsSchema;
