export const CourtHierarchySchema = {
  collection: 'court_hierarchy',
  label: 'Court Hierarchy',
  primaryKey: 'id',
  core: false,
  fields: {
    id: 'string',
    name: 'string',
    level: 'number',
    parent_id: 'string',
    display_order: 'number',
    status: 'string',
    created_at: 'datetime',
    updated_at: 'datetime',
  },
  required: ['name'],
  defaults: { level: 1, parent_id: null, display_order: 0, status: 'Active' },
  relations: [{ field: 'parent_id', references: 'court_hierarchy', on: 'id' }],
  indexes: ['name', 'level', 'parent_id', 'status'],
};

export default CourtHierarchySchema;
