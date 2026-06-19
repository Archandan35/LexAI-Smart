// Universal schema — caseFolders (per-case document folder tree).
export const CaseFoldersSchema = {
  collection: 'caseFolders',
  label: 'Case Folders',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    case_id: 'string',
    name: 'string',
    kind: 'string',
    order: 'number',
    system: 'boolean',
    parent_id: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['case_id', 'name'],
  defaults: { parent_id: null, kind: 'document', order: 0, system: false },
  relations: [{ field: 'case_id', references: 'cases', on: 'id' }],
  indexes: ['case_id', 'parent_id', 'kind'],
};

export default CaseFoldersSchema;
