// Universal schema — documents (file metadata + extracted OCR text).
export const DocumentsSchema = {
  collection: 'documents',
  label: 'Documents',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    caseId: 'string',
    name: 'string',
    folder: 'string',
    mime: 'string',
    size: 'number',
    text: 'string',
    version: 'number',
    syncStatus: 'string',
    lastSyncAt: 'datetime',
    uploadedAt: 'datetime',
  },
  required: ['name'],
  defaults: { version: 1, syncStatus: 'local' },
  relations: [
    { field: 'caseId', references: 'cases', on: 'id' },
  ],
  indexes: ['caseId', 'folder', 'syncStatus'],
};

export default DocumentsSchema;
