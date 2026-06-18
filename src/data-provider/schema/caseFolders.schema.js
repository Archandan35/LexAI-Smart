// Universal schema — caseFolders (per-case document folder tree).
export const CaseFoldersSchema = {
  collection: 'caseFolders',
  label: 'Case Folders',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    caseId: 'string',
    name: 'string',
    parentId: 'string',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  required: ['caseId', 'name'],
  defaults: { parentId: null },
  relations: [{ field: 'caseId', references: 'cases', on: 'id' }],
  indexes: ['caseId', 'parentId'],
};

export default CaseFoldersSchema;
