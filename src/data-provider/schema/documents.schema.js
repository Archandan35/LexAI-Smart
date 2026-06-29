// Universal schema — documents (file metadata + extracted OCR text).
export const DocumentsSchema = {
  collection: 'documents',
  label: 'Documents',
  primaryKey: 'id',
  core: true,
  fields: {
    id: 'string',
    case_id: 'string',
    name: 'string',
    folder: 'string',
    folder_id: 'string',
    mime: 'string',
    size: 'number',
    ref: 'string',
    text: 'string',
    version: 'number',
    sync_status: 'string',
    sync_message: 'string',
    last_sync_at: 'datetime',
    uploaded_at: 'datetime',
  },
  required: ['name'],
  defaults: { version: 1, sync_status: 'local' },
  relations: [
    { field: 'case_id', references: 'cases', on: 'id' },
  ],
  indexes: ['case_id', 'folder', 'folder_id', 'sync_status'],
};

export default DocumentsSchema;
